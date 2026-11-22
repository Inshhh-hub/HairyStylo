(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { gender: 'male', photo: null, stream: null, tryonBlocked: false };

  // Safe DOM builder: all text from the model goes in via textContent (never innerHTML).
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function str(v, d) { return (typeof v === 'string' && v.trim()) ? v.trim() : (d || ''); }

  function show(id) {
    ['stepCapture', 'stepLoading', 'stepResults'].forEach(function (s) { $(s).hidden = (s !== id); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function setMsg(text, isErr) {
    var m = $('captureMsg');
    m.textContent = text || '';
    m.className = 'msg' + (isErr ? ' err' : '');
  }

  // ---- setup check: warn if the Gemini key hasn't been added in Vercel ----
  fetch('/api/health').then(function (r) { return r.json(); }).then(function (j) {
    if (j && j.keyConfigured === false) {
      var b = $('banner');
      b.hidden = false;
      b.textContent = 'Setup needed: add your free Gemini key in Vercel (Settings > Environment Variables > GEMINI_API_KEY), then redeploy. Until then the scan cannot run.';
    }
  }).catch(function () { /* running without the API (e.g. opened as a plain file) */ });

  // ---- gender chips ----
  $('genderChips').addEventListener('click', function (e) {
    var t = e.target.closest('.chip');
    if (!t) return;
    state.gender = t.dataset.g;
    Array.prototype.forEach.call(this.children, function (c) {
      var on = c === t;
      c.classList.toggle('on', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  });

  // ---- camera / upload ----
  function stopCamera() {
    if (state.stream) { state.stream.getTracks().forEach(function (t) { t.stop(); }); state.stream = null; }
    $('video').hidden = true;
    $('video').srcObject = null;
    $('btnSnap').hidden = true;
    $('btnCamera').hidden = false;
  }

  $('btnCamera').addEventListener('click', function () {
    setMsg('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg('Camera is not available in this browser. Use "Upload photo" instead.', true);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then(function (stream) {
        state.stream = stream;
        var v = $('video');
        v.srcObject = stream;
        v.hidden = false;
        $('preview').hidden = true;
        $('placeholder').hidden = true;
        $('btnSnap').hidden = false;
        $('btnCamera').hidden = true;
        $('btnAnalyze').disabled = true;
        $('btnRetake').hidden = true;
        state.photo = null;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      })
      .catch(function () {
        setMsg('Could not open the camera. Allow camera access in your browser, or use "Upload photo".', true);
      });
  });

  // Downscale to max 1024px JPEG so the upload is small, fast and under Vercel's body limit.
  function toJpeg(source, w, h) {
    var max = 1024, s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  }
  function setPhoto(dataUrl) {
    state.photo = dataUrl;
    var p = $('preview');
    p.src = dataUrl; p.hidden = false;
    $('video').hidden = true;
    $('placeholder').hidden = true;
    $('btnAnalyze').disabled = false;
    $('btnRetake').hidden = false;
    $('btnCamera').hidden = false;
    $('btnSnap').hidden = true;
    setMsg('Looks good? Tap "Analyse my face".');
  }

  $('btnSnap').addEventListener('click', function () {
    var v = $('video');
    if (!v.videoWidth) { setMsg('Camera is still starting, try again in a second.', true); return; }
    var url = toJpeg(v, v.videoWidth, v.videoHeight);
    stopCamera();
    setPhoto(url);
  });

  $('fileInput').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setMsg('Please choose an image file.', true); return; }
    stopCamera();
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function () {
      try { setPhoto(toJpeg(img, img.naturalWidth, img.naturalHeight)); }
      catch (e) { setMsg('Could not read that image. Try a JPG or PNG.', true); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { setMsg('Could not read that image. Try a JPG or PNG.', true); URL.revokeObjectURL(url); };
    img.src = url;
  });

  $('btnRetake').addEventListener('click', function () {
    state.photo = null;
    $('preview').hidden = true;
    $('placeholder').hidden = false;
    $('btnAnalyze').disabled = true;
    $('btnRetake').hidden = true;
    setMsg('');
    $('btnCamera').click();
  });

  $('btnAgain').addEventListener('click', function () {
    state.photo = null;
    state.tryonBlocked = false;
    $('preview').hidden = true;
    $('placeholder').hidden = false;
    $('btnAnalyze').disabled = true;
    $('btnRetake').hidden = true;
    setMsg('');
    show('stepCapture');
  });

  // ---- API ----
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { /* not JSON */ }
          if (!j) j = { ok: false, message: r.status === 413 ? 'Photo too large. Please retake it.' : 'Server error (' + r.status + '). Please try again.' };
          return j;
        });
      });
  }

  $('btnAnalyze').addEventListener('click', function () {
    if (!state.photo) return;
    show('stepLoading');
    post('/api/analyze', { image: state.photo, gender: state.gender })
      .then(function (j) {
        if (!j.ok) { show('stepCapture'); setMsg(j.message || 'Something went wrong. Please try again.', true); return; }
        var r = j.result || {};
        if (r.face_found === false || !Array.isArray(r.recommendations) || !r.recommendations.length) {
          show('stepCapture');
          setMsg(str(r.photo_issue, 'No clear face found. Retake with your face centred, well lit and hair visible.'), true);
          return;
        }
        renderResults(r);
        show('stepResults');
      })
      .catch(function () {
        show('stepCapture');
        setMsg('Network problem. Check your connection and try again.', true);
      });
  });

  // ---- results ----
  function fact(label, value, swatch) {
    var b = h('b');
    if (swatch && /^#[0-9a-fA-F]{6}$/.test(swatch)) {
      var s = h('i', { class: 'swatch' }); s.style.background = swatch; b.appendChild(s);
    }
    b.appendChild(document.createTextNode(value));
    return h('div', { class: 'fact' }, h('span', { text: label }), b);
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function renderResults(r) {
    $('resPhoto').src = state.photo;
    var facts = $('facts'); facts.textContent = '';
    var skin = r.skin_tone || {}, hair = r.hair || {};
    facts.appendChild(fact('Face shape', cap(str(r.face_shape, 'n/a'))));
    facts.appendChild(fact('Skin tone', str(skin.label, 'n/a') + (skin.undertone ? ' (' + skin.undertone + ')' : ''), skin.hex));
    facts.appendChild(fact('Hair', [str(hair.type), str(hair.density)].filter(Boolean).join(', ') || 'n/a'));
    if (hair.hairline) facts.appendChild(fact('Hairline', str(hair.hairline)));
    $('shapeReason').textContent = str(r.face_shape_reason);

    var box = $('recs'); box.textContent = '';
    r.recommendations.slice(0, 4).forEach(function (rec, i) { box.appendChild(recCard(rec, i)); });

    var ex = $('extras'); ex.textContent = '';
    if (Array.isArray(r.avoid) && r.avoid.length) {
      ex.appendChild(h('h2', { text: 'Better to avoid' }));
      var ul = h('ul', { class: 'clean' });
      r.avoid.slice(0, 4).forEach(function (a) { ul.appendChild(h('li', { text: str(a) })); });
      ex.appendChild(ul);
    }
    if (r.color_tip) {
      ex.appendChild(h('h2', { text: 'Colour tip', style: 'margin-top:14px' }));
      ex.appendChild(h('p', { class: 'sub', text: str(r.color_tip) }));
    }
    ex.hidden = !ex.childNodes.length;
  }

  function barberText(rec) {
    var b = rec.barber || {};
    return ['Haircut: ' + str(rec.name),
      'Sides: ' + str(b.sides), 'Top: ' + str(b.top),
      'Back and neckline: ' + str(b.back_and_neckline), 'Finish: ' + str(b.finish)].join('\n');
  }

  function recCard(rec, i) {
    var b = rec.barber || {};
    var card = h('article', { class: 'rec' + (i === 0 ? ' best' : '') });
    var title = h('h3', null, str(rec.name, 'Haircut ' + (i + 1)));
    if (i === 0) title.appendChild(h('span', { class: 'pill gold', text: 'Best match' }));
    if (rec.maintenance) title.appendChild(h('span', { class: 'pill', text: str(rec.maintenance) + ' upkeep' }));
    card.appendChild(title);
    card.appendChild(h('p', { text: str(rec.why) }));

    var dl = h('dl');
    [['Sides', b.sides], ['Top', b.top], ['Back / neck', b.back_and_neckline], ['Finish', b.finish]].forEach(function (p) {
      if (p[1]) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: str(p[1]) })); }
    });
    card.appendChild(h('div', { class: 'barber' }, h('h4', { text: 'Show this to your barber' }), dl));

    var out = h('div', { class: 'tryout' });
    var row = h('div', { class: 'row' });
    var copyBtn = h('button', { class: 'btn ghost', type: 'button', text: 'Copy barber notes' });
    copyBtn.addEventListener('click', function () { copyText(barberText(rec), copyBtn); });
    var tryBtn = h('button', { class: 'btn', type: 'button', text: 'See it on my photo' });
    tryBtn.addEventListener('click', function () { tryOn(rec, tryBtn, out); });
    row.appendChild(tryBtn); row.appendChild(copyBtn);
    card.appendChild(row);
    card.appendChild(out);
    return card;
  }

  function copyText(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else {
      var ta = h('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta); done();
    }
  }

  function tryOn(rec, btn, out) {
    out.textContent = '';
    if (state.tryonBlocked) {
      out.appendChild(h('p', { class: 'msg', text: state.tryonMsg || 'Photo try-on is not enabled on this Gemini key.' }));
      return;
    }
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = 'Styling your photo...';
    out.appendChild(h('p', { class: 'msg', text: 'Gemini is editing your real photo. This can take up to 30 seconds.' }));
    post('/api/tryon', { image: state.photo, style: str(rec.name), look: str(rec.look), gender: state.gender })
      .then(function (j) {
        out.textContent = '';
        btn.disabled = false; btn.textContent = oldText;
        if (j.ok && j.image) {
          var before = h('figure', null, h('img', { src: state.photo, alt: 'Your photo' }), h('figcaption', { text: 'Now' }));
          var after = h('figure', null, h('img', { src: j.image, alt: 'You with ' + str(rec.name) }), h('figcaption', { text: str(rec.name) }));
          out.appendChild(h('div', { class: 'pair' }, before, after));
          return;
        }
        if (j.code === 'TRYON_NEEDS_BILLING') { state.tryonBlocked = true; state.tryonMsg = j.message; }
        out.appendChild(h('p', { class: 'msg' + (j.code === 'TRYON_NEEDS_BILLING' ? '' : ' err'), text: j.message || 'Try-on failed. Please try again.' }));
      })
      .catch(function () {
        out.textContent = '';
        btn.disabled = false; btn.textContent = oldText;
        out.appendChild(h('p', { class: 'msg err', text: 'Network problem. Please try again.' }));
      });
  }

  window.addEventListener('pagehide', stopCamera);
})();
