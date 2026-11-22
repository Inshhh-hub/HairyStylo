/* =====================================================================
   HairyStylo — app.js
   ---------------------------------------------------------------------
   The user interface: moves between the screens, starts the scan,
   runs the analysis + recommender and fills in the results page.
   ===================================================================== */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const A = HS.Analysis, R = HS.Renderer;

  const state = {
    gender: null, hairType: null, lengthPref: 'any', maintPref: 'any',
    raw: null,            // what the scan produced (measurements, skin samples, photo)
    analysis: null,       // face shape + skin tone + face model
    over: { shape: null, undertone: null },
    ranked: [], selId: null, colourIdx: 0, beard: null, view: 'avatar', split: 0.5,
    ai: { cache: {}, busy: {}, err: null, errKey: null, auto: false }, before: null,
    scan: null, demo: false
  };

  /* ---------------- navigation ---------------- */
  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    const step = +$('#screen-' + name).dataset.step;
    $$('#steps li').forEach(li => {
      const n = +li.dataset.step;
      li.classList.toggle('done', n < step);
      li.classList.toggle('now', n === step);
    });
    window.scrollTo(0, 0);
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  $('#brand').addEventListener('click', restart);

  /* ---------------- 1. gender ---------------- */
  $$('[data-gender]').forEach(b => b.addEventListener('click', () => {
    state.gender = b.dataset.gender;
    $$('[data-gender]').forEach(x => x.classList.toggle('on', x === b));
    setTimeout(() => show('hair'), 160);
    // start downloading the AI model in the background so it's ready later
    HS.Scanner.getLandmarker('VIDEO').catch(() => { /* handled when the scan starts */ });
  }));

  /* ---------------- 2. hair type & preferences ---------------- */
  $$('[data-hair]').forEach(b => b.addEventListener('click', () => {
    state.hairType = b.dataset.hair;
    $$('[data-hair]').forEach(x => x.classList.toggle('on', x === b));
    $('#hair-next').disabled = false;
  }));
  function chipGroup(sel, attr, key) {
    $$(sel + ' .chip').forEach(c => c.addEventListener('click', () => {
      state[key] = c.dataset[attr];
      $$(sel + ' .chip').forEach(x => x.classList.toggle('on', x === c));
    }));
  }
  chipGroup('#length-chips', 'len', 'lengthPref');
  chipGroup('#maint-chips', 'maint', 'maintPref');
  $('#hair-next').addEventListener('click', () => show('camera'));

  /* ---------------- 3. camera / upload / demo ---------------- */
  function camError(err, during) {
    const box = $('#cam-error');
    let msg;
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      msg = '<b>Camera access was blocked.</b> Click the camera icon in your browser’s address bar, choose <b>Allow</b>, then try again — or use <b>Take a selfie / Upload a photo</b> below.';
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      msg = '<b>No camera was found on this device.</b> Use <b>Upload a photo</b> instead.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      msg = '<b>Your camera is busy.</b> Close other apps using it (Zoom, Meet, Teams…) and try again.';
    } else if (name === 'InsecureContext') {
      msg = '<b>Your browser only allows the camera on secure pages.</b> Open the site using its <b>https://</b> address — or simply tap <b>Take a selfie</b> below, which works everywhere.';
    } else if (name === 'NoFace') {
      msg = '<b>' + err.message + '</b>';
    } else if (during === 'model' || /import|fetch|wasm|model|module|Failed/i.test(String(err && err.message))) {
      msg = '<b>We couldn’t load the AI face model.</b> The first run needs an internet connection (about 10 MB). Check your connection and try again.';
    } else {
      msg = '<b>Something went wrong:</b> ' + (err && err.message ? err.message : err);
    }
    box.innerHTML = msg; box.hidden = false;
    console.error(err);
  }
  function loading(on, text) {
    $('#cam-loading').hidden = !on;
    if (text) $('#cam-loading-text').textContent = text;
  }

  $('#cam-start').addEventListener('click', startLiveScan);
  async function startLiveScan() {
    $('#cam-error').hidden = true;
    state.demo = false;
    const video = $('#video'), overlay = $('#overlay');
    show('scan');
    setScanStatus('Starting camera…', false);
    try { await HS.Scanner.startCamera(video); }
    catch (e) { show('camera'); camError(e); return; }
    setScanStatus('Loading the AI face model…', false);
    state.scan = HS.Scanner.runLiveScan(video, overlay, { onStatus: onScanStatus }, state.gender);
    try {
      const res = await state.scan.promise;
      HS.Scanner.stopCamera(video);
      state.raw = res;
      analyse();
    } catch (e) {
      HS.Scanner.stopCamera(video);
      if (e && e.name === 'Cancelled') return;
      show('camera'); camError(e, 'model');
    }
  }
  $('#scan-cancel').addEventListener('click', () => {
    if (state.scan) state.scan.cancel();
    HS.Scanner.stopCamera($('#video'));
    show('camera');
  });

  function setScanStatus(text, good) {
    const el = $('#scan-status');
    el.textContent = text; el.classList.toggle('good', !!good);
  }
  function pill(id, ok) { const p = $(id); p.classList.toggle('ok', ok === true); p.classList.toggle('bad', ok === false); }
  function onScanStatus(s) {
    const pct = Math.round(Math.min(1, s.progress) * 100);
    $('#guide-progress').style.strokeDasharray = `${pct} 100`;
    $('#scan-bar').style.width = pct + '%';
    pill('#pill-face', !!s.face);
    pill('#pill-dist', s.pose ? s.pose.distance === 'ok' && s.pose.centered : null);
    pill('#pill-pose', s.pose ? s.pose.straight : null);
    pill('#pill-light', s.face ? s.light : null);
    if (s.phase === 'capturing' && s.good) {
      setScanStatus(`Hold still… measuring ${pct}%`, true);
      $('#scan-hint').textContent = 'Mapping 478 points and sampling your skin tone. Keep a neutral face.';
    } else {
      setScanStatus(s.issues[0] || 'Hold still…', false);
      $('#scan-hint').textContent = s.phase === 'capturing'
        ? 'Paused — fix the hint above and measuring continues automatically.'
        : 'Fit your face inside the oval. We’ll start measuring automatically when everything is green.';
    }
  }

  async function handleFile(file) {
    if (!file) return;
    $('#cam-error').hidden = true;
    state.demo = false;
    loading(true, 'Loading the AI face model and reading your photo…');
    try {
      state.raw = await HS.Scanner.analyzePhoto(file, state.gender);
      loading(false);
      analyse();
    } catch (e) { loading(false); camError(e, e.name === 'NoFace' ? null : 'model'); }
  }
  $('#file-selfie').addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });
  $('#file-photo').addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });

  /* demo: a synthetic face so the app can be tried without a camera */
  $('#demo-btn').addEventListener('click', () => {
    state.demo = true;
    const shapes = HS.SHAPE_ORDER;
    const shape = state.demoShape || shapes[Math.floor(Math.random() * shapes.length)];
    const proto = A.prototypeRatios(shape), mean = A.prototypeRatios('oval');
    const mixd = {};
    Object.keys(proto).forEach(k => { mixd[k] = proto[k] * 0.85 + mean[k] * 0.15; });
    const lm = A.syntheticLandmarks(mixd);
    const skins = [[72, 11, 17], [62, 12, 20], [55, 13, 23], [46, 13, 22], [36, 11, 18]];
    const sk = skins[Math.floor(Math.random() * skins.length)];
    state.raw = {
      features: A.extractFeatures(lm, 1000, 1000), frames: 1, skinFrames: [], demoSkin: { L: sk[0], a: sk[1], b: sk[2] },
      demoFace: A.syntheticFace(mixd), photo: null, mirrored: false,
      warnings: ['This is a sample face for testing — scan your own face for real results.']
    };
    analyse();
  });

  /* ---------------- 4. analysis ---------------- */
  function sampleNaturalHair(photo, model, skinHex) {
    try {
      if (!photo || !model.frame) return null;
      const ctx = photo.canvas.getContext('2d', { willReadFrequently: true });
      const M = model.frame.matrix;
      const toPx = (u, v) => [M[0] * u + M[2] * v + M[4], M[1] * u + M[3] * v + M[5]];
      const k = model.faceLen / 2.3, top = model.top[1];
      const r = Math.max(4, model.frame.s * 0.09);
      const W = photo.canvas.width, H = photo.canvas.height;
      const labs = [[0, top - 0.5 * k], [-0.42, top - 0.42 * k], [0.42, top - 0.42 * k]].map(([u, v]) => {
        const [x, y] = toPx(u, v);
        if (x < r || y < r || x > W - r || y > H - r) return null;
        const img = ctx.getImageData(Math.round(x - r), Math.round(y - r), Math.round(2 * r), Math.round(2 * r));
        return A.robustLab(A.sampleDisc(img, r, r, r));
      }).filter(Boolean);
      if (labs.length < 2) return null;
      const Ls = labs.map(l => l.L);
      if (Math.max(...Ls) > 72 || Math.max(...Ls) - Math.min(...Ls) > 18) return null;
      const L = A.median(Ls), a = A.median(labs.map(l => l.a)), b = A.median(labs.map(l => l.b));
      if (Math.hypot(a, b) > 38) return null;                                  // too vivid to be natural hair / background
      const sk = A.rgbToLab(...A.hexToRgb(skinHex));
      if (Math.hypot(sk[0] - L, sk[1] - a, sk[2] - b) < 14) return null;   // that's skin (short hair / bald)
      return A.rgbToHex(...A.labToRgb(L, a, b));
    } catch (e) { return null; }
  }

  function analyse() {
    const raw = state.raw;
    const face = A.classifyFaceShape(raw.features);
    let skin = raw.skinFrames && raw.skinFrames.length ? A.aggregateSkin(raw.skinFrames) : null;
    const warnings = (raw.warnings || []).slice();
    if (!skin) {
      skin = A.classifySkin(raw.demoSkin || { L: 58, a: 12, b: 20 });
      if (!raw.demoSkin) warnings.push('We could not read your skin tone clearly — try again in better light.');
    }
    const model = raw.photo
      ? R.modelFromLandmarks(raw.photo.lm, raw.photo.W, raw.photo.H, raw.mirrored)
      : R.modelFromSynthetic(raw.demoFace || A.syntheticFace());
    const naturalHair = sampleNaturalHair(raw.photo, model, skin.hex);
    state.analysis = { face, skin, model, naturalHair, warnings: warnings.concat(skin.warnings || []) };
    state.over = { shape: null, undertone: null };
    state.selId = null; state.colourIdx = 0; state.split = 0.5;
    state.view = raw.photo ? 'real' : 'avatar';
    state.before = {}; state.sides = { left: null, right: null }; state.angle = 'front';
    state.ai = { cache: {}, busy: {}, err: null, errKey: null, auto: true, ready: null };   // first realistic try-on starts automatically
    const aiState = state.ai;
    HS.TryOn.ready().then(v => {   // is the try-on set up on the server?
      if (state.ai !== aiState) return;
      aiState.ready = v;
      if (document.querySelector('#screen-results.active') && state.raw && state.raw.photo) drawPreview();
      if (v === true && state.ranked.length && document.querySelector('#screen-results.active') && state.raw.photo) setTimeout(() => startThumbs(), 800);
    });
    state.beard = state.gender === 'male' ? HS.BEARD_FOR_SHAPE[face.shape].recs[0] : 'none';
    state.thumbBeard = state.beard;

    // the "analysing" screen ticks through the steps
    show('analyzing');
    const items = $$('#checklist li');
    items.forEach(li => li.classList.remove('done'));
    items.forEach((li, i) => setTimeout(() => li.classList.add('done'), 380 * (i + 1)));
    setTimeout(() => { renderResults(); show('results'); celebrate(); }, 380 * items.length + 450);
  }

  /* ---------------- 5. results ---------------- */
  const effShape = () => state.over.shape || state.analysis.face.shape;
  const effProbs = () => state.over.shape ? { [state.over.shape]: 1 } : state.analysis.face.probs;
  const effSkin = () => Object.assign({}, state.analysis.skin, state.over.undertone ? { undertone: state.over.undertone } : {});
  const currentRank = () => state.ranked.find(r => r.style.id === state.selId) || state.ranked[0];
  function hairColour() {
    const c = colourOptions()[state.colourIdx] || colourOptions()[0];
    return c.hex;
  }
  function colourOptions() {
    const list = HS.Recommender.colours(effSkin()).slice();
    const nat = state.analysis.naturalHair;
    list.unshift({ name: nat ? 'Your natural colour' : 'Natural dark', hex: nat || (state.gender === 'male' ? '#241a15' : '#2e1f18'), tip: 'Your current shade — the cut alone gives the glow-up.', natural: true });
    return list;
  }

  function renderResults() {
    const an = state.analysis;
    const profile = {
      gender: state.gender, hairType: state.hairType, lengthPref: state.lengthPref, maintPref: state.maintPref,
      shapeProbs: effProbs(), shape: effShape()
    };
    state.ranked = HS.Recommender.rank(profile);
    if (!state.selId || !state.ranked.some(r => r.style.id === state.selId)) state.selId = state.ranked[0].style.id;
    const shapeInfo = HS.FACE_SHAPES[effShape()];
    const skin = effSkin();

    $('#res-style').textContent = state.ranked[0].style.name;
    const ht = HS.HAIR_TYPES[state.hairType].name.toLowerCase();
    $('#res-summary').textContent = `${shapeInfo.name} face · ${skin.tone.name} skin with a ${HS.UNDERTONES[skin.undertone].name.toLowerCase()} undertone · ${ht} hair. We scored all ${state.ranked.length} ${state.gender === 'male' ? 'men’s' : 'women’s'} cuts in our library for you.`;
    const w = $('#res-warnings');
    w.hidden = !an.warnings.length;
    w.innerHTML = an.warnings.map(x => '⚠️ ' + x).join('<br>');

    // tabs: photo views need a real photo
    $$('#view-tabs .tab').forEach(t => { t.disabled = t.dataset.view !== 'avatar' && !state.raw.photo; });
    if (!state.raw.photo) state.view = 'avatar';   // the sample face has no photo to edit
    $$('#view-tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.view === state.view));

    renderAnalysisCard();
    renderMatches();
    renderAvoid();
    renderBonus();
    renderSelected();
  }

  function renderSelected() {
    const r = currentRank();
    const st = r.style;
    const rankNo = state.ranked.indexOf(r) + 1;
    $('#pick-rank').textContent = rankNo === 1 ? '#1 match — our top pick' : `#${rankNo} match`;
    $('#pick-name').textContent = st.name;
    $('#pick-vibe').textContent = st.vibe;
    $('#pick-pct').textContent = r.pct + '%';
    requestAnimationFrame(() => { $('#sr-fg').style.strokeDasharray = `${r.pct} 100`; });
    $('#pick-desc').textContent = st.desc;
    $('#pick-reasons').innerHTML = r.reasons.map(x => `<li>${x}</li>`).join('')
      + r.cautions.slice(0, 1).map(x => `<li class="caution">${x}</li>`).join('');
    const bd = [['Face-shape fit', r.parts.shape], ['Hair-type fit', r.parts.hair], ['Length you want', r.parts.length], ['Styling time', r.parts.maint]];
    $('#pick-breakdown').innerHTML = bd.map(([k, v]) => `<div class="bd-row"><span>${k}</span><div class="bd-bar"><i style="width:${Math.round(v * 100)}%"></i></div><span>${Math.round(v * 100)}%</span></div>`).join('');
    const maint = ['', 'Low upkeep', 'Medium upkeep', 'High upkeep'][st.maint];
    $('#pick-tags').innerHTML = [st.length[0].toUpperCase() + st.length.slice(1) + ' length', maint, 'Trim: ' + st.trim.toLowerCase()].map(t => `<span class="tag">${t}</span>`).join('');
    $$('.match').forEach(m => m.classList.toggle('on', m.dataset.id === st.id));

    renderSwatches();
    renderBeard();
    drawPreview();
    renderBarber();
    $('#styling-steps').innerHTML = st.styling.map(s => `<li><span>${s}</span></li>`).join('');
    $('#styling-meta').textContent = `Products: ${st.products} · Trim: ${st.trim}`;
  }

  /* ---------- the preview: realistic AI try-on on YOUR photo / before ---------- */
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const currentColour = () => colourOptions()[state.colourIdx] || colourOptions()[0];
  const keyFor = (a, st, col, beard) => [a, st.id, col.name, state.gender === 'male' ? beard : '-', state.hairType].join('|');
  const aiKey = (a) => keyFor(a || state.angle, currentRank().style, currentColour(), state.beard);
  const aiResult = (a) => state.ai.cache[aiKey(a)];
  /* the photo + face model of one angle: 'front' (the main scan) or a side view */
  function angleData(a) {
    a = a || state.angle;
    if (a === 'front') return { photo: state.raw.photo, mirrored: state.raw.mirrored, model: state.analysis.model };
    return state.sides[a];
  }
  function beforeCanvas(a) {              // the cropped scan photo we show as "Before" and send for the try-on
    a = a || state.angle;
    if (!state.before[a]) {
      const d = angleData(a);
      const c = document.createElement('canvas'); c.width = 840; c.height = 1120;
      R.drawOnPhoto(c, d.photo.canvas, d.model, null, {});
      state.before[a] = c;
    }
    return state.before[a];
  }
  function drawCover(ctx, img, w, h) {
    const sc = Math.max(w / img.width, h / img.height), dw = img.width * sc, dh = img.height * sc;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  function tag(ctx, text, x, y, alignRight) {
    ctx.font = '600 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const w = ctx.measureText(text).width + 28;
    const x0 = alignRight ? x - w : x;
    ctx.fillStyle = 'rgba(15,12,20,0.72)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y, w, 46, 23) : ctx.rect(x0, y, w, 46); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(text, x0 + 14, y + 32);
  }

  function drawPreview() {
    const c = $('#preview');
    const an = state.analysis, st = currentRank().style;
    const o = { skin: an.skin.hex, hair: hairColour(), tex: state.hairType, gender: state.gender, beard: state.beard };
    const ph = state.raw.photo;
    updateAngleUI(!!ph);
    const overlay = $('#ai-overlay');
    $('#compare').hidden = true; $('#ai-actions').hidden = true; overlay.hidden = true;
    if (!ph) {   // the built-in sample face has no photo to edit, so it can only show a sketch
      R.drawAvatar(c, an.model, st, o);
      $('#preview-note').textContent = 'Sample face — a sketch only. Scan your own face (camera or photo) to see a realistic try-on on your own photo.';
      return;
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    const before = beforeCanvas();
    if (state.view === 'before') {
      ctx.drawImage(before, 0, 0, c.width, c.height);
      $('#preview-note').textContent = 'Your photo from the scan.';
      return;
    }
    // ---- real try-on ----
    const res = aiResult();
    if (res) {
      drawCover(ctx, res.img, c.width, c.height);
      const x = Math.round(c.width * state.split);
      if (x > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, c.height); ctx.clip();
        ctx.drawImage(before, 0, 0, c.width, c.height); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(x - 2, 0, 4, c.height);
        ctx.beginPath(); ctx.arc(x, c.height / 2, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1d1118'; ctx.font = '700 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⇆', x, c.height / 2 + 9); ctx.textAlign = 'left';
        if (x > 170) tag(ctx, 'Before', 18, 18);
      }
      if (x < c.width - 150) tag(ctx, 'After', c.width - 18, 18, true);
      $('#compare').hidden = false;
      $('#ai-actions').hidden = false;
      $('#preview-note').textContent = `Realistic try-on on your own photo, created by ${res.model}. Drag the slider to compare before and after.`;
      return;
    }
    ctx.drawImage(before, 0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(12,9,16,0.55)'; ctx.fillRect(0, 0, c.width, c.height);
    overlay.hidden = false;
    const key = aiKey();
    const colour = currentColour();
    const summary = `${st.name} · ${colour.natural ? 'natural colour' : colour.name}${state.gender === 'male' ? ' · ' + HS.BEARDS[state.beard || 'none'].name.toLowerCase() : ''}`;
    if (state.ai.busy[key]) {
      overlay.innerHTML = `<div class="ai-card center"><span class="spinner big"></span><h3>Creating your new look…</h3><p>${esc(summary)}</p><p class="mini">The AI is redrawing your hair on your photo. This usually takes 10–30 seconds.</p></div>`;
      $('#preview-note').textContent = 'Working on it…';
    } else if (state.ai.err && state.ai.errKey === key) {
      const e = state.ai.err;
      overlay.innerHTML = `<div class="ai-card"><h3>${e.kind === 'unavailable' ? 'Try-on is not set up yet' : 'That didn’t work'}</h3>
        <p class="ai-err">${esc(e.message || String(e))}</p>
        <div class="key-row"><button class="btn primary" id="ai-retry">Try again</button></div></div>`;
      $('#preview-note').textContent = 'Your face analysis, matches and barber card below still work.';
    } else if (state.ai.ready === false) {
      overlay.innerHTML = `<div class="ai-card"><h3>Try-on is not set up yet</h3>
        <p class="ai-err">Realistic try-on needs the free Cloudflare keys in Vercel (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN). Add them, redeploy, then rescan.</p>
        <p class="mini">Your face analysis, matches and barber card below already work.</p></div>`;
      $('#preview-note').textContent = '';
    } else if (state.ai.auto) {
      if (state.ai.ready === null) {   // still asking the server what is set up
        overlay.innerHTML = `<div class="ai-card center"><span class="spinner big"></span><h3>Getting ready…</h3></div>`;
        $('#preview-note').textContent = '';
        return;
      }
      state.ai.auto = false;
      generateNow();
      return;
    } else {
      overlay.innerHTML = `<div class="ai-card center"><button class="btn primary big" id="ai-go">✨ Create my realistic look</button><p>${esc(summary)}</p><p class="mini">Edits your scan photo with an AI image model · about 10–30 s</p></div>`;
      $('#preview-note').textContent = 'Each haircut, colour and beard you pick can be created on your real photo.';
    }
  }

  /** one AI try-on (cached). spec = { style, colour, beard }. Returns the result, or null if the same one is already being made. */
  async function makeTryOn(ang, spec) {
    const key = keyFor(ang, spec.style, spec.colour, spec.beard);
    if (state.ai.cache[key]) return state.ai.cache[key];
    if (state.ai.busy[key]) return null;
    state.ai.busy[key] = true;
    try {
      const res = await HS.TryOn.generate(beforeCanvas(ang), {
        style: spec.style, colour: spec.colour, beard: spec.beard, gender: state.gender, hairType: state.hairType, angle: ang
      });
      try { res.img = R.blendRealFace(beforeCanvas(ang), res.img, angleData(ang).model); }   // keep YOUR real face, take only the hair from the AI
      catch (e) { console.warn('face blend skipped', e); }
      state.ai.cache[key] = res;
      return res;
    } finally { delete state.ai.busy[key]; }
  }
  const onResults = () => !!document.querySelector('#screen-results.active');

  async function generateNow(ang) {
    ang = ang || state.angle;
    const spec = { style: currentRank().style, colour: currentColour(), beard: state.beard };
    const key = keyFor(ang, spec.style, spec.colour, spec.beard);
    if (state.ai.busy[key]) return;
    state.ai.err = null;
    const snapshot = state.analysis;
    const p = makeTryOn(ang, spec);     // marks itself busy straight away
    drawPreview();
    try { await p; }
    catch (e) { console.error(e); state.ai.err = e; state.ai.errKey = key; }
    finally {
      if (state.analysis === snapshot && onResults()) { drawPreview(); renderBarber(); updateThumbs(); }
    }
  }

  /* ---------- realistic thumbnails for the top matches (your own photo, each haircut) ---------- */
  const thumbSpec = st => ({ style: st, colour: colourOptions()[0], beard: state.thumbBeard });
  const thumbKey = st => { const sp = thumbSpec(st); return keyFor('front', sp.style, sp.colour, sp.beard); };
  function updateThumbs() {
    if (!state.raw || !state.raw.photo) return;
    $$('.match').forEach(b => {
      const r = state.ranked.find(x => x.style.id === b.dataset.id); if (!r) return;
      const cv = b.querySelector('canvas'), ctx = cv.getContext('2d');
      const res = state.ai.cache[thumbKey(r.style)];
      ctx.clearRect(0, 0, cv.width, cv.height);
      drawCover(ctx, res ? res.img : beforeCanvas('front'), cv.width, cv.height);
      const busy = state.ai.busy[thumbKey(r.style)];
      b.classList.toggle('making', !res && !!busy);
      if (!res) { ctx.fillStyle = 'rgba(12,9,16,0.5)'; ctx.fillRect(0, 0, cv.width, cv.height); }
      if (!res && busy) { ctx.fillStyle = '#fff'; ctx.font = '600 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Creating…', cv.width / 2, cv.height / 2); ctx.textAlign = 'left'; }
    });
  }
  async function startThumbs() {
    if (!state.raw.photo || state.ai.ready !== true || state.ai.thumbsOn || !state.ranked.length) return;
    const aiState = state.ai, snapshot = state.analysis;
    aiState.thumbsOn = true;
    state.thumbBeard = state.beard;
    const mine = state.ranked.slice(0, 6).map(r => r.style);
    const queue = mine.filter(st => st.id !== state.selId).concat(mine.filter(st => st.id === state.selId));
    let stop = false;
    const worker = async () => {
      while (queue.length && !stop && state.ai === aiState) {
        const st = queue.shift();
        try { await makeTryOn('front', thumbSpec(st)); }
        catch (e) { console.warn('thumb', e); if (e && e.kind && e.kind !== 'network') stop = true; }
        if (state.analysis !== snapshot) return;
        if (onResults()) {
          updateThumbs();
          if (st.id === currentRank().style.id) { drawPreview(); renderBarber(); }
        }
      }
    };
    await Promise.all([worker(), worker()]);
  }

  $('#ai-overlay').addEventListener('click', e => {
    const id = e.target && e.target.id;
    if (id === 'ai-go') generateNow();
    else if (id === 'ai-retry') { state.ai.err = null; generateNow(); }
  });
  $('#ai-again').addEventListener('click', () => { delete state.ai.cache[aiKey()]; generateNow(); });
  $('#ai-save').addEventListener('click', () => {
    const res = aiResult(); if (!res) return;
    const c = document.createElement('canvas'); c.width = res.img.naturalWidth || res.img.width; c.height = res.img.naturalHeight || res.img.height;
    c.getContext('2d').drawImage(res.img, 0, 0);
    c.toBlob(blob => {
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `hairystylo-${currentRank().style.id.replace(/^[mw]_/, '')}-${state.angle}.jpg`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/jpeg', 0.93);
  });


  /* ---------- side views: turn left / turn right ---------- */
  const ANGLES = ['left', 'front', 'right'];
  function updateAngleUI(hasPhoto) {
    $('#angle-row').hidden = !hasPhoto;
    $('#sides-cta').hidden = !hasPhoto || !!(state.sides.left && state.sides.right);
    $$('#angle-row .chip').forEach(c => {
      const a = c.dataset.angle;
      c.classList.toggle('on', a === state.angle);
      c.classList.toggle('missing', a !== 'front' && !state.sides[a]);
    });
  }
  function sidesMsg(text) { const m = $('#sides-msg'); m.textContent = text || ''; m.hidden = !text; }
  function pickAngle(a) {
    if (a !== 'front' && !state.sides[a]) { startSideScan(); return; }
    state.angle = a;
    drawPreview();
    if (state.ai.ready === true && !aiResult() && !state.ai.busy[aiKey()]) { state.ai.err = null; generateNow(a); }
  }
  $$('#angle-row .chip').forEach(c => c.addEventListener('click', () => pickAngle(c.dataset.angle)));

  async function useSides(list) {     // list of {dir, photo, mirrored}
    list.forEach(r => {
      state.sides[r.dir] = { photo: r.photo, mirrored: r.mirrored, model: R.modelFromLandmarks(r.photo.lm, r.photo.W, r.photo.H, r.mirrored) };
      delete state.before[r.dir];
    });
    show('results');
    const first = list.map(r => r.dir).sort()[0];      // 'left' before 'right'
    state.angle = first; drawPreview();
    for (const r of list.map(r => r.dir).sort()) {     // make the side try-ons one after another
      if (state.ai.ready === false) break;
      if (!aiResult(r)) await generateNow(r);
    }
  }

  async function startSideScan() {
    sidesMsg('');
    const video = $('#video-s'), overlay = $('#overlay-s');
    show('sides');
    $('#sides-status').textContent = 'Starting camera…';
    try { await HS.Scanner.startCamera(video); }
    catch (e) { show('results'); sidesMsg('Could not open the camera for the side scan. You can upload side photos instead.'); console.error(e); return; }
    $('#sides-status').textContent = 'Loading the AI face model…';
    state.sideScan = HS.Scanner.runSideScan(video, overlay, { onStatus: onSideStatus });
    try {
      const list = await state.sideScan.promise;
      HS.Scanner.stopCamera(video);
      useSides(list);
    } catch (e) {
      HS.Scanner.stopCamera(video);
      if (e && e.name === 'Cancelled') return;
      show('results'); sidesMsg('The side scan did not work. Try again or upload side photos.'); console.error(e);
    }
  }
  function onSideStatus(s) {
    const st = $('#sides-status');
    st.textContent = s.issues[0] || (s.good ? 'Hold still…' : 'Hold still…');
    st.classList.toggle('good', !!s.good);
    $('#sides-bar').style.width = Math.round(Math.min(1, s.progress) * 100) + '%';
    $('#sides-hint').textContent = s.done === 0 ? 'Step 1 of 2 — turn your head to YOUR LEFT, about 35°, and hold still.' : 'Step 2 of 2 — now turn your head to YOUR RIGHT, about 35°, and hold still.';
  }
  $('#sides-cancel').addEventListener('click', () => {
    if (state.sideScan) state.sideScan.cancel();
    HS.Scanner.stopCamera($('#video-s'));
    show('results');
  });
  $('#sides-scan').addEventListener('click', startSideScan);
  $('#file-sides').addEventListener('change', async e => {
    const files = Array.from(e.target.files || []).slice(0, 2); e.target.value = '';
    if (!files.length) return;
    sidesMsg('Reading your side photos…');
    const ok = [], problems = [];
    for (const f of files) {
      try { ok.push(await HS.Scanner.readSidePhoto(f)); } catch (err) { problems.push(err.message || 'Could not read a photo.'); }
    }
    sidesMsg(problems.join(' '));
    if (ok.length) useSides(ok);
  });

  $$('#view-tabs .tab').forEach(t => t.addEventListener('click', () => {
    if (t.disabled) return;
    state.view = t.dataset.view;
    $$('#view-tabs .tab').forEach(x => x.classList.toggle('on', x === t));
    drawPreview();
  }));
  $('#compare').addEventListener('input', e => { state.split = e.target.value / 100; drawPreview(); });

  function renderSwatches() {
    const opts = colourOptions();
    $('#colour-swatches').innerHTML = opts.map((c, i) =>
      `<button class="swatch ${i === state.colourIdx ? 'on' : ''}" data-i="${i}"><i style="background:${c.hex}"></i>${c.name}</button>`).join('');
    $('#colour-tip').textContent = opts[state.colourIdx].tip;
    $$('#colour-swatches .swatch').forEach(b => b.addEventListener('click', () => {
      state.colourIdx = +b.dataset.i;
      renderSwatches(); drawPreview(); renderMatches(); renderBarber();
    }));
  }

  function renderBeard() {
    const blk = $('#beard-block');
    blk.hidden = state.gender !== 'male';
    if (state.gender !== 'male') return;
    const rec = HS.BEARD_FOR_SHAPE[effShape()];
    const order = ['none', 'stubble', 'boxed', 'full', 'goatee', 'circle'];
    $('#beard-chips').innerHTML = order.map(k => `<button class="chip ${state.beard === k ? 'on' : ''}" data-b="${k}">${rec.recs.includes(k) ? '<span class="star">★</span>' : ''}${HS.BEARDS[k].name}</button>`).join('');
    $('#beard-tip').textContent = `★ = recommended for your face. ${rec.tip}`;
    $$('#beard-chips .chip').forEach(b => b.addEventListener('click', () => {
      state.beard = b.dataset.b; renderBeard(); drawPreview(); renderBarber();
    }));
  }

  function renderMatches() {
    const top = state.ranked.slice(0, 6);
    const box = $('#matches');
    box.innerHTML = '';
    const an = state.analysis;
    top.forEach((r, i) => {
      const b = document.createElement('button');
      b.className = 'match' + (r.style.id === state.selId ? ' on' : '');
      b.dataset.id = r.style.id;
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 340;
      b.appendChild(cv);
      b.insertAdjacentHTML('beforeend', `<b>${i + 1}. ${r.style.name}</b><small><span class="pct">${r.pct}% match</span> · ${r.style.length}</small>`);
      b.addEventListener('click', () => {
        state.selId = r.style.id; renderSelected();
        $('#pick-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (state.raw.photo && state.ai.ready === true && state.angle === 'front' && !aiResult() && !state.ai.busy[aiKey()]) generateNow();
      });
      box.appendChild(b);
      if (!state.raw.photo) R.drawAvatar(cv, an.model, r.style, { skin: an.skin.hex, hair: hairColour(), tex: state.hairType, gender: state.gender, beard: 'none', box: { x0: -2.0, x1: 2.0, y0: -2.6, y1: 2.0 } });
    });
    updateThumbs();     // real photos: your own face with each haircut (made by the AI)
    if (state.raw.photo) setTimeout(() => startThumbs(), 1200);   // after the first (big) try-on has been started
  }

  function renderAvoid() {
    const profile = { shape: effShape(), hairType: state.hairType };
    const list = HS.Recommender.avoid(profile, state.ranked);
    $('#avoid-list').innerHTML = list.length
      ? list.map(a => `<li><b>${a.style.name}</b><span>${a.why}</span></li>`).join('')
      : '<li><b>Nothing to avoid!</b><span>Your face shape suits every style in our library.</span></li>';
  }

  function renderBonus() {
    const s = HS.FACE_SHAPES[effShape()];
    const skin = effSkin();
    $('#bonus-shape').textContent = s.name.toLowerCase();
    const items = [
      ['Eyebrows', s.brows],
      ['Glasses / sunglasses', s.glasses],
      state.gender === 'female' ? ['Parting & fringe', s.partTip] : ['Beard', HS.BEARD_FOR_SHAPE[effShape()].tip],
      ['Your undertone', HS.UNDERTONES[skin.undertone].desc]
    ];
    $('#bonus-grid').innerHTML = items.map(([h, p]) => `<div class="bonus-item"><h4>${h}</h4><p>${p}</p></div>`).join('');
  }

  function renderAnalysisCard() {
    const an = state.analysis;
    const shapeKey = effShape(), s = HS.FACE_SHAPES[shapeKey];
    const probs = effProbs();
    $('#shape-name').textContent = s.name;
    if (state.over.shape) $('#shape-conf').textContent = 'Set by you';
    else {
      const rk = an.face.ranked;
      const second = rk[1] && rk[1][1] > 0.18 ? ` · also close to ${HS.FACE_SHAPES[rk[1][0]].name}` : '';
      $('#shape-conf').textContent = `${Math.round(rk[0][1] * 100)}% confidence${second}`;
    }
    $('#shape-desc').textContent = s.desc;
    const colors = { outline: '#f6eee8', fore: '#ffb86b', cheek: '#ff6f9c', jaw: '#7fe0a9', len: '#9fb6ff' };
    R.drawFaceMap($('#facemap'), an.model, colors);
    const f = state.raw.features, mean = A.MODEL.mean, z = an.face.z;
    const word = (zz, lo, hi) => zz > 1 ? hi : zz < -1 ? lo : 'about average';
    $('#measures').innerHTML = [
      [colors.len, 'Face length ÷ width', f.lenRatio, mean.len, word(z[0], 'shorter than average', 'longer than average')],
      [colors.fore, 'Forehead ÷ cheekbones', f.foreRatio, mean.fore, word(z[1], 'narrower forehead', 'wider forehead')],
      [colors.cheek, 'Cheekbone width', 1, 1, 'reference (100%)'],
      [colors.jaw, 'Jaw ÷ cheekbones', f.jawRatio, mean.jaw, word(z[2], 'narrower jaw', 'wider jaw')],
      ['#c9b8ff', 'Jaw squareness', f.jawTaper, mean.taper, word(z[3], 'soft, tapered', 'square, angular')]
    ].map(([c, k, v, m, wd]) => `<div class="measure"><span><i style="background:${c}"></i>${k}: <b>${k === 'Cheekbone width' ? '100%' : v.toFixed(2)}</b></span><span>${wd}</span></div>`).join('');
    $('#prob-bars').innerHTML = Object.entries(probs).sort((a, b) => b[1] - a[1]).map(([k, p], i) =>
      `<div class="prob ${i === 0 ? 'top' : ''}"><span>${HS.FACE_SHAPES[k].name}</span><div class="bd-bar"><i style="width:${Math.round(p * 100)}%"></i></div><span>${Math.round(p * 100)}%</span></div>`).join('');

    // skin
    const skin = effSkin();
    $('#skin-swatch').style.background = `radial-gradient(circle at 35% 30%, ${R.mix(skin.hex, '#ffffff', 0.18)}, ${skin.hex} 60%, ${R.mix(skin.hex, '#000000', 0.15)})`;
    $('#skin-name').textContent = skin.tone.name;
    $('#skin-sub').textContent = `${skin.tone.alias} · ${HS.UNDERTONES[skin.undertone].name} undertone${skin.olive && skin.undertone !== 'cool' ? ' (olive hint)' : ''}`;
    $('#monk').innerHTML = HS.MONK_SCALE.map((h, i) => `<div style="background:${h}" class="${i + 1 === skin.monk ? 'on' : ''}" title="MST-${i + 1}"></div>`).join('');
    $('#monk-label').textContent = `Monk Skin Tone scale: MST-${skin.monk} of 10 · Fitzpatrick type ≈ ${skin.tone.fitz}`;
    $('#undertone').innerHTML = ['warm', 'neutral', 'cool'].map(k => `<div class="ut ${skin.undertone === k ? 'on' : ''}"><b>${HS.UNDERTONES[k].name}</b>${k === 'warm' ? 'golden' : k === 'cool' ? 'pink / rosy' : 'balanced'}</div>`).join('');
    const L = an.skin.lab;
    $('#skin-tech').textContent = `ITA° ${an.skin.ita.toFixed(1)} · CIELAB L* ${L.L.toFixed(0)} a* ${L.a.toFixed(1)} b* ${L.b.toFixed(1)} · hue ${an.skin.hue.toFixed(0)}°`
      + (an.skin.wb ? ' · lighting colour corrected using the whites of your eyes' : '');

    // adjust chips
    $('#adj-shape').innerHTML = HS.SHAPE_ORDER.map(k => `<button class="chip ${shapeKey === k ? 'on' : ''}" data-s="${k}"><canvas width="40" height="48"></canvas>${HS.FACE_SHAPES[k].name.split(' ')[0]}</button>`).join('');
    $$('#adj-shape .chip').forEach(c => {
      R.drawShapeIcon(c.querySelector('canvas'), c.dataset.s, '#ffb86b');
      c.addEventListener('click', () => { state.over.shape = c.dataset.s === an.face.shape ? null : c.dataset.s; refreshAfterAdjust(); });
    });
    $('#adj-undertone').innerHTML = ['warm', 'neutral', 'cool'].map(k => `<button class="chip ${skin.undertone === k ? 'on' : ''}" data-u="${k}">${HS.UNDERTONES[k].name}</button>`).join('');
    $$('#adj-undertone .chip').forEach(c => c.addEventListener('click', () => {
      state.over.undertone = c.dataset.u === an.skin.undertone ? null : c.dataset.u; state.colourIdx = 0; refreshAfterAdjust();
    }));
    $('#adj-hair').innerHTML = Object.entries(HS.HAIR_TYPES).map(([k, v]) => `<button class="chip ${state.hairType === k ? 'on' : ''}" data-h="${k}">${v.name}</button>`).join('');
    $$('#adj-hair .chip').forEach(c => c.addEventListener('click', () => { state.hairType = c.dataset.h; refreshAfterAdjust(); }));
  }
  function refreshAfterAdjust() {
    const open = $('.adjust').open;
    state.selId = null;
    if (state.gender === 'male') state.beard = HS.BEARD_FOR_SHAPE[effShape()].recs[0];
    renderResults();
    $('.adjust').open = open;
  }

  /* ---------------- barber card ---------------- */
  function renderBarber() {
    const r = currentRank(), st = r.style;
    $('#barber-style').textContent = st.name;
    $('#barber-ask').textContent = '“' + st.ask + '”';
    const shape = HS.FACE_SHAPES[effShape()].name, ht = HS.HAIR_TYPES[state.hairType].name;
    const colour = colourOptions()[state.colourIdx];
    $('#barber-facts').innerHTML = [
      ['Clippers / lengths', st.guards], ['Face shape', shape], ['Hair texture', ht],
      ['Colour', colour.natural ? 'Keep natural' : colour.name], ['Next trim', st.trim]
    ].map(([k, v]) => `<div class="fact"><small>${k}</small><b>${v}</b></div>`).join('');
    $('#barber-steps').innerHTML = st.steps.map(s => `<li><span>${s}</span></li>`).join('');
    const bb = $('#barber-beard');
    if (state.gender === 'male' && state.beard && state.beard !== 'none') {
      const b = HS.BEARDS[state.beard];
      bb.hidden = false; bb.innerHTML = `<b>Beard — ${b.name}:</b> ${b.barber}`;
    } else bb.hidden = true;
    // small preview image for the card (the realistic try-on if we have one)
    $('#barber-img').src = cardImage(330, 396).toDataURL('image/jpeg', 0.9);
  }

  function cardImage(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const an = state.analysis, res = state.raw.photo && aiResult('front');
    if (res) drawCover(c.getContext('2d'), res.img, w, h);
    else if (state.raw.photo) drawCover(c.getContext('2d'), beforeCanvas('front'), w, h);
    else R.drawAvatar(c, an.model, currentRank().style, { skin: an.skin.hex, hair: hairColour(), tex: state.hairType, gender: state.gender, beard: state.beard, box: { x0: -2.0, x1: 2.0, y0: -2.6, y1: 2.2 } });
    return c;
  }

  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = [];
    let line = '';
    words.forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  /* builds a tall PNG "barber card" you can show on your phone */
  function buildCardCanvas() {
    const r = currentRank(), st = r.style, an = state.analysis;
    const Wd = 1080, pad = 70, inner = Wd - pad * 2;
    const c = document.createElement('canvas'); c.width = Wd; c.height = 4000;
    const ctx = c.getContext('2d');
    const serif = 'Georgia, "Times New Roman", serif', sans = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    const draw = (measureOnly) => {
      let y = pad;
      if (!measureOnly) {
        ctx.fillStyle = '#fbf7f2'; ctx.fillRect(0, 0, Wd, c.height);
        const g = ctx.createLinearGradient(0, 0, Wd, 0); g.addColorStop(0, '#ffb86b'); g.addColorStop(1, '#ff6f9c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, 16);
      }
      ctx.fillStyle = '#b4532a'; ctx.font = `700 26px ${sans}`;
      if (!measureOnly) ctx.fillText('HAIRYSTYLO · BARBER CARD', pad, y + 26);
      y += 60;
      // avatar
      const av = cardImage(600, 720);
      if (!measureOnly) { ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(Wd - pad - 300, y, 300, 360, 24) : ctx.rect(Wd - pad - 300, y, 300, 360); ctx.clip(); ctx.drawImage(av, Wd - pad - 300, y, 300, 360); ctx.restore(); }
      ctx.fillStyle = '#1d1418'; ctx.font = `500 64px ${serif}`;
      const nameLines = wrap(ctx, st.name, inner - 340);
      nameLines.forEach((l, i) => { if (!measureOnly) ctx.fillText(l, pad, y + 64 + i * 72); });
      let ty = y + 64 + nameLines.length * 72 + 10;
      ctx.font = `500 28px ${sans}`; ctx.fillStyle = '#6b5d58';
      const facts = [`Face shape: ${HS.FACE_SHAPES[effShape()].name}`, `Hair: ${HS.HAIR_TYPES[state.hairType].name}`, `Lengths: ${st.guards}`, `Next trim: ${st.trim}`];
      facts.forEach(f => wrap(ctx, f, inner - 340).forEach(l => { if (!measureOnly) ctx.fillText(l, pad, ty); ty += 40; }));
      y = Math.max(ty, y + 380) + 20;
      // say this box
      ctx.font = `600 34px ${sans}`;
      const ask = wrap(ctx, '“' + st.ask + '”', inner - 60);
      const boxH = 70 + ask.length * 46;
      if (!measureOnly) {
        ctx.fillStyle = '#f2e6dc'; ctx.fillRect(pad, y, inner, boxH);
        ctx.fillStyle = '#ff8f87'; ctx.fillRect(pad, y, 10, boxH);
        ctx.fillStyle = '#b4532a'; ctx.font = `700 26px ${sans}`; ctx.fillText('SAY THIS', pad + 34, y + 44);
        ctx.fillStyle = '#1d1418'; ctx.font = `600 34px ${sans}`;
        ask.forEach((l, i) => ctx.fillText(l, pad + 34, y + 92 + i * 46));
      }
      y += boxH + 50;
      ctx.fillStyle = '#b4532a'; ctx.font = `700 26px ${sans}`;
      if (!measureOnly) ctx.fillText('STEP BY STEP', pad, y);
      y += 30;
      ctx.font = `400 31px ${sans}`;
      st.steps.forEach((s, i) => {
        const lines = wrap(ctx, s, inner - 80);
        if (!measureOnly) {
          ctx.fillStyle = '#1d1418'; ctx.beginPath(); ctx.arc(pad + 22, y + 26, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = `700 24px ${sans}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), pad + 22, y + 35); ctx.textAlign = 'left';
          ctx.fillStyle = '#2a2024'; ctx.font = `400 31px ${sans}`;
          lines.forEach((l, j) => ctx.fillText(l, pad + 70, y + 36 + j * 42));
        }
        y += lines.length * 42 + 22;
      });
      if (state.gender === 'male' && state.beard && state.beard !== 'none') {
        const b = HS.BEARDS[state.beard];
        y += 36;
        ctx.fillStyle = '#b4532a'; ctx.font = `700 26px ${sans}`; if (!measureOnly) ctx.fillText('BEARD — ' + b.name.toUpperCase(), pad, y);
        y += 14; ctx.font = `400 31px ${sans}`; ctx.fillStyle = '#2a2024';
        wrap(ctx, b.barber, inner).forEach(l => { y += 42; if (!measureOnly) ctx.fillText(l, pad, y); });
        y += 20;
      }
      y += 30;
      ctx.font = `400 24px ${sans}`; ctx.fillStyle = '#8a7d78';
      if (!measureOnly) ctx.fillText('Made with HairyStylo — AI face-shape haircut stylist', pad, y);
      return y + pad;
    };
    const h = draw(true);
    c.height = h;
    draw(false);
    return c;
  }
  $('#btn-download').addEventListener('click', () => {
    const c = buildCardCanvas();
    c.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'hairystylo-barber-card.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  });
  $('#btn-print').addEventListener('click', () => window.print());
  if (navigator.canShare) {
    try {
      const probe = new File([new Blob(['x'])], 'x.png', { type: 'image/png' });
      if (navigator.canShare({ files: [probe] })) $('#btn-share').hidden = false;
    } catch (e) { /* sharing files not supported */ }
  }
  $('#btn-share').addEventListener('click', () => {
    buildCardCanvas().toBlob(async blob => {
      try {
        await navigator.share({ files: [new File([blob], 'hairystylo-barber-card.png', { type: 'image/png' })], title: 'My HairyStylo haircut', text: currentRank().style.ask });
      } catch (e) { /* user cancelled */ }
    }, 'image/png');
  });

  /* ---------------- misc ---------------- */
  function celebrate() {
    const host = document.createElement('div');
    host.className = 'sparkles';
    document.body.appendChild(host);
    setTimeout(() => host.remove(), 2000);
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.textContent = ['✦', '✧', '•'][i % 3];
      s.style.cssText = `position:fixed;left:${50 + (Math.random() - 0.5) * 70}vw;top:${12 + Math.random() * 25}vh;color:${i % 2 ? '#ffb86b' : '#ff6f9c'};font-size:${10 + Math.random() * 18}px;transition:transform 1.6s ease-out,opacity 1.6s ease-out;`;
      host.appendChild(s);
      requestAnimationFrame(() => { s.style.transform = `translate(${(Math.random() - 0.5) * 220}px, ${60 + Math.random() * 160}px) rotate(${Math.random() * 180}deg)`; s.style.opacity = '0'; });
      setTimeout(() => s.remove(), 1800);
    }
  }
  $('#btn-rescan').addEventListener('click', () => { $('#cam-error').hidden = true; show('camera'); });
  $('#btn-restart').addEventListener('click', restart);
  function restart() {
    if (state.scan) state.scan.cancel();
    HS.Scanner.stopCamera($('#video'));
    Object.assign(state, { gender: null, hairType: null, lengthPref: 'any', maintPref: 'any', raw: null, analysis: null, selId: null });
    $$('.choice').forEach(c => c.classList.remove('on'));
    $('#hair-next').disabled = true;
    $$('#length-chips .chip').forEach((c, i) => c.classList.toggle('on', i === 0));
    $$('#maint-chips .chip').forEach((c, i) => c.classList.toggle('on', i === 0));
    $('#cam-error').hidden = true;
    show('gender');
  }

  // testing hook: ?demo=male|female jumps straight to a sample result
  const qp = new URLSearchParams(location.search);
  if (qp.get('demo')) {
    state.gender = qp.get('demo') === 'female' ? 'female' : 'male';
    state.hairType = qp.get('hair') || 'straight';
    state.demoShape = qp.get('shape');
    $('#demo-btn').click();
  }
  window.HairyStyloState = state; // handy for debugging in the console
})();
