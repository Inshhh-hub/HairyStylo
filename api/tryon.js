const { getKey, callGemini, parseImage, rateLimited, send, readBody, apiMessage } = require('./_gemini');

// Realistic photo try-on = Gemini image editing ("Nano Banana"). As of Nov 2026 Google lists NO free tier
// for image-output models, so this needs a key whose Google project has billing enabled.
// Change the model with GEMINI_IMAGE_MODEL in Vercel if you want a different one.
const DEFAULT_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];

function buildPrompt(style, look, gender) {
  const who = gender === 'female' ? 'woman' : gender === 'male' ? 'man' : 'person';
  return `Edit this real photograph of a ${who}. Change ONLY the hairstyle to: ${style}. ${look || ''}
Keep EXACTLY the same face, identity, facial features, skin tone, skin texture, expression, head angle, clothing, background and lighting. The result must be a natural, photorealistic photograph: real individual hair strands, natural hairline blending into the forehead, correct shadows and hair colour matching the person's current hair colour. Do NOT apply cartoon, illustration, 3D, filter, wig-like or animated effects. Do not change anything except the hair.`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST.' });
  const key = getKey();
  if (!key) return send(res, 500, { ok: false, code: 'NO_KEY', message: 'The Gemini API key is not set yet (GEMINI_API_KEY in Vercel).' });
  if (rateLimited(req, 10, 10 * 60 * 1000)) {
    return send(res, 429, { ok: false, code: 'RATE', message: 'Too many try-ons in a short time. Please wait a few minutes.' });
  }
  const body = readBody(req);
  const img = body && parseImage(body.image);
  if (!img) return send(res, 400, { ok: false, code: 'BAD_IMAGE', message: 'Photo missing or too large. Please retake it.' });
  const style = String(body.style || '').slice(0, 80).replace(/[\r\n]+/g, ' ').trim();
  const look = String(body.look || '').slice(0, 300).replace(/[\r\n]+/g, ' ').trim();
  if (!style) return send(res, 400, { ok: false, code: 'BAD_STYLE', message: 'No hairstyle chosen.' });
  const gender = ['male', 'female', 'any'].includes(body.gender) ? body.gender : 'any';

  const models = [process.env.GEMINI_IMAGE_MODEL, ...DEFAULT_IMAGE_MODELS].filter(Boolean).filter((m, i, a) => a.indexOf(m) === i);
  const started = Date.now();
  let last = null;

  for (const model of models) {
    const remaining = 56000 - (Date.now() - started);
    if (remaining < 8000) break;
    const r = await callGemini(model, {
      contents: [{ role: 'user', parts: [{ text: buildPrompt(style, look, gender) }, { inlineData: { mimeType: img.mime, data: img.data } }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }, key, remaining);

    if (r.ok) {
      const parts = r.json && r.json.candidates && r.json.candidates[0] && r.json.candidates[0].content && r.json.candidates[0].content.parts || [];
      for (const p of parts) {
        const d = p.inlineData || p.inline_data;
        if (d && d.data) {
          const mime = d.mimeType || d.mime_type || 'image/png';
          return send(res, 200, { ok: true, model, image: `data:${mime};base64,${d.data}` });
        }
      }
      last = { status: 422, msg: 'Gemini did not return an image (the photo may have been blocked by its safety filter). Try a clearer, front-facing photo.' };
      continue;
    }
    last = { status: r.status, msg: apiMessage(r.json, r.text) };
    if (r.status === 401 || (r.status === 400 && /API key/i.test(last.msg))) {
      return send(res, 401, { ok: false, code: 'BAD_KEY', message: 'Gemini rejected the API key.' });
    }
  }

  // 429 with "limit: 0", or 403/404 on the image model, means this key has no image-model access (free tier).
  if (last && (last.status === 429 || last.status === 403 || last.status === 404)) {
    return send(res, 402, {
      ok: false,
      code: 'TRYON_NEEDS_BILLING',
      message: 'Realistic photo try-on is not available on this API key. Google does not offer image-editing models on the free Gemini tier. Your face analysis and barber instructions still work. To enable try-on, turn on billing for the key\'s Google project (a few cents per image) or set GEMINI_IMAGE_MODEL to a model your key can use.',
    });
  }
  return send(res, 502, { ok: false, code: 'UPSTREAM', message: 'Try-on failed. ' + (last ? last.msg : '') });
};
