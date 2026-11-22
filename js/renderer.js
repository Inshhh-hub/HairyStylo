/* =====================================================================
   HairyStylo — renderer.js
   ---------------------------------------------------------------------
   Draws the "after" preview. Every hairstyle is described by a few
   numbers in data.js (render: {top, vol, sides, fringe, len, …}).
   This file turns those numbers into shapes, positioned using YOUR
   face landmarks, so the hair fits your head:

   FACE FRAME — we build a coordinate system on your face:
       origin  = midpoint between your cheekbones (landmarks 234 & 454)
       x axis  = along the cheekbones,  y axis = down the face
       1 unit  = half your cheekbone width
   Because the hair is drawn in these units, the same drawing code
   fits any face size, tilt or position — on the avatar or your photo.
   ===================================================================== */
window.HS = window.HS || {};

HS.Renderer = (function () {
  'use strict';
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const gauss = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));

  /* ---------------- colour helpers ---------------- */
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(hex, toHex, t) {
    const a = hexRgb(hex), b = hexRgb(toHex);
    return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join('');
  }
  function rgba(hex, al) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${al})`; }

  /* deterministic random numbers so drawings don't flicker */
  function rng(seedStr) {
    let s = 0;
    for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) | 0;
    return function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function smoothNoise(seed) {
    const r = rng(seed), v = Array.from({ length: 64 }, r);
    return x => { const i = Math.floor(x), f = x - i, a = v[((i % 64) + 64) % 64], b = v[(((i + 1) % 64) + 64) % 64]; return lerp(a, b, f * f * (3 - 2 * f)) - 0.5; };
  }

  /* smooth curve through points (Catmull-Rom → Bézier) */
  function curveThrough(path, pts) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
  }
  function polyPath(pts, smooth) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    if (smooth) curveThrough(p, pts.concat([pts[0]]));
    else pts.slice(1).forEach(q => p.lineTo(q[0], q[1]));
    p.closePath();
    return p;
  }

  /* =================== FACE MODEL =================== */
  const RING_A = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152];
  const RING_B = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152];

  function makeFrame(a, b) {
    if (a[0] > b[0]) [a, b] = [b, a];
    const O = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ex = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], ey = [-ex[1], ex[0]];
    const s = len / 2;
    return {
      O, ex, ey, s,
      toF: p => [((p[0] - O[0]) * ex[0] + (p[1] - O[1]) * ex[1]) / s, ((p[0] - O[0]) * ey[0] + (p[1] - O[1]) * ey[1]) / s],
      matrix: [s * ex[0], s * ex[1], s * ey[0], s * ey[1], O[0], O[1]]  // face units → image pixels
    };
  }

  /* lm: MediaPipe landmarks (0..1). W,H: image size. mirror: selfie view */
  function modelFromLandmarks(lm, W, H, mirror) {
    const px = i => [(mirror ? 1 - lm[i].x : lm[i].x) * W, lm[i].y * H];
    const frame = makeFrame(px(234), px(454));
    const pts = {};
    for (let i = 0; i < lm.length; i++) pts[i] = frame.toF(px(i));
    return buildModel(pts, frame);
  }
  function modelFromSynthetic(face) {
    const pts = {};
    Object.entries(face).forEach(([k, v]) => { pts[k] = [v[0], v[1]]; });
    return buildModel(pts, null);
  }

  function buildModel(pts, frame) {
    const IDX = HS.Analysis.IDX;
    const aRight = pts[454][0] > 0;
    const right = (aRight ? RING_A : RING_B).map(i => pts[i]);
    const left = (aRight ? RING_B : RING_A).map(i => pts[i]);
    const absAvg = (i, j) => [(Math.abs(pts[i][0]) + Math.abs(pts[j][0])) / 2, (pts[i][1] + pts[j][1]) / 2];
    const m = {
      frame, pts, right, left,
      sil: right.concat(left.slice(1, -1).reverse()),
      top: pts[10], chin: pts[152],
      temple: absAvg(21, 251), fore: absAvg(54, 284), earTop: absAvg(127, 356),
      cheek: absAvg(234, 454), jaw: absAvg(172, 397), lowJaw: absAvg(136, 365),
      browY: (pts[105][1] + pts[334][1]) / 2,
      eyes: [IDX.rightEye.map(i => pts[i]), IDX.leftEye.map(i => pts[i])],
      brows: [IDX.rightBrowUp.map(i => pts[i]).concat(IDX.rightBrowLow.map(i => pts[i]).reverse()),
      IDX.leftBrowUp.map(i => pts[i]).concat(IDX.leftBrowLow.map(i => pts[i]).reverse())],
      lips: IDX.lipsOuter.map(i => pts[i]),
      lipsInner: IDX.lipsInnerUp.map(i => pts[i]),
      noseBase: [98, 97, 2, 326, 327].map(i => pts[i]),
      noseBridge: [6, 197, 195, 5, 4].map(i => pts[i]),
      mouth: (() => { const a = pts[61], b = pts[291]; const [L, R] = a[0] < b[0] ? [a, b] : [b, a]; return { L, R, top: pts[0], bottom: pts[17], sub: pts[2] }; })()
    };
    m.iris = [[468, 469, 471], [473, 474, 476]].map(([c, e1, e2]) => pts[c] && pts[e1] && pts[e2]
      ? { c: pts[c], r: Math.hypot(pts[e1][0] - pts[e2][0], pts[e1][1] - pts[e2][1]) / 2 } : null);
    m.faceLen = m.chin[1] - m.top[1];
    return m;
  }

  /* x of the face outline at height y (side = +1 right, -1 left) */
  function edgeX(m, y, side) {
    const pts = side > 0 ? m.right : m.left;
    if (y <= pts[0][1]) return pts[0][0];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (y >= a[1] && y <= b[1]) { const t = (y - a[1]) / ((b[1] - a[1]) || 1e-6); return lerp(a[0], b[0], t); }
    }
    return pts[pts.length - 1][0];
  }
  const edgeAbs = (m, y) => (Math.abs(edgeX(m, y, 1)) + Math.abs(edgeX(m, y, -1))) / 2;

  /* =================== HAIR GEOMETRY =================== */
  function hairGeometry(m, st, tex, seed) {
    const k = m.faceLen / 2.3;
    const topY = m.top[1];
    const hlY = topY - 0.24 * k;                 // front hairline
    const skullTop = topY - 0.80 * k;            // top of the skull
    const tem = m.temple;
    const rx = Math.max(m.cheek[0], tem[0]) * 1.05;
    const cy = tem[1] + 0.05;
    const ry = cy - skullTop;
    const earTopY = m.earTop[1];
    const browY = m.browY;
    const heavy = st.part === 'side' ? 1 : 0;    // hair sweeps to the right
    const S = { fade: 0.018, buzz: 0.022, short: 0.06, medium: 0.11, long: 0.08, full: 0.2 }[st.sides] ?? 0.06;
    const V = Math.max(st.vol, S);
    const noise = smoothNoise(seed);

    function th(t) {
      const s = Math.sin(t);
      let b;
      switch (st.top) {
        case 'buzz': return S;
        case 'flat': b = S + (V - S) * Math.pow(s, 0.45); break;
        case 'pomp': b = S + (V - S) * Math.pow(s, 1.1) + V * 0.22 * gauss(t, PI / 2 + 0.15, 0.5); break;
        case 'quiff': b = S + (V * 0.55 - S) * s + V * 0.55 * gauss(t, PI / 2 + 0.32, 0.38); break;
        case 'fauxhawk': b = S + 0.1 * s + V * gauss(t, PI / 2, 0.3); break;
        case 'spiky': { const saw = Math.abs(((t * 12 / PI) % 2) - 1); b = S + (V * 0.75 - S) * s + (s > 0.45 ? 0.08 * (V / 0.42) * saw : 0); break; }
        case 'messy': b = S + (V - S) * Math.pow(s, 1.1) + (0.035 * noise(t * 6) + 0.025 * noise(t * 15 + 7)) * s; break;
        case 'curly': b = S + (V - S) * Math.pow(s, 0.9) + 0.045 * Math.abs(Math.sin(t * 16)); break;
        case 'twists': b = S + (V - S) * Math.pow(s, 0.8) + 0.055 * Math.pow(Math.abs(Math.sin(t * 22)), 0.6) * s; break;
        case 'afro':
          b = V * (0.72 + 0.28 * s) + 0.022 * Math.abs(Math.sin(t * 30));
          if (st.sides === 'short') b *= 0.25 + 0.75 * Math.pow(s, 0.8);
          break;
        case 'slick': b = S + (V - S) * Math.pow(s, 1.25); break;
        default: b = S + (V - S) * Math.pow(s, 1.1);
      }
      if (heavy) b *= 1 + 0.3 * heavy * Math.cos(t) * s;
      return b;
    }
    const skull = t => [rx * Math.cos(t), cy - ry * Math.sin(t)];
    const outerAt = t => {
      const p = skull(t);
      const n = [Math.cos(t) * ry, -Math.sin(t) * rx], l = Math.hypot(n[0], n[1]);
      const d = th(t);
      return [p[0] + n[0] / l * d, p[1] + n[1] / l * d];
    };
    const N = 120;
    const outer = [];
    for (let i = 0; i <= N; i++) outer.push(outerAt(PI - PI * i / N));

    const TR = [tem[0] * 0.97, tem[1] - 0.04], TL = [-TR[0], TR[1]];
    const sideCfg = {
      fade: { sb: cy, x: rx + S }, buzz: { sb: cy, x: rx + S },
      short: { sb: earTopY + 0.1, x: rx + 0.05 }, medium: { sb: earTopY + 0.3, x: rx + 0.1 },
      long: { sb: earTopY, x: rx + 0.07 }, full: { sb: earTopY + 0.38, x: rx + th(0) * 0.75 }
    }[st.sides] || { sb: earTopY + 0.1, x: rx + 0.05 };

    /* ---- CAP: the main mass of hair on top of the head ---- */
    const cap = new Path2D();
    cap.moveTo(...outer[0]);
    outer.forEach(p => cap.lineTo(p[0], p[1]));
    const sideDown = (sgn) => {
      const start = sgn > 0 ? outer[N] : outer[0];
      if (sideCfg.sb > cy + 0.01) cap.quadraticCurveTo(start[0] + sgn * 0.03, (cy + sideCfg.sb) / 2, sgn * sideCfg.x, sideCfg.sb);
    };
    const faceWalk = (sgn, yFrom, yTo) => { // along the face edge, inset
      const pts = (sgn > 0 ? m.right : m.left).filter(p => p[1] < yFrom && p[1] > yTo).sort((a, b) => b[1] - a[1]);
      pts.forEach(p => cap.lineTo(p[0] - sgn * 0.035, p[1]));
    };
    sideDown(1);
    cap.lineTo(edgeX(m, sideCfg.sb, 1) - 0.05, Math.max(sideCfg.sb, TR[1]));
    faceWalk(1, sideCfg.sb, TR[1]);
    cap.lineTo(...TR);
    cap.bezierCurveTo(TR[0] * 0.85, hlY + 0.12 * k, 0.42, hlY, 0, hlY);
    cap.bezierCurveTo(-0.42, hlY, TL[0] * 0.85, hlY + 0.12 * k, TL[0], TL[1]);
    // down the left side
    const leftPts = m.left.filter(p => p[1] > TL[1] && p[1] < sideCfg.sb).sort((a, b) => a[1] - b[1]);
    leftPts.forEach(p => cap.lineTo(p[0] + 0.035, p[1]));
    cap.lineTo(edgeX(m, sideCfg.sb, -1) + 0.05, Math.max(sideCfg.sb, TL[1]));
    if (sideCfg.sb > cy + 0.01) {
      cap.lineTo(-sideCfg.x, sideCfg.sb);
      cap.quadraticCurveTo(outer[0][0] - 0.03, (cy + sideCfg.sb) / 2, outer[0][0], outer[0][1]);
    }
    cap.closePath();

    /* ---- SIDE PANELS: faded / buzzed sides (drawn with a gradient) ---- */
    let sidePanels = null;
    if (st.sides === 'fade' || st.sides === 'buzz') {
      sidePanels = [1, -1].map(sgn => {
        const p = new Path2D();
        const bot = earTopY + 0.04;
        p.moveTo(sgn * (rx + S), cy - 0.02);
        p.quadraticCurveTo(sgn * (rx + S * 0.6), (cy + bot) / 2, sgn * rx * 0.985, bot);
        p.lineTo(edgeX(m, bot, sgn) - sgn * 0.02, bot);
        p.lineTo(edgeX(m, cy, sgn) - sgn * 0.02, cy - 0.02);
        p.closePath();
        return p;
      });
    }

    /* ---- FRINGE ---- */
    let fringe = null, fringeEdge = null;
    if (st.fringe) {
      const TRu = [TR[0], TR[1] - 0.06], TLu = [TL[0], TL[1] - 0.06];
      const jag = (fy, amp, step, x0 = 0.8) => {
        const pts = [];
        let i = 0;
        for (let x = x0; x >= -x0 - 1e-6; x -= step, i++) {
          const r = rng(seed + i)();
          pts.push([x, fy + (i % 2 ? amp : -amp * 0.25) + (r - 0.5) * amp * 0.5 - 0.06 * k * (x / x0) ** 2]);
        }
        return pts;
      };
      let edge;
      switch (st.fringe) {
        case 'crop': { const fy = topY + 0.3 * k; edge = [TR, [tem[0] * 0.9, fy - 0.05]].concat(jag(fy, 0.045, 0.13, 0.78), [[-tem[0] * 0.9, fy - 0.05], TL]); break; }
        case 'brow': { const fy = browY - 0.05; edge = [TR, [tem[0] * 0.95, fy - 0.08]].concat(jag(fy, 0.05, 0.09, 0.8), [[-tem[0] * 0.95, fy - 0.08], TL]); break; }
        case 'caesar': { const fy = topY + 0.16 * k; edge = [TR, [tem[0] * 0.9, fy]].concat(jag(fy, 0.012, 0.1, 0.8), [[-tem[0] * 0.9, fy], TL]); break; }
        case 'wispy': { const fy = browY + 0.0; edge = [TR, [tem[0] * 0.95, fy - 0.1]].concat(jag(fy, 0.06, 0.055, 0.82), [[-tem[0] * 0.95, fy - 0.1], TL]); break; }
        case 'side': {
          const h = st.part === 'side' ? 1 : 1; // sweep to the right
          const e = [TR, [tem[0] * 0.99, browY + 0.14], [0.6, browY + 0.08], [0.25, browY - 0.03], [-0.05, (browY + hlY) / 2 + 0.02], [-0.36, hlY + 0.1], TL];
          edge = e.map(p => [p[0] * h, p[1]]);
          break;
        }
        case 'curtain': {
          const cb = -0.04;
          edge = [TR, [edgeX(m, cb, 1) - 0.03, cb], [0.6, browY + 0.02], [0.3, browY - 0.14], [0.08, browY - 0.3], [0, hlY + 0.16],
            [-0.08, browY - 0.3], [-0.3, browY - 0.14], [-0.6, browY + 0.02], [edgeX(m, cb, -1) + 0.03, cb], TL];
          break;
        }
        default: edge = null;
      }
      if (edge) {
        fringeEdge = edge;
        fringe = new Path2D();
        fringe.moveTo(...TLu);
        fringe.bezierCurveTo(TLu[0] * 0.85, hlY - 0.02, -0.42, hlY - 0.08, 0, hlY - 0.08);
        fringe.bezierCurveTo(0.42, hlY - 0.08, TRu[0] * 0.85, hlY - 0.02, TRu[0], TRu[1]);
        fringe.lineTo(...edge[0]);
        const smooth = st.fringe === 'side' || st.fringe === 'curtain';
        if (smooth) curveThrough(fringe, edge); else edge.slice(1).forEach(p => fringe.lineTo(p[0], p[1]));
        fringe.closePath();
      }
    }

    /* ---- LONG HAIR: back layer + front "curtains" ---- */
    let back = null, curtains = null, curtainGuides = null;
    if (st.sides === 'long' && st.len) {
      const chinY = m.chin[1];
      const lenY = { jaw: m.jaw[1] + 0.1, chin: chinY + 0.03, chinplus: chinY + 0.3, collar: chinY + 0.6, shoulder: chinY + 1.0, chest: chinY + 1.75 }[st.len];
      const layers = st.layers || 0;
      const texSpread = { straight: 0, wavy: 0.08, curly: 0.2, coily: 0.28 }[tex] || 0;
      const spread = 0.08 + 0.2 * layers + texSpread;
      const wave = { straight: 0, wavy: 0.035, curly: 0.05, coily: 0.05 }[tex] || 0;
      const waveF = tex === 'curly' || tex === 'coily' ? 22 : 9;
      const xo = y => rx + 0.05 + spread * clamp((y - cy) / (lenY - cy), 0, 1) + wave * Math.sin(y * waveF) * clamp((y - cy) * 2, 0, 1);
      const neckX = m.jaw[0] * 0.62;
      const frame = st.frame ?? 0.4;
      const inset = y => frame * 0.14 * (0.35 + 0.65 * gauss(y, 0.05, 0.45));
      const xi = y => {
        const fe = y <= chinY ? edgeAbs(m, y) - inset(y) : -1;
        const nk = y > m.jaw[1] - 0.05 ? neckX + 0.05 + 0.04 * layers : -1;
        if (frame === 0 && y <= chinY) return Math.max(edgeAbs(m, y) + 0.02, nk);
        return Math.max(fe, nk);
      };
      const backLen = st.aline ? lenY - 0.4 : lenY;
      // back layer
      back = new Path2D();
      back.moveTo(...outer[0]);
      outer.forEach(p => back.lineTo(p[0], p[1]));
      const steps = 24;
      for (let i = 0; i <= steps; i++) { const y = lerp(cy, backLen, i / steps); back.lineTo(xo(y), y); }
      const bottom = (x0, x1, y, jagAmp) => {
        const n = 8;
        for (let i = 1; i <= n; i++) {
          const x = lerp(x0, x1, i / n);
          back.lineTo(x, y - (st.blunt ? 0 : (i % 2 ? jagAmp : 0)) - 0.12 * (1 - Math.abs(x) / Math.abs(x0)) * (st.blunt ? 0 : 1));
        }
      };
      bottom(xo(backLen), -xo(backLen), backLen, 0.05 * layers + 0.02);
      for (let i = steps; i >= 0; i--) { const y = lerp(cy, backLen, i / steps); back.lineTo(-xo(y), y); }
      back.closePath();

      // front curtains (left & right)
      curtains = new Path2D();
      curtainGuides = [];
      [1, -1].forEach(sgn => {
        const ys = [];
        for (let i = 0; i <= 30; i++) ys.push(lerp(tem[1] - 0.1, lenY, i / 30));
        const outerE = ys.map(y => [sgn * (y < cy ? lerp(tem[0] * 0.9, xo(cy), (y - (tem[1] - 0.1)) / (cy - tem[1] + 0.1)) : xo(y)), y]);
        const innerE = ys.map(y => [sgn * Math.min(xi(y), xo(y) - 0.05), y]);
        innerE[0] = [sgn * tem[0] * 0.88, ys[0]];
        const botOuterY = st.aline ? lenY - 0.32 : lenY - (st.blunt ? 0 : 0.04 * layers);
        let ob = [sgn * xo(lenY), botOuterY];
        if (st.flick) ob = [sgn * (xo(lenY) + 0.13), lenY - 0.1];
        curtains.moveTo(...innerE[0]);
        outerE.forEach((p, i) => { if (i < outerE.length - 1) curtains.lineTo(p[0], p[1]); });
        curtains.lineTo(...ob);
        // bottom edge with layered points
        const nB = 5;
        for (let i = 1; i <= nB; i++) {
          const x = lerp(ob[0], innerE[innerE.length - 1][0], i / nB);
          const y = lerp(ob[1], lenY, i / nB) + (st.blunt ? 0 : ((i % 2) ? -0.07 : 0.02) * (0.3 + layers));
          curtains.lineTo(x, y);
        }
        for (let i = innerE.length - 1; i >= 0; i--) curtains.lineTo(innerE[i][0], innerE[i][1]);
        curtains.closePath();
        curtainGuides.push({ outerE, innerE });
      });
    }

    /* ---- MULLET: extra length visible at the back of the neck ---- */
    if (st.mullet) {
      back = new Path2D();
      const y0 = earTopY + 0.05, y1 = m.chin[1] + 0.55;
      back.moveTo(-0.82, y0);
      back.quadraticCurveTo(-0.86, (y0 + y1) / 2, -0.74, y1);
      for (let i = 1; i <= 8; i++) back.lineTo(lerp(-0.74, 0.74, i / 8), y1 - (i % 2 ? 0.08 : 0));
      back.quadraticCurveTo(0.86, (y0 + y1) / 2, 0.82, y0);
      back.closePath();
    }

    return { cap, sidePanels, fringe, fringeEdge, back, curtains, curtainGuides, outer, skullTop, hlY, cy, rx, earTopY, tem, k, TR, TL, heavy, browY };
  }

  /* =================== HAIR DRAWING =================== */
  function strokeStrands(ctx, g, st, col, tex, seed, u) {
    const r = rng(seed + 'strands');
    const light = rgba(mix(col, '#ffffff', 0.32), 0.45), dark = rgba(mix(col, '#000000', 0.45), 0.45);
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.012;
    const top = st.top;
    if (top === 'buzz') return;
    if (top === 'curly' || top === 'afro' || top === 'twists' || tex === 'coily' && top !== 'slick') {
      const n = top === 'afro' ? 140 : 90;
      for (let i = 0; i < n; i++) {
        const t = PI * (0.05 + 0.9 * r());
        const rr = r();
        const base = [g.rx * Math.cos(t) * rr, g.cy - (g.cy - g.skullTop) * Math.sin(t) * rr - r() * 0.3];
        ctx.strokeStyle = i % 2 ? light : dark;
        ctx.beginPath();
        if (top === 'twists') { ctx.moveTo(base[0], base[1]); for (let j = 1; j < 5; j++) ctx.lineTo(base[0] + (j % 2 ? 0.02 : -0.02), base[1] - j * 0.035); }
        else ctx.arc(base[0], base[1], 0.03 + r() * 0.03, r() * PI * 2, r() * PI * 2 + PI * 1.2);
        ctx.stroke();
      }
      return;
    }
    const messy = top === 'messy' || top === 'spiky' || top === 'fauxhawk';
    const n = messy ? 70 : 26;
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = i % 3 ? light : dark;
      ctx.beginPath();
      if (messy) {
        const x = (r() - 0.5) * 2 * g.rx * 0.95, y = lerp(g.skullTop - 0.1, g.hlY + 0.15, r());
        const ang = (top === 'messy' && st.fringe ? PI / 2 : -PI / 2) + (r() - 0.5) * 1.2;
        const L = 0.1 + r() * 0.14;
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(ang) * L * 0.5 + 0.03, y + Math.sin(ang) * L * 0.5, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
      } else if (st.part === 'side') {
        const px = -0.36, y0 = lerp(g.hlY, g.skullTop + 0.15, i / n);
        ctx.moveTo(px, y0);
        ctx.bezierCurveTo(0.2, y0 - 0.15, g.rx * 0.8, lerp(g.skullTop + 0.2, g.cy - 0.1, i / n), g.rx * 0.95, g.cy - 0.05 + (i / n) * 0.1);
      } else {
        const x0 = lerp(-g.tem[0] * 0.9, g.tem[0] * 0.9, i / (n - 1));
        const y0 = g.hlY + 0.12 * (x0 / g.tem[0]) ** 2 * g.k;
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 * 1.02, y0 - 0.3, x0 * 0.6, g.skullTop + 0.05, x0 * 0.3, g.skullTop + 0.25);
      }
      ctx.stroke();
    }
    if (st.part === 'side' || st.part === 'center') {
      const px = st.part === 'side' ? -0.36 : 0;
      ctx.strokeStyle = rgba(mix(col, '#000000', 0.55), 0.7);
      ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.moveTo(px, g.hlY + 0.01); ctx.quadraticCurveTo(px * 0.95, (g.hlY + g.skullTop) / 2, px * 0.8, g.skullTop + 0.35); ctx.stroke();
    }
  }

  function shadeFill(ctx, path, col, u, g, alpha = 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 0.07 * u; ctx.shadowOffsetY = 0.02 * u;
    ctx.fillStyle = rgba(col, alpha);
    ctx.fill(path);
    ctx.restore();
    ctx.save();
    ctx.clip(path);
    const hi = ctx.createRadialGradient(-0.35, g.skullTop + 0.35, 0.05, -0.35, g.skullTop + 0.35, 1.5);
    hi.addColorStop(0, rgba('#ffffff', 0.2 * alpha)); hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi; ctx.fillRect(-3, -4, 6, 8);
    ctx.restore();
  }

  function drawHairBack(ctx, m, st, o) {
    const g = hairGeometry(m, st, o.tex, o.seed);
    if (!g.back) return g;
    ctx.save();
    if (o.clipBackY != null) { const c = new Path2D(); c.rect(-5, -6, 10, o.clipBackY + 6); ctx.clip(c); }
    ctx.fillStyle = mix(o.hair, '#000000', 0.18);
    ctx.fill(g.back);
    ctx.restore();
    return g;
  }

  function drawHairFront(ctx, m, st, o) {
    const g = hairGeometry(m, st, o.tex, o.seed);
    const col = o.hair, u = o.u;
    // faded sides
    if (g.sidePanels) {
      g.sidePanels.forEach(p => {
        const gr = ctx.createLinearGradient(0, g.cy - 0.05, 0, g.earTopY + 0.05);
        const bottomA = st.sides === 'buzz' ? 0.55 : 0.22;
        gr.addColorStop(0, rgba(col, 0.92)); gr.addColorStop(1, rgba(col, bottomA));
        ctx.fillStyle = gr; ctx.fill(p);
      });
    }
    // curtains go first so the cap blends over their tops
    if (g.curtains) {
      shadeFill(ctx, g.curtains, col, u, g);
      ctx.save(); ctx.clip(g.curtains);
      const light = rgba(mix(col, '#ffffff', 0.3), 0.35), dark = rgba(mix(col, '#000000', 0.4), 0.4);
      ctx.lineWidth = 0.012;
      g.curtainGuides.forEach(({ outerE, innerE }) => {
        [0.2, 0.4, 0.6, 0.8].forEach((f, j) => {
          ctx.strokeStyle = j % 2 ? light : dark;
          ctx.beginPath();
          outerE.forEach((p, i) => { const x = lerp(innerE[i][0], p[0], f), y = p[1]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        });
      });
      ctx.restore();
    }
    shadeFill(ctx, g.cap, col, u, g, st.top === 'buzz' ? 0.82 : 1);
    ctx.save(); ctx.clip(g.cap); strokeStrands(ctx, g, st, col, o.tex, o.seed, u); ctx.restore();
    if (g.fringe) {
      const alpha = st.fringe === 'wispy' ? 0.94 : 1;
      shadeFill(ctx, g.fringe, col, u, g, alpha);
      // fringe strands
      ctx.save(); ctx.clip(g.fringe);
      ctx.lineWidth = 0.011;
      const e = g.fringeEdge;
      for (let i = 0; i < e.length; i++) {
        const p = e[i];
        ctx.strokeStyle = i % 2 ? rgba(mix(col, '#ffffff', 0.3), 0.4) : rgba(mix(col, '#000000', 0.45), 0.45);
        ctx.beginPath(); ctx.moveTo(p[0] * 0.7, g.hlY - 0.05); ctx.quadraticCurveTo(p[0] * 0.9, (g.hlY + p[1]) / 2, p[0], p[1]); ctx.stroke();
      }
      ctx.restore();
    }
    return g;
  }

  /* =================== AVATAR: FACE, BODY, BEARD =================== */
  function drawBody(ctx, m, skin, gender) {
    const nw = m.jaw[0] * 0.62, chinY = m.chin[1];
    const neck = new Path2D();
    neck.moveTo(-nw, m.jaw[1] - 0.1); neck.lineTo(-nw * 1.03, chinY + 0.7); neck.lineTo(nw * 1.03, chinY + 0.7); neck.lineTo(nw, m.jaw[1] - 0.1); neck.closePath();
    ctx.fillStyle = mix(skin, '#000000', 0.1); ctx.fill(neck);
    // shadow under the jaw
    ctx.save(); ctx.clip(neck);
    const sh = ctx.createLinearGradient(0, chinY - 0.1, 0, chinY + 0.35);
    sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(-2, chinY - 0.2, 4, 0.6);
    ctx.restore();
    const body = new Path2D();
    const yS = chinY + 0.55;
    body.moveTo(-nw - 0.12, yS);
    body.bezierCurveTo(-1.0, yS + 0.05, -1.75, yS + 0.2, -2.05, yS + 0.75);
    body.lineTo(-2.4, 4.5); body.lineTo(2.4, 4.5); body.lineTo(2.05, yS + 0.75);
    body.bezierCurveTo(1.75, yS + 0.2, 1.0, yS + 0.05, nw + 0.12, yS);
    body.quadraticCurveTo(0, yS + (gender === 'female' ? 0.45 : 0.28), -nw - 0.12, yS);
    body.closePath();
    const bg = ctx.createLinearGradient(0, yS, 0, yS + 2);
    bg.addColorStop(0, '#3a3347'); bg.addColorStop(1, '#221e2b');
    ctx.fillStyle = bg; ctx.fill(body);
  }

  function drawEars(ctx, m, skin) {
    [1, -1].forEach(s => {
      const x = s * (m.cheek[0] + 0.01), y = m.earTop[1] + 0.21;
      ctx.fillStyle = mix(skin, '#000000', 0.07);
      ctx.beginPath(); ctx.ellipse(x, y, 0.105, 0.22, s * 0.12, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(mix(skin, '#000000', 0.35), 0.5); ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.ellipse(x + s * 0.01, y, 0.055, 0.14, s * 0.12, -PI / 2, PI / 2 * (s > 0 ? 1 : 1)); ctx.stroke();
    });
  }

  function facePath(m) { return polyPath(m.sil, true); }

  /* skin of the upper head (forehead above the mesh + scalp) */
  function drawSkull(ctx, m, skin) {
    const k = m.faceLen / 2.3;
    const skullTop = m.top[1] - 0.8 * k, cy = m.temple[1] + 0.05;
    const rx = Math.max(m.cheek[0], m.temple[0]) * 1.02;
    ctx.fillStyle = mix(skin, '#000000', 0.04);
    ctx.beginPath(); ctx.ellipse(0, cy, rx, cy - skullTop, 0, PI, 2 * PI); ctx.lineTo(rx * 0.95, m.earTop[1] + 0.1); ctx.lineTo(-rx * 0.95, m.earTop[1] + 0.1); ctx.closePath(); ctx.fill();
  }

  function drawFace(ctx, m, skin, gender) {
    const fp = facePath(m);
    ctx.fillStyle = skin; ctx.fill(fp);
    ctx.save(); ctx.clip(fp);
    const sh = ctx.createRadialGradient(-0.1, -0.25, 0.2, 0, 0.1, 1.6);
    sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = sh; ctx.fillRect(-2, -2, 4, 4);
    [1, -1].forEach(s => {
      const b = ctx.createRadialGradient(s * 0.5, 0.22, 0, s * 0.5, 0.22, 0.32);
      b.addColorStop(0, `rgba(214,96,96,${gender === 'female' ? 0.16 : 0.07})`); b.addColorStop(1, 'rgba(214,96,96,0)');
      ctx.fillStyle = b; ctx.fillRect(-2, -2, 4, 4);
    });
    ctx.restore();
  }

  function drawFeatures(ctx, m, skin, hair, gender) {
    const browCol = mix(hair, '#000000', 0.25);
    // brows
    m.brows.forEach(b => { ctx.fillStyle = rgba(browCol, 0.88); ctx.fill(polyPath(b, true)); });
    // eyes
    m.eyes.forEach((eye, k) => {
      const ep = polyPath(eye, true);
      ctx.fillStyle = '#f3eee8'; ctx.fill(ep);
      ctx.save(); ctx.clip(ep);
      const ir = m.iris[k] || (() => { const xs = eye.map(p => p[0]), ys = eye.map(p => p[1]); return { c: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], r: (Math.max(...xs) - Math.min(...xs)) * 0.19 }; })();
      const ig = ctx.createRadialGradient(ir.c[0], ir.c[1], 0, ir.c[0], ir.c[1], ir.r);
      ig.addColorStop(0, '#1a120d'); ig.addColorStop(0.45, '#3d2a1e'); ig.addColorStop(1, '#5a3e2b');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ir.c[0], ir.c[1], ir.r, 0, PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ir.c[0] - ir.r * 0.3, ir.c[1] - ir.r * 0.35, ir.r * 0.22, 0, PI * 2); ctx.fill();
      ctx.restore();
      // upper lid line
      ctx.strokeStyle = '#1d1512'; ctx.lineWidth = gender === 'female' ? 0.03 : 0.018; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...eye[0]); curveThrough(ctx, eye.slice(0, 9)); ctx.stroke();
      ctx.strokeStyle = rgba(mix(skin, '#000000', 0.4), 0.5); ctx.lineWidth = 0.01;
      ctx.beginPath(); ctx.moveTo(...eye[8]); curveThrough(ctx, eye.slice(8).concat([eye[0]])); ctx.stroke();
    });
    // nose
    ctx.strokeStyle = rgba(mix(skin, '#000000', 0.45), 0.55); ctx.lineWidth = 0.018; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...m.noseBase[0]); curveThrough(ctx, m.noseBase); ctx.stroke();
    ctx.strokeStyle = rgba(mix(skin, '#000000', 0.4), 0.18); ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(m.noseBridge[0][0] + 0.06, m.noseBridge[0][1]); m.noseBridge.slice(1).forEach(p => ctx.lineTo(p[0] + 0.06, p[1])); ctx.stroke();
    // lips
    const lipCol = mix(skin, gender === 'female' ? '#b0475a' : '#9b5a5a', gender === 'female' ? 0.5 : 0.35);
    ctx.fillStyle = lipCol; ctx.fill(polyPath(m.lips, true));
    const up = new Path2D(); up.moveTo(...m.lips[0]); curveThrough(up, m.lips.slice(0, 11)); curveThrough(up, m.lipsInner.slice().reverse()); up.closePath();
    ctx.fillStyle = rgba(mix(lipCol, '#000000', 0.15), 0.9); ctx.fill(up);
    ctx.strokeStyle = rgba(mix(lipCol, '#000000', 0.5), 0.8); ctx.lineWidth = 0.012;
    ctx.beginPath(); ctx.moveTo(...m.lipsInner[0]); curveThrough(ctx, m.lipsInner); ctx.stroke();
  }

  function beardShapes(m, type) {
    const ms = m.mouth;
    const yS = Math.max(m.earTop[1] + 0.27, 0.12);
    const jawR = m.right.filter(p => p[1] >= yS), jawL = m.left.filter(p => p[1] >= yS);
    const mL = ms.L, mR = ms.R, bot = ms.bottom[1], sub = ms.sub[1], top = ms.top[1];
    const must = [[mL[0] - 0.03, mL[1] + 0.01], [mL[0] + 0.03, sub + 0.045], [0, sub + 0.03], [mR[0] - 0.03, sub + 0.045], [mR[0] + 0.03, mR[1] + 0.01],
    [mR[0] - 0.02, top + 0.03], [0, top + 0.005], [mL[0] + 0.02, top + 0.03]];
    const out = { mustache: must, main: null, extra: [] };
    if (type === 'goatee' || type === 'circle') {
      out.main = [[mL[0] - 0.02, mL[1] + 0.03], [-0.3, m.chin[1] - 0.2], [-0.15, m.chin[1] + 0.0], [0, m.chin[1] + 0.05], [0.15, m.chin[1] + 0.0], [0.3, m.chin[1] - 0.2],
      [mR[0] + 0.02, mR[1] + 0.03], [mR[0] * 0.5, bot + 0.035], [0, bot + 0.045], [mL[0] * 0.5, bot + 0.035]];
      if (type === 'circle') {
        out.extra = [[[mL[0] - 0.08, mL[1] - 0.02], [mL[0] - 0.01, mL[1] - 0.02], [mL[0] - 0.01, mL[1] + 0.09], [mL[0] - 0.1, mL[1] + 0.09]],
        [[mR[0] + 0.08, mR[1] - 0.02], [mR[0] + 0.01, mR[1] - 0.02], [mR[0] + 0.01, mR[1] + 0.09], [mR[0] + 0.1, mR[1] + 0.09]]];
      }
      return out;
    }
    const off = type === 'full' ? p => 0.03 + 0.13 * clamp((p[1] - 0.55) / 0.75, 0, 1) : () => 0.004;
    const push = p => { const d = Math.hypot(p[0], p[1] - 0.45) || 1; const o = off(p); return [p[0] + p[0] / d * o, p[1] + (p[1] - 0.45) / d * o]; };
    const outer = jawR.map(push).concat(jawL.slice(0, -1).reverse().map(push));
    const eR = edgeX(m, yS, 1), eL = edgeX(m, yS, -1);
    const inner = [[eL, yS], [-0.62, 0.3], [mL[0] - 0.09, mL[1] - 0.03], [mL[0] - 0.02, mL[1] + 0.07], [-0.1, bot + 0.05], [0.1, bot + 0.05],
    [mR[0] + 0.02, mR[1] + 0.07], [mR[0] + 0.09, mR[1] - 0.03], [0.62, 0.3], [eR, yS]];
    out.main = outer.concat(inner);
    return out;
  }

  function drawBeard(ctx, m, type, hair) {
    if (!type || type === 'none') return;
    const b = beardShapes(m, type);
    const col = mix(hair, '#000000', type === 'stubble' ? 0.35 : 0.12);
    const al = type === 'stubble' ? 0.26 : 0.9;
    ctx.save();
    ctx.fillStyle = rgba(col, al);
    if (b.main) ctx.fill(polyPath(b.main, type !== 'goatee' && type !== 'circle' ? false : true));
    ctx.fill(polyPath(b.mustache, true));
    b.extra.forEach(e => ctx.fill(polyPath(e, false)));
    if (type === 'stubble' && b.main) {   // fine speckle texture for stubble
      ctx.save(); ctx.clip(polyPath(b.main, false));
      const r = rng('stubble'); ctx.fillStyle = rgba(col, 0.35);
      for (let i = 0; i < 700; i++) { const x = (r() - 0.5) * 2, y = 0.1 + r() * 1.4; ctx.fillRect(x, y, 0.012, 0.012); }
      ctx.restore();
    }
    if (type !== 'stubble' && b.main) {
      ctx.clip(polyPath(b.main, false));
      const r = rng('beard' + type);
      ctx.strokeStyle = rgba(mix(col, '#ffffff', 0.2), 0.35); ctx.lineWidth = 0.008;
      for (let i = 0; i < 120; i++) { const x = (r() - 0.5) * 2, y = 0.2 + r() * 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y + 0.04); ctx.stroke(); }
    }
    ctx.restore();
  }

  /* =================== PUBLIC DRAW FUNCTIONS =================== */
  const BOX = { x0: -2.15, x1: 2.15, y0: -2.7, y1: 3.0 };
  function viewFor(w, h, box = BOX) {
    const sc = Math.min(w / (box.x1 - box.x0), h / (box.y1 - box.y0));
    const ox = w / 2 - sc * (box.x0 + box.x1) / 2, oy = h / 2 - sc * (box.y0 + box.y1) / 2;
    return [sc, 0, 0, sc, ox, oy];
  }
  function setup(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
  }

  /** Draw an illustrated avatar of the user wearing a hairstyle. */
  function drawAvatar(canvas, m, style, o) {
    const ctx = setup(canvas);
    const w = canvas.width, h = canvas.height;
    const v = viewFor(w, h, o.box || BOX);
    if (o.background !== false) {
      const bg = ctx.createRadialGradient(w / 2, h * 0.38, 10, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#3b3044'); bg.addColorStop(1, '#16131b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    }
    ctx.setTransform(...v);
    const opts = style ? { hair: o.hair, tex: style.render.texture || o.tex, seed: style.id, u: v[0] } : null;
    if (style) drawHairBack(ctx, m, style.render, opts);
    drawBody(ctx, m, o.skin, o.gender);
    drawSkull(ctx, m, o.skin);
    drawEars(ctx, m, o.skin);
    drawFace(ctx, m, o.skin, o.gender);
    if (o.gender === 'male') drawBeard(ctx, m, o.beard, o.hair);
    drawFeatures(ctx, m, o.skin, o.hair, o.gender);
    if (style) drawHairFront(ctx, m, style.render, opts);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function invert(a) {
    const det = a[0] * a[3] - a[1] * a[2];
    return [a[3] / det, -a[1] / det, -a[2] / det, a[0] / det, (a[2] * a[5] - a[3] * a[4]) / det, (a[1] * a[4] - a[0] * a[5]) / det];
  }
  function mul(a, b) { // a∘b
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }

  /** Draw the hairstyle over the user's real photo (rough preview).
      split: 0..1 — part of the image (from the left) that shows the
      original photo, for the before/after slider. */
  function drawOnPhoto(canvas, photo, m, style, o) {
    const ctx = setup(canvas);
    const w = canvas.width, h = canvas.height;
    const v = viewFor(w, h, o.box || BOX);
    const photoM = mul(v, invert(m.frame.matrix)); // photo pixels → canvas
    ctx.fillStyle = '#16131b'; ctx.fillRect(0, 0, w, h);
    ctx.setTransform(...photoM); ctx.drawImage(photo, 0, 0);
    if (style) {
      const opts = { hair: o.hair, tex: style.render.texture || o.tex, seed: style.id, u: v[0], clipBackY: m.chin[1] + 0.55 };
      ctx.setTransform(...v);
      drawHairBack(ctx, m, style.render, opts);
      // put the real face (and neck) back on top of the back hair
      const nw = m.jaw[0] * 0.62;
      const neck = new Path2D(); neck.rect(-nw, m.jaw[1] - 0.1, nw * 2, 1.4);
      // forehead strip between the top of the face mesh and the new hairline
      const k = m.faceLen / 2.3, fh = new Path2D();
      fh.rect(-m.temple[0] * 0.9, m.top[1] - 0.26 * k, m.temple[0] * 1.8, 0.4 * k);
      [facePath(m), neck, fh].forEach(clipPath => {
        ctx.save();
        ctx.setTransform(...v);
        ctx.clip(clipPath);
        ctx.setTransform(...photoM); ctx.drawImage(photo, 0, 0);
        ctx.restore();
      });
      ctx.setTransform(...v);
      drawHairFront(ctx, m, style.render, opts);
    }
    if (o.split != null && o.split > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); ctx.rect(0, 0, w * o.split, h); ctx.clip();
      ctx.setTransform(...photoM); ctx.drawImage(photo, 0, 0);
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(w * o.split - 1.5, 0, 3, h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }


  /** Puts the REAL face (eyebrows down, soft edges) back over an AI try-on picture, so the
      identity stays exactly yours and only the hair comes from the AI.
      before: the 840x1120 cropped scan photo; ai: the AI image (same framing); m: face model. */
  function blendRealFace(before, ai, m) {
    const w = before.width, h = before.height;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    o.drawImage(ai, 0, 0, w, h);
    const v = viewFor(w, h), k = m.faceLen / 2.3;
    // soft mask of the face outline (shadow trick = feathered edge in every browser)
    const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
    const mc = mk.getContext('2d'), OFF = 6000;
    mc.shadowColor = '#000'; mc.shadowBlur = Math.max(6, w * 0.012); mc.shadowOffsetX = OFF;
    mc.setTransform(v[0], 0, 0, v[3], v[4] - OFF, v[5]);
    mc.fillStyle = '#000'; mc.fill(facePath(m));
    mc.setTransform(1, 0, 0, 1, 0, 0);
    // fade the top: keep the AI forehead / fringe, keep your real eyebrows, eyes and everything below
    const y0 = v[3] * (m.browY - 0.30 * k) + v[5], y1 = v[3] * (m.browY - 0.04 * k) + v[5];
    const g = mc.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    mc.globalCompositeOperation = 'destination-in';
    mc.fillStyle = g; mc.fillRect(0, 0, w, h);
    // real face, cut with that mask, laid on top
    const fc = document.createElement('canvas'); fc.width = w; fc.height = h;
    const f = fc.getContext('2d');
    f.drawImage(before, 0, 0);
    f.globalCompositeOperation = 'destination-in';
    f.drawImage(mk, 0, 0);
    o.drawImage(fc, 0, 0);
    return out;
  }

  /** Small outline icon of a face shape (used in the "adjust" chips). */
  function drawShapeIcon(canvas, shape, color) {
    const ctx = setup(canvas);
    const face = HS.Analysis.syntheticFace(HS.Analysis.prototypeRatios(shape));
    const m = modelFromSynthetic(face);
    const v = viewFor(canvas.width, canvas.height, { x0: -1.25, x1: 1.25, y0: -1.25, y1: 1.6 });
    ctx.setTransform(...v);
    ctx.strokeStyle = color; ctx.lineWidth = 0.09; ctx.lineJoin = 'round';
    ctx.stroke(facePath(m));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** The user's own face outline with the measurement lines we used. */
  function drawFaceMap(canvas, m, colors) {
    const ctx = setup(canvas);
    const v = viewFor(canvas.width, canvas.height, { x0: -1.45, x1: 1.45, y0: -1.45, y1: 1.65 });
    ctx.setTransform(...v);
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill(facePath(m));
    ctx.strokeStyle = colors.outline; ctx.lineWidth = 0.035; ctx.lineJoin = 'round'; ctx.stroke(facePath(m));
    const P = m.pts;
    const line = (a, b, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = 0.03; ctx.setLineDash([0.07, 0.045]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.setLineDash([]);
      [a, b].forEach(p => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[0], p[1], 0.05, 0, PI * 2); ctx.fill(); });
    };
    line(P[54], P[284], colors.fore);
    line(P[234], P[454], colors.cheek);
    line(P[172], P[397], colors.jaw);
    line(P[10], P[152], colors.len);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return {
    modelFromLandmarks, modelFromSynthetic, drawAvatar, drawOnPhoto, drawShapeIcon, drawFaceMap,
    hairGeometry, beardShapes, mix, viewFor, blendRealFace
  };
})();
