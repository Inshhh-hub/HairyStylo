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
  const TEXTURE = {
    curly: 'Hair texture: their natural hair is CURLY (defined spiral curls, type 3). Show real, springy natural curls with a visible curl pattern and natural frizz-free clumps. Do NOT straighten, relax or loosen the curls and do not turn them into waves.',
    coily: 'Hair texture: their natural hair is COILY / kinky (tight coils, type 4A–4C). Show authentic tight natural coils, with the natural shrinkage and volume of coily hair; protective styles (twists, braids, locs, cornrows) should look neat with clean parts. Do NOT straighten, relax or loosen the texture.',
    wavy: 'Hair texture: their natural hair is WAVY (loose S-shaped waves); keep the waves natural.',
    straight: 'Hair texture: their natural hair is straight; keep it naturally straight and smooth.'
  };
  /* how each beard should LOOK in a real photo (density, edges, direction, gaps) */
  const BEARD_LOOK = {
    stubble: 'A real 3–5 day stubble: thousands of tiny individual hairs (about 2–3 mm), denser around the chin, moustache area and jaw, thinner on the cheeks, skin still visible between the hairs. The cheek edge fades out softly and irregularly, with no sharp line; the neck below the jawline is clean.',
    boxed: 'A short, well-groomed beard about 6–15 mm long: individual hairs visible and growing in their natural direction (down on the cheeks, forward and down on the chin, down and out on the moustache). Slightly denser at the chin and jaw, softer and a little thinner on the upper cheeks. A neat natural cheek line, a clean neckline about two fingers above the Adam\'s apple, and the moustache trimmed just above the lip with the lip line visible.',
    full: 'A full natural beard about 12–25 mm long with a soft, rounded shape at the chin: dense but not solid, with visible individual hairs, slight natural irregularities, a few longer strands, and gentle colour variation (lighter and slightly reddish or greyer tones are fine). Hairs grow in natural directions: down on the cheeks and neck, curving forward under the chin. Soft, fading cheek line, clean neckline above the Adam\'s apple, and the moustache blended into the beard with a natural overhang over the lip.',
    goatee: 'A real extended goatee: a moustache joined to a chin beard about 6–12 mm long, with the cheeks and jaw sides clean-shaven (a light natural shadow of regrowth on the shaved skin, no hairs). Individual hairs visible, denser at the chin and the corners of the mouth, with a natural, slightly irregular outline rather than a drawn line.',
    circle: 'A real circle beard: a rounded moustache connected around the mouth to a chin beard about 6–10 mm long, with the cheeks and the sides of the jaw clean-shaven (a light natural shadow of regrowth on the shaved skin). Individual hairs visible, growing in natural directions, with a softly rounded, slightly irregular outline.'
  };
  const BEARD_REAL = 'It must look like a real beard in an unedited photo, never painted on or airbrushed: individual hair strands, natural density variation with a few thinner spots, realistic shadows on the skin, following the jaw and chin. Beard colour = the person\'s natural facial-hair colour (not any dyed hair colour). Keep lips, mouth, skin texture and expression unchanged.';
  const BEARD_TEX = {
    curly: 'Beard texture: their natural beard hair is wavy-to-curly, so the hairs have a slight natural curl and some body.',
    coily: 'Beard texture: their natural beard hair is tightly curled / coily, so the hairs are short, crisp and coiled, close to the skin, with realistic natural texture and an even, defined edge.',
    wavy: 'Beard texture: slightly wavy natural beard hair.',
    straight: 'Beard texture: straight to slightly wavy natural beard hair.'
  };
  const LENGTH = {
    short: 'LENGTH: a short cut — about 2–6 cm on top, with the sides tapered or faded shorter.',
    medium: 'LENGTH: a MEDIUM-length cut — clearly longer than a short cut but NOT long: about 7–12 cm of hair on top that falls forward over the forehead (fringe to the eyebrows) and the sides end around the ears. If the current hair is shorter, make it visibly longer and fuller, but stay within this length: it must never reach below the ears at the sides.',
    long: 'LENGTH: a LONG cut for a man, kept at CHEEKBONE-TO-JAW length: the hair on the sides and back reaches about the cheekbones down to the jawline and covers the ears (about 12–18 cm on top), clearly longer than the photo if the current hair is short — but it must NEVER go below the jawline or chin: no shoulder-length, no chest-length, no very long hair.',
    shortWomen: 'LENGTH: a SHORT cut for a woman: the hair ends at the JAWLINE at the longest (anything from a pixie to a jaw-length bob). It must never go below the jaw.',
    mediumWomen: 'LENGTH: a MEDIUM cut for a woman: the hair ends BETWEEN THE NECK AND THE COLLARBONE — below the jawline and above the collarbone (like a long bob / lob). It must not reach the collarbone and must not be above the jaw.',
    longWomen: 'LENGTH: a LONG cut for a woman: the hair reaches the COLLARBONE and stops there — clearly longer than a medium cut, but NEVER past the collarbone: no chest-length, no mid-back, no waist-length hair.'
  };
  const TEXTURED = 'TEXTURE: the hair on top must look clearly TEXTURED and lived-in: separated, choppy, piece-y strands (point-cut ends) with visible movement, layers and volume, a matte natural finish. Not flat, not neatly combed, not a smooth uniform bowl shape, no slicked-down look.';
  function buildPrompt(o) {
    const st = o.style, person = o.gender === 'female' ? 'woman' : 'man';
    const lines = [
      `Edit this photo of a ${person}. Give them a new, professionally cut and freshly styled haircut. Change ONLY the hair${o.gender === 'male' ? ' and facial hair' : ''}.`,
      ``,
      `NEW HAIRCUT: "${st.name}". ${st.desc}`,
      `Exact cut (as a barber would do it): ${st.ask}`,
      `Clipper / length guide: ${st.guards}.`,
      (o.gender === 'female' ? LENGTH[st.length + 'Women'] : LENGTH[st.length]) || '',
      /textur|messy|choppy|shag|mullet|wolf|crop|fringe|quiff|waves/i.test(st.name) || (st.tags || []).includes('soft-texture') ? TEXTURED : '',
      `The new haircut fully replaces the current hair: remove any of the existing hair that does not belong to this cut (length, volume, flyaways), so the shape on the head matches the haircut description above exactly.`,
      TEXTURE[o.hairType] || `Hair texture: their natural hair is ${o.hairType}; keep that natural texture wherever this cut allows it.`,
      o.colour.natural ? `Hair colour: keep their current natural hair colour.` : `Hair colour: ${o.colour.name} — a natural, salon-quality colour with realistic dimension.`
    ];
    if (o.angle === 'left' || o.angle === 'right') lines.splice(4, 0, `ANGLE: in this photo the person has turned their head to the ${o.angle} (about 35 degrees). Show the haircut as seen from this angle: the side of the head, temple, ear area, sideburn and the fade / taper of the cut must be clearly visible and match the described cut. Keep the head turned exactly as it is.`);
    if (o.gender === 'male') {
      if (!o.beard || o.beard === 'none') lines.push(`Facial hair: clean-shaven, smooth natural skin where the beard and moustache were.`);
      else {
        const b = HS.BEARDS[o.beard];
        lines.push(`Facial hair: ${b.name} — ${b.desc} (${b.barber})`);
        lines.push(`BEARD REALISM: ${BEARD_LOOK[o.beard] || ''} ${BEARD_REAL} ${BEARD_TEX[o.hairType] || ''}`.replace(/\s+/g, ' ').trim());
      }
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
