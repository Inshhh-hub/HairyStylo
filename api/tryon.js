const { getKey, callGemini, parseImage, rateLimited, send, readBody, apiMessage } = require('./_gemini');

// Realistic try-on on the user's own photo. Two providers, tried in this order (TRYON_PROVIDER=auto):
//  1. Cloudflare Workers AI, FLUX.2 [klein] 4B image editing: has a free daily allowance, no card needed.
//  2. Gemini image editing: Google lists no free tier for image-output models, so this needs billing.
// Force one with TRYON_PROVIDER=cloudflare or TRYON_PROVIDER=gemini.
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b';
const GEMINI_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

function cfConfig() {
  return { account: (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim(), token: (process.env.CLOUDFLARE_API_TOKEN || '').trim() };
}

function prompt(style, look, gender) {
  const who = gender === 'female' ? 'woman' : gender === 'male' ? 'man' : 'person';
  return `Edit this real photograph of a ${who}. Change ONLY the hairstyle to: ${style}. ${look || ''}
Keep EXACTLY the same face, identity, facial features, skin tone, skin texture, expression, head angle, clothing, background and lighting. The result must be a natural, photorealistic photograph: real individual hair strands, natural hairline blending into the forehead, correct shadows and hair colour matching the person's current hair colour. Do NOT apply cartoon, illustration, 3D, filter, wig-like or animated effects. Do not change anything except the hair.`;
}

function dim(n, fallback) {
  n = parseInt(n, 10);
  if (!(n >= 256 && n <= 1920)) return fallback;
  return Math.round(n / 16) * 16; // FLUX wants multiples of 16
}

function mimeFromB64(b64) {
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

async function cloudflareEdit(small, p, w, h, timeoutMs) {
  const { account, token } = cfConfig();
  const form = new FormData();
  form.append('prompt', p);
  form.append('width', String(w));
  form.append('height', String(h));
  form.append('input_image_0', new Blob([Buffer.from(small.data, 'base64')], { type: small.mime }), 'photo.jpg');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${CF_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: ctl.signal,
    });
    const ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
    if (r.ok && /^image\//i.test(ct)) {
      const buf = Buffer.from(await r.arrayBuffer());
      return { ok: true, status: 200, image: `data:${ct.split(';')[0]};base64,${buf.toString('base64')}` };
    }
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch (e) { /* not JSON */ }
    let b64 = j && ((j.result && j.result.image) || j.image);
    if (r.ok && typeof b64 === 'string' && b64.length > 100) {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(b64);
      if (m) return { ok: true, status: 200, image: b64 };
      return { ok: true, status: 200, image: `data:${mimeFromB64(b64)};base64,${b64}` };
    }
    const msg = (j && Array.isArray(j.errors) && j.errors[0] && j.errors[0].message) || apiMessage(j, text.slice(0, 200));
    return { ok: false, status: r.ok ? 502 : r.status, msg };
  } catch (e) {
    return { ok: false, status: e.name === 'AbortError' ? 504 : 502, msg: String(e && e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST.' });
  if (rateLimited(req, 10, 10 * 60 * 1000)) {
    return send(res, 429, { ok: false, code: 'RATE', message: 'Too many try-ons in a short time. Please wait a few minutes.' });
  }
  const body = readBody(req);
  const img = body && parseImage(body.image);
  if (!img) return send(res, 400, { ok: false, code: 'BAD_IMAGE', message: 'Photo missing or too large. Please retake it.' });
  const small = parseImage(body.small) || img;
  const style = String(body.style || '').slice(0, 80).replace(/[\r\n]+/g, ' ').trim();
  const look = String(body.look || '').slice(0, 300).replace(/[\r\n]+/g, ' ').trim();
  if (!style) return send(res, 400, { ok: false, code: 'BAD_STYLE', message: 'No hairstyle chosen.' });
  const gender = ['male', 'female', 'any'].includes(body.gender) ? body.gender : 'any';
  const p = prompt(style, look, gender);

  const cf = cfConfig();
  const hasCF = !!(cf.account && cf.token);
  const hasGemini = !!getKey();
  const mode = String(process.env.TRYON_PROVIDER || 'auto').toLowerCase();
  const order = mode === 'gemini' ? ['gemini'] : mode === 'cloudflare' ? ['cloudflare'] : [hasCF ? 'cloudflare' : null, hasGemini ? 'gemini' : null].filter(Boolean);

  if (!order.length || (order.length === 1 && order[0] === 'cloudflare' && !hasCF)) {
    return send(res, 402, { ok: false, code: 'TRYON_UNAVAILABLE', message: 'Photo try-on is not set up yet. Add the free Cloudflare keys (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN) in Vercel and redeploy. Your face analysis and barber instructions still work.' });
  }

  const started = Date.now();
  let cfLimit = false, last = null;

  for (const provider of order) {
    const remaining = 56000 - (Date.now() - started);
    if (remaining < 8000) break;

    if (provider === 'cloudflare') {
      const w = dim(body.w, 480), h = dim(body.h, 640);
      const r = await cloudflareEdit(small, p, w, h, remaining);
      if (r.ok) return send(res, 200, { ok: true, provider: 'cloudflare', image: r.image });
      last = { status: r.status, msg: r.msg };
      if (r.status === 429) cfLimit = true;
      continue;
    }

    for (const model of [process.env.GEMINI_IMAGE_MODEL, ...GEMINI_IMAGE_MODELS].filter(Boolean).filter((m, i, a) => a.indexOf(m) === i)) {
      const rem = 56000 - (Date.now() - started);
      if (rem < 8000) break;
      const r = await callGemini(model, {
        contents: [{ role: 'user', parts: [{ text: p }, { inlineData: { mimeType: img.mime, data: img.data } }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }, getKey(), rem);
      if (r.ok) {
        const parts = r.json && r.json.candidates && r.json.candidates[0] && r.json.candidates[0].content && r.json.candidates[0].content.parts || [];
        for (const part of parts) {
          const d = part.inlineData || part.inline_data;
          if (d && d.data) return send(res, 200, { ok: true, provider: 'gemini', image: `data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}` });
        }
        last = { status: 422, msg: 'Gemini did not return an image.' };
        continue;
      }
      last = { status: r.status, msg: apiMessage(r.json, r.text), gemini: true };
    }
  }

  if (cfLimit) {
    return send(res, 429, { ok: false, code: 'TRYON_LIMIT', message: 'Today\'s free try-on allowance is used up. It resets daily, so please try again tomorrow.' });
  }
  if (last && (last.status === 401 || last.status === 403)) {
    return send(res, 401, { ok: false, code: 'BAD_KEY', message: 'The try-on provider rejected its key. Check CLOUDFLARE_API_TOKEN (needs Workers AI permission) and CLOUDFLARE_ACCOUNT_ID in Vercel.' });
  }
  if (last && last.gemini && (last.status === 429 || last.status === 404)) {
    return send(res, 402, { ok: false, code: 'TRYON_UNAVAILABLE', message: 'Photo try-on is not available: Gemini image editing needs billing, and the free Cloudflare keys are not set. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Vercel (free), then redeploy.' });
  }
  return send(res, 502, { ok: false, code: 'UPSTREAM', message: 'Try-on failed. ' + (last ? String(last.msg).slice(0, 200) : '') });
};
