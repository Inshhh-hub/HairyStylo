const { getKey, callGemini, parseImage, rateLimited, send, readBody, apiMessage } = require('./_gemini');

// Realistic try-on on the user's own photo. Providers, tried in this order (TRYON_PROVIDER=auto):
//  1. Cloudflare Workers AI, FLUX.2 [klein] 4B image editing: free daily allowance, no card needed.
//  2. Gemini image editing: Google lists no free tier for image-output models, so it needs billing.
// Force one with TRYON_PROVIDER=cloudflare or TRYON_PROVIDER=gemini.
const CF_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b';
const GEMINI_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

function cfConfig() {
  return { account: (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim(), token: (process.env.CLOUDFLARE_API_TOKEN || '').trim() };
}

// Safety rules appended to whatever haircut description the page sends.
const RULES = `\n\nIMPORTANT: Keep EXACTLY the same person: same face, identity, facial features, skin tone, expression, head angle, clothing, background and lighting. Change only the hair (and facial hair if asked). The result must be a natural, photorealistic photograph with real individual hair strands and a natural hairline. Do NOT make it a cartoon, illustration, 3D render, filter, wig or animated effect.`;

function round16(n) { return Math.round(n / 16) * 16; }
function clampDim(n) { return Math.min(1920, Math.max(256, round16(n))); }

// Output size: same aspect as the small input, long side TRYON_OUT_LONG (default 672 = about 2 billing tiles).
function outputSize(w, h) {
  w = parseInt(w, 10); h = parseInt(h, 10);
  if (!(w >= 64 && w <= 1920 && h >= 64 && h <= 1920)) return { w: 512, h: 672 };
  const long = Math.min(1920, Math.max(256, parseInt(process.env.TRYON_OUT_LONG, 10) || 672));
  const s = long / Math.max(w, h);
  return { w: clampDim(w * s), h: clampDim(h * s) };
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
    const b64 = j && ((j.result && j.result.image) || j.image);
    if (r.ok && typeof b64 === 'string' && b64.length > 100) {
      if (/^data:image\/[a-z+]+;base64,/i.test(b64)) return { ok: true, status: 200, image: b64 };
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
  if (rateLimited(req, 12, 10 * 60 * 1000)) {
    return send(res, 429, { ok: false, code: 'RATE', message: 'Too many try-ons in a short time. Please wait a few minutes.' });
  }
  const body = readBody(req);
  const img = body && parseImage(body.image);
  if (!img) return send(res, 400, { ok: false, code: 'BAD_IMAGE', message: 'Photo missing or too large. Please rescan.' });
  const small = parseImage(body.small) || img;
  const userPrompt = String(body.prompt || '').replace(/\u0000/g, '').trim().slice(0, 2500);
  if (userPrompt.length < 10) return send(res, 400, { ok: false, code: 'BAD_PROMPT', message: 'No haircut description was sent.' });
  const p = userPrompt + RULES;

  const cf = cfConfig();
  const hasCF = !!(cf.account && cf.token);
  const hasGemini = !!getKey();
  const mode = String(process.env.TRYON_PROVIDER || 'auto').toLowerCase();
  const order = mode === 'gemini' ? ['gemini'] : mode === 'cloudflare' ? ['cloudflare'] : [hasCF ? 'cloudflare' : null, hasGemini ? 'gemini' : null].filter(Boolean);

  if (!order.length || (order.length === 1 && order[0] === 'cloudflare' && !hasCF) || (order.length === 1 && order[0] === 'gemini' && !hasGemini)) {
    return send(res, 402, { ok: false, code: 'TRYON_UNAVAILABLE', message: 'Realistic try-on is not set up yet. Add the free Cloudflare keys (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN) in Vercel and redeploy. Your face analysis and barber card still work.' });
  }

  const started = Date.now();
  let cfLimit = false, last = null;

  for (const provider of order) {
    const remaining = 56000 - (Date.now() - started);
    if (remaining < 8000) break;

    if (provider === 'cloudflare') {
      const o = outputSize(body.w, body.h);
      const r = await cloudflareEdit(small, p, o.w, o.h, remaining);
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
  if (last && (last.status === 401 || last.status === 403) && !last.gemini) {
    return send(res, 401, { ok: false, code: 'BAD_KEY', message: 'The try-on service rejected its key. Check CLOUDFLARE_API_TOKEN (needs Workers AI permission) and CLOUDFLARE_ACCOUNT_ID in Vercel.' });
  }
  if (last && last.gemini && (last.status === 429 || last.status === 404 || last.status === 403)) {
    return send(res, 402, { ok: false, code: 'TRYON_UNAVAILABLE', message: 'Realistic try-on is not available: Gemini image editing needs billing, and the free Cloudflare keys are not set. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Vercel (free), then redeploy.' });
  }
  return send(res, 502, { ok: false, code: 'UPSTREAM', message: 'Try-on failed. ' + (last ? String(last.msg).slice(0, 200) : '') });
};
