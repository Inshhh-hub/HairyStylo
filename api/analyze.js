const { getKey, callGemini, parseImage, rateLimited, send, readBody, apiMessage } = require('./_gemini');

// Free-tier Gemini models that accept images and return text. Tried in order; first that works wins.
// Override the first choice with GEMINI_TEXT_MODEL in Vercel if Google renames models.
const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'];

function buildPrompt(gender) {
  const g = gender === 'female' ? 'a woman' : gender === 'male' ? 'a man' : 'a person (any gender)';
  return `You are an expert professional hairstylist and barber. Look carefully at the photo of ${g}.

Return ONLY a JSON object (no markdown, no commentary) with exactly this shape:
{
  "face_found": true or false,
  "photo_issue": "empty string if the photo is fine, otherwise one short sentence on how to retake it (e.g. face too dark, hair covered by a hat, face too far away)",
  "face_shape": one of "oval","round","square","heart","oblong","diamond",
  "face_shape_reason": "one or two plain sentences pointing at what you see (forehead vs jaw vs cheekbones, length vs width)",
  "skin_tone": { "label": "e.g. Fair, Light, Medium, Olive, Tan, Brown, Deep", "undertone": "warm, cool or neutral", "hex": "approximate #RRGGBB of the cheek skin" },
  "hair": { "type": "straight, wavy, curly or coily", "density": "thin, medium or thick", "hairline": "short note, e.g. receding at temples, straight, widow's peak", "current_length": "short note" },
  "recommendations": [
    exactly 4 items, best match first, each:
    {
      "name": "haircut name a barber/salon would recognise",
      "why": "1-2 sentences: why it suits THIS face shape, hair type and hairline",
      "look": "one sentence describing the finished look so an image model could draw it (length, sides, top, parting, texture)",
      "maintenance": "Low, Medium or High",
      "barber": {
        "sides": "plain instruction, include clipper guard numbers or scissor length when relevant",
        "top": "plain instruction with length in cm/inches",
        "back_and_neckline": "plain instruction",
        "finish": "texturising / blow-dry / styling product advice"
      }
    }
  ],
  "avoid": ["2 or 3 short things to avoid for this face shape"],
  "color_tip": "one short sentence on hair colour that flatters this skin tone"
}

Rules: be honest and specific to the photo. If no human face is clearly visible, set face_found to false, explain in photo_issue and return empty recommendations. For a woman include cuts, layers, fringes and lengths; for a man include fades, tapers, crops and lengths; for any gender mix both and avoid stereotypes. Keep every string short and practical.`;
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, message: 'Use POST.' });
  const key = getKey();
  if (!key) {
    return send(res, 500, { ok: false, code: 'NO_KEY', message: 'The Gemini API key is not set yet. In Vercel: Project > Settings > Environment Variables > add GEMINI_API_KEY, then redeploy.' });
  }
  if (rateLimited(req, 20, 10 * 60 * 1000)) {
    return send(res, 429, { ok: false, code: 'RATE', message: 'Too many scans in a short time. Please wait a few minutes.' });
  }
  const body = readBody(req);
  const img = body && parseImage(body.image);
  if (!img) return send(res, 400, { ok: false, code: 'BAD_IMAGE', message: 'Photo missing or too large. Please retake it.' });
  const gender = ['male', 'female', 'any'].includes(body.gender) ? body.gender : 'any';

  const models = [process.env.GEMINI_TEXT_MODEL, ...DEFAULT_MODELS].filter(Boolean).filter((m, i, a) => a.indexOf(m) === i);
  const started = Date.now();
  let last = null;

  for (const model of models) {
    const remaining = 55000 - (Date.now() - started);
    if (remaining < 6000) break;
    const r = await callGemini(model, {
      contents: [{ role: 'user', parts: [{ text: buildPrompt(gender) }, { inlineData: { mimeType: img.mime, data: img.data } }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }, key, Math.min(25000, remaining));

    if (r.ok) {
      const parts = r.json && r.json.candidates && r.json.candidates[0] && r.json.candidates[0].content && r.json.candidates[0].content.parts || [];
      const text = parts.map((p) => p.text || '').join('');
      const data = extractJson(text);
      if (data && (data.face_found === false || (Array.isArray(data.recommendations) && data.recommendations.length))) {
        return send(res, 200, { ok: true, model, result: data });
      }
      last = { status: 502, msg: 'Gemini returned an unreadable answer.' };
      continue; // try next model
    }
    last = { status: r.status, msg: apiMessage(r.json, r.text) };
    // A bad/missing key will fail on every model, so stop early.
    if (r.status === 401 || r.status === 403 || (r.status === 400 && /API key/i.test(last.msg))) {
      return send(res, 401, { ok: false, code: 'BAD_KEY', message: 'Gemini rejected the API key. Create a new free key at aistudio.google.com/apikey and update GEMINI_API_KEY in Vercel.' });
    }
  }

  if (last && last.status === 429) {
    return send(res, 429, { ok: false, code: 'QUOTA', message: 'The free Gemini quota is used up for now. Try again in a minute (free keys have per-minute and per-day limits).' });
  }
  return send(res, 502, { ok: false, code: 'UPSTREAM', message: 'Gemini could not analyse the photo right now. ' + (last ? last.msg : '') });
};
