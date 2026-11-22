/* =====================================================================
   HairyStylo — tryon.js   (realistic AI try-on, runs on the server)
   ---------------------------------------------------------------------
   The face analysis runs on your device, but drawing REAL-looking hair
   needs a generative image model. This file sends your scan photo plus
   a very precise haircut description to /api/tryon (a Vercel function).
   The function calls a free image-editing model (Cloudflare Workers AI,
   FLUX.2 klein) and, if configured, Gemini as a fallback, then returns
   an edited, photo-realistic picture of YOU with the new haircut.

   • No API key is ever typed into or stored in the browser: the keys
     live in Vercel's environment variables.
   • The photo is sent only when a realistic look is created.
   ===================================================================== */
window.HS = window.HS || {};

HS.TryOn = (function () {
  'use strict';
  const LABELS = { cloudflare: 'Cloudflare FLUX.2', gemini: 'Google Gemini' };

  class TryOnError extends Error {
    constructor(kind, message) { super(message); this.kind = kind; }
  }

  /** Asks the server what is set up. Resolves true / false, or null if unknown (e.g. no server). */
  let readyPromise = null;
  function ready() {
    if (!readyPromise) {
      readyPromise = fetch('/api/health', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(j => (j && typeof j.tryonReady === 'boolean') ? j.tryonReady : null)
        .catch(() => null);
    }
    return readyPromise;
  }

  /* ---------- the instruction we send with your photo ---------- */
  function buildPrompt(o) {
    const st = o.style, person = o.gender === 'female' ? 'woman' : 'man';
    const lines = [
      `Edit this photo of a ${person}. Give them a new, professionally cut and freshly styled haircut. Change ONLY the hair${o.gender === 'male' ? ' and facial hair' : ''}.`,
      ``,
      `NEW HAIRCUT: "${st.name}". ${st.desc}`,
      `Exact cut (as a barber would do it): ${st.ask}`,
      `Clipper / length guide: ${st.guards}.`,
      `The new haircut fully replaces the current hair: remove any of the existing hair that does not belong to this cut (length, volume, flyaways), so the shape on the head matches the haircut description above exactly.`,
      `Hair texture: their natural hair is ${o.hairType}; keep that natural texture wherever this cut allows it.`,
      o.colour.natural ? `Hair colour: keep their current natural hair colour.` : `Hair colour: ${o.colour.name} — a natural, salon-quality colour with realistic dimension.`
    ];
    if (o.gender === 'male') {
      if (!o.beard || o.beard === 'none') lines.push(`Facial hair: clean-shaven, smooth natural skin where the beard and moustache were.`);
      else { const b = HS.BEARDS[o.beard]; lines.push(`Facial hair: ${b.name} — ${b.desc} (${b.barber})`); }
    }
    lines.push(
      ``,
      `KEEP EVERYTHING ELSE IDENTICAL: the same person and identity, same face shape, eyes, eyebrows, nose, lips, ears, skin tone and skin texture, same expression, same head position and angle, same clothes, same background, same lighting and colour balance, same framing and camera distance. Do not beautify, slim or retouch the face.`,
      `Make it look like a real, unedited photograph taken with the same camera: individual hair strands, a natural hairline and edges, realistic scalp where hair is short, natural shadows and highlights. Not a wig, not a painting, not an illustration, no text or watermarks.`
    );
    if (o.forApp) lines.unshift('I have attached a photo of myself. Please edit it as described below and reply with the edited photo.', '');
    return lines.join('\n');
  }

  const jpeg = (canvas, q) => canvas.toDataURL('image/jpeg', q);
  const round16 = n => Math.max(16, Math.round(n / 16) * 16);

  /** a small copy (long side 480) for the free model, which only accepts small input photos */
  function smallCopy(canvas) {
    const long = 480, s = long / Math.max(canvas.width, canvas.height);
    const w = round16(canvas.width * s), h = round16(canvas.height * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(canvas, 0, 0, w, h);
    return { url: jpeg(c, 0.92), w, h };
  }

  /**
   * beforeCanvas: the cropped photo shown as "Before"
   * o: { style, colour, beard, gender, hairType }
   * resolves with { img: HTMLImageElement, model, prompt }
   */
  async function generate(beforeCanvas, o) {
    const prompt = buildPrompt(o);
    const sm = smallCopy(beforeCanvas);
    let res, body = null;
    try {
      res = await fetch('/api/tryon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: jpeg(beforeCanvas, 0.9), small: sm.url, w: sm.w, h: sm.h, prompt, gender: o.gender })
      });
    } catch (e) {
      throw new TryOnError('network', 'Could not reach the server. Check that this device has internet and try again.');
    }
    try { body = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || !body || !body.ok || !body.image) {
      const msg = (body && body.message) || (res.status === 413 ? 'The photo was too large. Please rescan.' : res.status === 404 ? 'The try-on server is not part of this deployment.' : 'Try-on failed (' + res.status + '). Please try again.');
      const code = body && body.code;
      const kind = code === 'TRYON_UNAVAILABLE' ? 'unavailable' : code === 'TRYON_LIMIT' ? 'limit' : code === 'RATE' ? 'rate' : 'api';
      throw new TryOnError(kind, msg);
    }
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new TryOnError('api', 'The server returned a picture we could not open. Please try again.'));
      i.src = body.image;
    });
    return { img, model: LABELS[body.provider] || 'AI image model', prompt };
  }

  return { ready, generate, buildPrompt, TryOnError };
})();
