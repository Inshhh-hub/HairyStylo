/* =====================================================================
   HairyStylo — analysis.js
   ---------------------------------------------------------------------
   Turns the 478 face points from MediaPipe (the deep-learning model)
   into human answers:

     A. Geometry   → measurements (face length, forehead/cheek/jaw width)
     B. Face shape → a small classifier compares your measurements with
                     the typical measurements of 7 face shapes and gives
                     a probability for each (nearest-prototype + softmax)
     C. Skin tone  → colour science: sample skin pixels, convert to the
                     CIELAB colour space, correct the lighting using the
                     whites of your eyes, then compute the ITA° angle,
                     the Monk scale level and your undertone
     D. Quality    → checks you are facing the camera, centred, close
                     enough and well lit before we measure anything
   ===================================================================== */
window.HS = window.HS || {};

HS.Analysis = (function () {
  'use strict';

  /* -------------------------------------------------------------
     MediaPipe landmark numbers we use (out of 478)
     ------------------------------------------------------------- */
  const IDX = {
    top: 10, chin: 152,
    cheekA: 234, cheekB: 454,          // widest part of the face (cheekbones)
    foreA: 54, foreB: 284,             // upper forehead
    templeA: 21, templeB: 251,         // temples
    jawA: 172, jawB: 397,              // jaw corners (gonial angle)
    lowJawA: 136, lowJawB: 365,        // lower jaw (used for "squareness")
    chinA: 176, chinB: 400,            // either side of the chin
    noseTip: 1,
    silhouette: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
      152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
    rightEye: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
    leftEye: [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
    rightBrowUp: [70, 63, 105, 66, 107], rightBrowLow: [46, 53, 52, 65, 55],
    leftBrowUp: [300, 293, 334, 296, 336], leftBrowLow: [276, 283, 282, 295, 285],
    lipsOuter: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
    lipsInnerUp: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308],
    // skin sampling spots
    skinUpper: [50, 280, 101, 330, 116, 345, 123, 352],   // cheeks (above any beard)
    skinForehead: [151, 108, 337, 9],
    skinLower: [205, 425, 199]                         // lower cheeks / chin (skipped for men: beard)
  };

  /* -------------------------------------------------------------
     B. FACE-SHAPE MODEL PARAMETERS
     "mean"/"std" = typical values of each ratio measured on the
     MediaPipe mesh for an average face, and how much they vary.
     Each prototype says how a shape differs from average, in units
     of standard deviations (z-scores):
        [length, forehead, jaw, jaw-squareness, chin-width]
     Tweak these to calibrate the model (see HOW_IT_WORKS.md).
     ------------------------------------------------------------- */
  const MODEL = {
    mean: { len: 1.15, fore: 0.83, jaw: 0.80, taper: 0.85, chin: 0.29 },
    std: { len: 0.07, fore: 0.04, jaw: 0.045, taper: 0.05, chin: 0.04 },
    weights: [1.25, 1.0, 1.0, 0.6, 0.6],
    temperature: 1.6,
    prototypes: {
      oval: [0.3, 0.3, -0.2, -0.3, 0.0],
      round: [-1.6, 0.0, 0.2, -0.2, 0.3],
      square: [-1.2, 0.3, 1.4, 1.2, 1.0],
      oblong: [1.8, 0.2, 0.6, 0.6, 0.3],
      heart: [0.0, 1.2, -1.2, -0.8, -1.2],
      diamond: [0.6, -1.3, -1.0, -0.6, -1.0],
      triangle: [0.0, -1.3, 1.2, 0.6, 0.6]
    }
  };

  /* ================= small maths helpers ================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const median = arr => {
    const s = arr.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!s.length) return NaN;
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const deg = r => r * 180 / Math.PI;

  /* landmark → 3-D pixel point. MediaPipe gives x,y in 0..1 and z on
     roughly the same scale as x, so multiply z by the image width. */
  function P(lm, i, W, H) {
    const p = lm[i];
    return [p.x * W, p.y * H, (p.z || 0) * W];
  }
  function dist3(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

  /* ================= A. GEOMETRY ================= */
  function extractFeatures(lm, W, H) {
    const g = i => P(lm, i, W, H);
    const Wc = dist3(g(IDX.cheekA), g(IDX.cheekB));
    const L = dist3(g(IDX.top), g(IDX.chin));
    const Wf = (dist3(g(IDX.foreA), g(IDX.foreB)) + dist3(g(IDX.templeA), g(IDX.templeB))) / 2;
    const Wj = dist3(g(IDX.jawA), g(IDX.jawB));
    const Wl = dist3(g(IDX.lowJawA), g(IDX.lowJawB));
    const Wch = dist3(g(IDX.chinA), g(IDX.chinB));
    return {
      lenRatio: L / Wc,       // how long the face is compared with its width
      foreRatio: Wf / Wc,     // forehead width ÷ cheekbone width
      jawRatio: Wj / Wc,      // jaw width ÷ cheekbone width
      jawTaper: Wl / Wj,      // how quickly the jaw narrows (square jaws stay wide)
      chinRatio: Wch / Wc,    // chin width ÷ cheekbone width (small = pointed)
      widthPx: Wc
    };
  }

  /* combine many video frames: the median ignores odd frames */
  function medianFeatures(list) {
    const keys = ['lenRatio', 'foreRatio', 'jawRatio', 'jawTaper', 'chinRatio', 'widthPx'];
    const out = {};
    keys.forEach(k => { out[k] = median(list.map(f => f[k])); });
    return out;
  }

  /* ================= B. FACE-SHAPE CLASSIFIER =================
     1. turn each ratio into a z-score (how unusual it is)
     2. measure the weighted distance to every shape prototype
     3. softmax: closer prototype → higher probability            */
  function toZ(f) {
    const m = MODEL.mean, s = MODEL.std;
    return [
      (f.lenRatio - m.len) / s.len,
      (f.foreRatio - m.fore) / s.fore,
      (f.jawRatio - m.jaw) / s.jaw,
      (f.jawTaper - m.taper) / s.taper,
      (f.chinRatio - m.chin) / s.chin
    ].map(v => clamp(v, -4, 4));
  }
  function classifyFaceShape(f) {
    const z = toZ(f);
    const logits = {};
    Object.entries(MODEL.prototypes).forEach(([shape, proto]) => {
      let d2 = 0;
      for (let i = 0; i < proto.length; i++) d2 += MODEL.weights[i] * (z[i] - proto[i]) ** 2;
      logits[shape] = -d2 / (2 * MODEL.temperature);
    });
    const maxL = Math.max(...Object.values(logits));
    let sum = 0;
    const probs = {};
    Object.entries(logits).forEach(([k, v]) => { probs[k] = Math.exp(v - maxL); sum += probs[k]; });
    Object.keys(probs).forEach(k => { probs[k] /= sum; });
    const ranked = Object.entries(probs).sort((a, b) => b[1] - a[1]);
    return { shape: ranked[0][0], probs, ranked, z };
  }

  /* ================= D. QUALITY / POSE CHECKS ================= */
  function checkFrame(lm, W, H) {
    const g = i => P(lm, i, W, H);
    const a = g(IDX.cheekA), b = g(IDX.cheekB), t = g(IDX.top), c = g(IDX.chin);
    const roll = deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
    const yaw = deg(Math.atan2(b[2] - a[2], b[0] - a[0]));
    const pitch = deg(Math.atan2(t[2] - c[2], c[1] - t[1]));
    const widthFrac = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.min(W, H);
    const cx = (t[0] + c[0]) / 2 / W, cy = (t[1] + c[1]) / 2 / H;
    const issues = [];
    let distance = 'ok';
    if (widthFrac < 0.28) { distance = 'far'; issues.push('Move a little closer'); }
    else if (widthFrac > 0.62) { distance = 'close'; issues.push('Move back a little'); }
    const centered = Math.abs(cx - 0.5) < 0.2 && Math.abs(cy - 0.5) < 0.22;
    if (!centered) issues.push('Centre your face in the oval');
    const straight = Math.abs(yaw) < 12 && Math.abs(pitch) < 15 && Math.abs(roll) < 9;
    if (Math.abs(roll) >= 9) issues.push('Keep your head level');
    else if (Math.abs(yaw) >= 12) issues.push('Look straight at the camera');
    else if (Math.abs(pitch) >= 15) issues.push(pitch > 0 ? 'Lower your chin slightly' : 'Lift your chin slightly');
    return {
      ok: distance === 'ok' && centered && straight,
      distance, centered, straight, yaw, pitch, roll, widthFrac, issues,
      poseScore: Math.abs(yaw) + Math.abs(pitch) + Math.abs(roll)
    };
  }

  /* ================= C. COLOUR SCIENCE =================
     sRGB (what cameras give) → linear light → XYZ → CIELAB.
     CIELAB is designed to match human vision: L* = lightness,
     a* = green↔red, b* = blue↔yellow.                           */
  function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linearToSrgb(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return clamp(Math.round(c * 255), 0, 255); }
  const XN = 0.95047, YN = 1.0, ZN = 1.08883; // D65 white point
  function fLab(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
  function rgbToLab(r, g, b) {
    const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
    const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    const fx = fLab(X / XN), fy = fLab(Y / YN), fz = fLab(Z / ZN);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function labToRgb(L, a, b) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const inv = t => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
    const X = inv(fx) * XN, Y = inv(fy) * YN, Z = inv(fz) * ZN;
    const R = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    const G = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    const B = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
  }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }

  /* collect Lab pixels inside a small circle */
  function sampleDisc(img, cx, cy, r) {
    const out = [];
    const W = img.width, H = img.height, d = img.data;
    const step = Math.max(1, Math.floor(r / 6));
    for (let y = Math.floor(cy - r); y <= cy + r; y += step) {
      for (let x = Math.floor(cx - r); x <= cx + r; x += step) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        const k = (y * W + x) * 4;
        out.push(rgbToLab(d[k], d[k + 1], d[k + 2]));
      }
    }
    return out;
  }
  /* robust average: drop the darkest/brightest pixels (shadows, shine) */
  function robustLab(pixels) {
    if (pixels.length < 6) return null;
    const s = pixels.slice().sort((p, q) => p[0] - q[0]);
    const lo = Math.floor(s.length * 0.15), hi = Math.ceil(s.length * 0.85);
    const mid = s.slice(lo, hi);
    return { L: median(mid.map(p => p[0])), a: median(mid.map(p => p[1])), b: median(mid.map(p => p[2])), n: mid.length };
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /* Eye whites are close to neutral white, so whatever colour cast
     they show is (mostly) the colour of the room lighting.          */
  function sampleSclera(img, lm) {
    if (lm.length < 478) return null;
    const W = img.width, H = img.height;
    const px = i => [lm[i].x * W, lm[i].y * H];
    const eyes = [[IDX.rightEye, 468, [469, 471]], [IDX.leftEye, 473, [474, 476]]];
    const all = [];
    eyes.forEach(([ring, irisC, irisEdge]) => {
      const poly = ring.map(px);
      const c = px(irisC);
      const ir = Math.hypot(px(irisEdge[0])[0] - px(irisEdge[1])[0], px(irisEdge[0])[1] - px(irisEdge[1])[1]) / 2;
      const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
        for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          if (!pointInPoly(x, y, poly)) continue;
          if (Math.hypot(x - c[0], y - c[1]) < ir * 1.2) continue;
          const k = (y * W + x) * 4, d = img.data;
          all.push(rgbToLab(d[k], d[k + 1], d[k + 2]));
        }
      }
    });
    if (all.length < 15) return null;
    all.sort((p, q) => q[0] - p[0]);                 // brightest first
    const top = all.slice(0, Math.max(8, Math.floor(all.length * 0.35)));
    const L = median(top.map(p => p[0]));
    if (L < 45) return null;
    return { L, a: median(top.map(p => p[1])), b: median(top.map(p => p[2])) };
  }

  /* analyse the skin in ONE frame */
  function analyzeSkinFrame(img, lm, gender) {
    const W = img.width, H = img.height;
    const px = i => [lm[i].x * W, lm[i].y * H];
    const a = px(IDX.cheekA), b = px(IDX.cheekB);
    const faceW = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const r = Math.max(3, faceW * 0.045);
    let spots = IDX.skinUpper.concat(IDX.skinForehead);
    if (gender !== 'male') spots = spots.concat(IDX.skinLower);
    const regions = [];
    spots.forEach(i => {
      const p = px(i);
      const v = robustLab(sampleDisc(img, p[0], p[1], r));
      if (v) regions.push({ i, ...v });
    });
    // left vs right cheek brightness → uneven lighting check
    const lr = [[50, 280], [101, 330]].map(([x, y]) => {
      const A = regions.find(q => q.i === x), B = regions.find(q => q.i === y);
      return A && B ? Math.abs(A.L - B.L) : 0;
    });
    return { regions, sclera: sampleSclera(img, lm), sideDiff: Math.max(...lr) };
  }

  /* combine skin samples from many frames → final skin result */
  function aggregateSkin(frames) {
    const regs = [];
    frames.forEach(f => f.regions.forEach(r => regs.push(r)));
    if (!regs.length) return null;
    const medL = median(regs.map(r => r.L));
    // throw away regions that are clearly not skin (hair over forehead, deep shadow)
    const good = regs.filter(r => Math.abs(r.L - medL) < 12);
    const use = good.length >= 3 ? good : regs;
    let L = median(use.map(r => r.L)), A = median(use.map(r => r.a)), B = median(use.map(r => r.b));
    const rawRgb = labToRgb(L, A, B);

    // white-balance correction using the eye whites
    const sc = frames.map(f => f.sclera).filter(Boolean);
    let wb = null;
    if (sc.length >= 2) {
      const sa = median(sc.map(s => s.a)), sb = median(sc.map(s => s.b));
      const castA = clamp(sa - 1.5, -12, 12), castB = clamp(sb - 5, -12, 12);
      A -= 0.6 * castA; B -= 0.6 * castB;
      wb = { castA, castB };
    }
    const sideDiff = median(frames.map(f => f.sideDiff));
    return classifySkin({ L, a: A, b: B }, { rawRgb, wb, sideDiff });
  }

  function classifySkin(lab, extra = {}) {
    const { L, a, b } = lab;
    // ITA° — Individual Typology Angle: standard dermatology measure of skin lightness
    const ita = deg(Math.atan2(L - 50, Math.max(b, 0.5)));
    const tone = HS.SKIN_TONES.find(t => ita > t.minITA) || HS.SKIN_TONES[HS.SKIN_TONES.length - 1];
    // nearest Monk Skin Tone swatch, compared on the same ITA° scale
    // (so the Monk level always agrees with the tone name)
    let monk = 1, best = Infinity;
    HS.MONK_SCALE.forEach((hex, k) => {
      const m = rgbToLab(...hexToRgb(hex));
      const mIta = deg(Math.atan2(m[0] - 50, Math.max(m[2], 0.5)));
      const d = Math.abs(mIta - ita);
      if (d < best) { best = d; monk = k + 1; }
    });
    // undertone from the hue angle: more yellow → warm, more pink/red → cool
    const hue = deg(Math.atan2(b, a));
    let undertone = 'neutral';
    if (hue >= 60) undertone = 'warm';
    else if (hue <= 50) undertone = 'cool';
    const olive = a < 7 && b >= 12;
    const rgb = labToRgb(L, a, b);
    const warnings = [];
    if (L < 28) warnings.push('Lighting looked quite dark — skin tone may read deeper than it is.');
    if (L > 86) warnings.push('Lighting looked very bright — skin tone may read lighter than it is.');
    if (extra.sideDiff > 14) warnings.push('One side of your face was brighter than the other (side lighting).');
    const chroma = Math.hypot(a, b);
    if (hue < 20 || hue > 85 || chroma < 5 || chroma > 45) warnings.push('The colours in your camera image looked unusual (coloured light or a strong camera filter) — skin tone may be off. Try daylight, or adjust the undertone below.');
    return {
      lab: { L, a, b }, rgb, hex: rgbToHex(...rgb), rawHex: extra.rawRgb ? rgbToHex(...extra.rawRgb) : rgbToHex(...rgb),
      ita, tone, monk, hue, undertone, olive, wb: extra.wb || null, warnings
    };
  }

  /* ================= SYNTHETIC FACE (demo + shape icons) =================
     Builds a face outline + features from the 5 ratios, in "face
     units" (half the cheekbone width = 1). Used for the sample-face
     demo and for drawing the little face-shape icons.              */
  const BASE_RIGHT = { // x,y for the right half of an average face
    10: [0, -1.0], 338: [0.25, -0.97], 297: [0.47, -0.90], 332: [0.64, -0.79], 284: [0.77, -0.63],
    251: [0.89, -0.45], 389: [0.95, -0.28], 356: [0.99, -0.13], 454: [1.0, 0], 323: [0.99, 0.18],
    361: [0.955, 0.38], 288: [0.895, 0.56], 397: [0.80, 0.72], 365: [0.68, 0.88], 379: [0.55, 1.02],
    378: [0.42, 1.13], 400: [0.29, 1.21], 377: [0.15, 1.27], 152: [0, 1.30]
  };
  const MIRROR = { 338: 109, 297: 67, 332: 103, 284: 54, 251: 21, 389: 162, 356: 127, 454: 234, 323: 93, 361: 132, 288: 58, 397: 172, 365: 136, 379: 150, 378: 149, 400: 176, 377: 148 };

  function syntheticFace(ratios = {}) {
    const m = MODEL.mean;
    const r = Object.assign({ lenRatio: m.len, foreRatio: m.fore, jawRatio: m.jaw, jawTaper: m.taper, chinRatio: m.chin }, ratios);
    const L = 2 * r.lenRatio, topY = -0.435 * L, chinY = 0.565 * L;
    const ys = y => (y < 0 ? y * (-topY / 1.0) : y * (chinY / 1.3));
    const pts = {};
    const right = {};
    Object.entries(BASE_RIGHT).forEach(([k, v]) => { right[k] = [v[0], v[1]]; });
    const df = r.foreRatio - m.fore;
    [338, 297, 332].forEach(k => { right[k][0] *= r.foreRatio / m.fore; });
    right[284][0] += df; right[251][0] += df; right[389][0] += df * 0.5;
    right[397][0] = r.jawRatio;
    right[288][0] = (right[361][0] + r.jawRatio) / 2 + 0.0175;
    const x365 = r.jawTaper * r.jawRatio;
    right[365][0] = x365;
    right[400][0] = r.chinRatio;
    right[379][0] = x365 - (x365 - r.chinRatio) * 0.33;
    right[378][0] = x365 - (x365 - r.chinRatio) * 0.67;
    right[377][0] = r.chinRatio * 0.52;
    Object.entries(right).forEach(([k, v]) => {
      pts[k] = [v[0], ys(v[1])];
      if (MIRROR[k]) pts[MIRROR[k]] = [-v[0], ys(v[1])];
    });
    const put = (i, x, y) => { pts[i] = [x, ys(y)]; };
    // eyes
    const eye = (ids, cx, outerSign) => {
      const outer = cx + 0.15 * outerSign, inner = cx - 0.15 * outerSign, cy = -0.2;
      for (let k = 0; k <= 8; k++) { const t = k / 8; put(ids[k], outer + (inner - outer) * t, cy - 0.055 * Math.sin(Math.PI * t)); }
      for (let k = 1; k <= 7; k++) { const t = k / 8; put(ids[8 + k], inner + (outer - inner) * t, cy + 0.04 * Math.sin(Math.PI * t)); }
    };
    eye(IDX.rightEye, -0.37, -1); eye(IDX.leftEye, 0.37, 1);
    [[468, -0.37], [473, 0.37]].forEach(([c, x]) => {
      put(c, x, -0.2);
      [[1, 0.055, 0], [2, 0, -0.055], [3, -0.055, 0], [4, 0, 0.055]].forEach(([o, dx, dy]) => put(c + o, x + dx, -0.2 + dy));
    });
    // brows
    const brow = (up, low, sign) => {
      const xs = [0.56, 0.47, 0.38, 0.27, 0.17], yu = [-0.38, -0.45, -0.47, -0.45, -0.41];
      up.forEach((id, k) => put(id, sign * xs[k], yu[k]));
      low.forEach((id, k) => put(id, sign * xs[k], yu[k] + 0.05));
    };
    brow(IDX.rightBrowUp, IDX.rightBrowLow, -1); brow(IDX.leftBrowUp, IDX.leftBrowLow, 1);
    // nose
    [[168, 0, -0.3], [6, 0, -0.18], [197, 0, -0.02], [195, 0, 0.1], [5, 0, 0.2], [4, 0, 0.28], [1, 0, 0.3], [2, 0, 0.37],
    [98, -0.12, 0.33], [327, 0.12, 0.33], [97, -0.06, 0.37], [326, 0.06, 0.37]].forEach(a => put(...a));
    // lips
    const lo = [[-0.22, .62], [-.18, .585], [-.13, .565], [-.08, .55], [-.035, .545], [0, .55], [.035, .545], [.08, .55], [.13, .565], [.18, .585],
    [.22, .62], [.18, .66], [.13, .695], [.08, .715], [.04, .725], [0, .73], [-.04, .725], [-.08, .715], [-.13, .695], [-.18, .66]];
    IDX.lipsOuter.forEach((id, k) => put(id, lo[k][0], lo[k][1]));
    const li = [[-.2, .62], [-.15, .615], [-.1, .61], [-.05, .607], [-.02, .606], [0, .607], [.02, .606], [.05, .607], [.1, .61], [.15, .615], [.2, .62]];
    IDX.lipsInnerUp.forEach((id, k) => put(id, li[k][0], li[k][1]));
    put(14, 0, 0.64); put(17, 0, 0.73);
    // skin sample spots
    [[50, -.45, .12], [280, .45, .12], [101, -.35, .08], [330, .35, .08], [116, -.6, 0], [345, .6, 0], [123, -.72, .05], [352, .72, .05],
    [205, -.38, .35], [425, .38, .35], [151, 0, -.72], [108, -.18, -.7], [337, .18, -.7], [9, 0, -.45], [199, 0, 1.05]].forEach(a => put(...a));
    return pts;
  }
  /* convert synthetic face units → MediaPipe-style normalised landmarks */
  function syntheticLandmarks(ratios, size = 1000, scale = 190) {
    const pts = syntheticFace(ratios);
    const lm = [];
    for (let i = 0; i < 478; i++) {
      const p = pts[i];
      lm.push(p ? { x: (size / 2 + p[0] * scale) / size, y: (size / 2 + p[1] * scale) / size, z: 0 } : { x: 0.5, y: 0.5, z: 0 });
    }
    return lm;
  }
  /* what ratios each prototype corresponds to (for icons + tests) */
  function prototypeRatios(shape) {
    const p = MODEL.prototypes[shape], m = MODEL.mean, s = MODEL.std;
    return {
      lenRatio: m.len + p[0] * s.len, foreRatio: m.fore + p[1] * s.fore, jawRatio: m.jaw + p[2] * s.jaw,
      jawTaper: m.taper + p[3] * s.taper, chinRatio: m.chin + p[4] * s.chin
    };
  }

  return {
    IDX, MODEL, extractFeatures, medianFeatures, classifyFaceShape, checkFrame,
    analyzeSkinFrame, aggregateSkin, classifySkin, sampleDisc, robustLab, rgbToLab, labToRgb, hexToRgb, rgbToHex,
    syntheticFace, syntheticLandmarks, prototypeRatios, median, clamp
  };
})();
