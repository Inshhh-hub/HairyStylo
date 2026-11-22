/* =====================================================================
   HairyStylo — scanner.js
   ---------------------------------------------------------------------
   1. Loads the MediaPipe Face Landmarker (a deep-learning model by
      Google) — from the local ./vendor folder if you downloaded it,
      otherwise from the internet (CDN).
   2. Opens the front camera, finds your face ~30 times a second,
      checks the pose/lighting, and collects ~36 good frames.
   3. Or analyses a single uploaded selfie.
   Everything runs in your browser. No image is ever uploaded.
   ===================================================================== */
window.HS = window.HS || {};

HS.Scanner = (function () {
  'use strict';
  const MP_VERSION = '0.10.14';
  const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const TARGET_FRAMES = 36;      // frames to measure
  const SKIN_EVERY = 3;          // sample skin colour every Nth good frame
  const STREAK_TO_START = 8;     // good frames in a row before measuring starts

  let visionPromise = null;
  const landmarkers = {};

  async function hasLocalVendor() {
    if (location.protocol === 'file:') return false;
    try { const r = await fetch('vendor/face_landmarker.task', { method: 'HEAD', cache: 'no-store' }); return r.ok; }
    catch (e) { return false; }
  }

  function loadVision() {
    if (visionPromise) return visionPromise;
    visionPromise = (async () => {
      const local = await hasLocalVendor();
      const base = local ? new URL('vendor/', location.href).href : CDN + '/';
      const mod = await import(base + 'vision_bundle.mjs');
      const fileset = await mod.FilesetResolver.forVisionTasks(base + 'wasm');
      return { mod, fileset, modelUrl: local ? base + 'face_landmarker.task' : MODEL_URL, local };
    })();
    visionPromise.catch(() => { visionPromise = null; });
    return visionPromise;
  }

  /* one landmarker per mode ("VIDEO" for the live camera, "IMAGE" for photos).
     We cache the promise so two callers never create two models. */
  function getLandmarker(mode, forceCPU) {
    const key = mode + (forceCPU ? '-cpu' : '');
    if (landmarkers[key]) return landmarkers[key];
    landmarkers[key] = (async () => {
      const { mod, fileset, modelUrl } = await loadVision();
      const opts = delegate => ({
        baseOptions: { modelAssetPath: modelUrl, delegate },
        runningMode: mode, numFaces: 1,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5
      });
      if (forceCPU) return mod.FaceLandmarker.createFromOptions(fileset, opts('CPU'));
      try { return await mod.FaceLandmarker.createFromOptions(fileset, opts('GPU')); }
      catch (e) { console.warn('GPU not available, using CPU', e); return mod.FaceLandmarker.createFromOptions(fileset, opts('CPU')); }
    })();
    landmarkers[key].catch(() => { delete landmarkers[key]; });
    return landmarkers[key];
  }

  /* ---------------- camera ---------------- */
  async function startCamera(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error('Camera needs a secure page (https:// or localhost).'); e.name = 'InsecureContext'; throw e;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
    });
    video.srcObject = stream;
    video.muted = true; video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
    await video.play();
    await new Promise(r => { if (video.videoWidth) r(); else video.onloadedmetadata = () => r(); });
    return stream;
  }
  function stopCamera(video) {
    const s = video && video.srcObject;
    if (s) s.getTracks().forEach(t => t.stop());
    if (video) video.srcObject = null;
  }

  /* draw the face mesh on the overlay canvas */
  function drawOverlay(canvas, lm, progress, good) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!lm) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = good ? 'rgba(255,214,170,0.75)' : 'rgba(255,255,255,0.45)';
    const r = Math.max(1.2, W / 600);
    for (let i = 0; i < lm.length; i += 2) { ctx.fillRect(lm[i].x * W - r / 2, lm[i].y * H - r / 2, r, r); }
    const sil = HS.Analysis.IDX.silhouette;
    ctx.strokeStyle = good ? '#ffb86b' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(2, W / 320);
    ctx.shadowColor = '#ff7aa2'; ctx.shadowBlur = good ? 12 : 0;
    ctx.beginPath();
    sil.forEach((i, k) => { const x = lm[i].x * W, y = lm[i].y * H; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (progress > 0) {     // scanning line sweeping down the face
      const top = lm[10].y * H, bot = lm[152].y * H;
      const y = top + (bot - top) * ((progress * 3) % 1);
      const g = ctx.createLinearGradient(0, y - 30, 0, y + 4);
      g.addColorStop(0, 'rgba(255,122,162,0)'); g.addColorStop(1, 'rgba(255,184,107,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, y - 30, W, 34);
    }
  }

  /**
   * Live scan. Calls hooks.onStatus({phase, issues, progress}) while running,
   * resolves with the collected measurements.
   */
  function runLiveScan(video, overlay, hooks, gender) {
    let running = true, raf = 0, lastT = -1;
    let streak = 0, phase = 'aligning';
    const feats = [], skins = [];
    let best = null;
    const work = document.createElement('canvas');
    const wctx = work.getContext('2d', { willReadFrequently: true });
    let lightIssue = null, frameNo = 0;

    const promise = new Promise((resolve, reject) => {
      getLandmarker('VIDEO').then(first => {
        let lmk = first, errors = 0, switching = false;
        overlay.width = video.videoWidth; overlay.height = video.videoHeight;
        const sw = Math.min(640, video.videoWidth), sh = Math.round(sw * video.videoHeight / video.videoWidth);
        work.width = sw; work.height = sh;
        hooks.onStatus({ phase: 'aligning', issues: ['Looking for your face…'], progress: 0 });

        const loop = () => {
          if (!running) return;
          raf = requestAnimationFrame(loop);
          if (video.readyState < 2 || video.currentTime === lastT) return;
          lastT = video.currentTime;
          let res;
          try { res = lmk.detectForVideo(video, performance.now()); errors = 0; }
          catch (e) {
            console.warn(e);
            // some devices accept the GPU model but then fail every frame → switch to CPU once
            if (++errors > 15 && !switching) {
              switching = true;
              getLandmarker('VIDEO', true).then(c => { lmk = c; errors = 0; }).catch(reject);
            }
            return;
          }
          const lm = res && res.faceLandmarks && res.faceLandmarks[0];
          const W = video.videoWidth, H = video.videoHeight;
          frameNo++;
          if (!lm) {
            streak = 0;
            drawOverlay(overlay, null);
            hooks.onStatus({ phase, face: false, issues: ['No face found — look at the camera'], progress: feats.length / TARGET_FRAMES });
            return;
          }
          const q = HS.Analysis.checkFrame(lm, W, H);
          // quick lighting check every 6 frames
          if (frameNo % 6 === 0) {
            wctx.drawImage(video, 0, 0, work.width, work.height);
            const img = wctx.getImageData(0, 0, work.width, work.height);
            const s = HS.Analysis.analyzeSkinFrame(img, lm, gender);
            const Ls = s.regions.map(r => r.L);
            const meanL = Ls.length ? Ls.reduce((a, b) => a + b, 0) / Ls.length : 50;
            lightIssue = meanL < 22 ? 'Too dark — face a window or a lamp' : meanL > 90 ? 'Too bright — avoid direct light' : null;
          }
          const issues = q.issues.slice();
          if (lightIssue) issues.push(lightIssue);
          const good = q.ok && !lightIssue;
          streak = good ? streak + 1 : 0;
          if (phase === 'aligning' && streak >= STREAK_TO_START) phase = 'capturing';

          if (phase === 'capturing' && good) {
            feats.push(HS.Analysis.extractFeatures(lm, W, H));
            if (feats.length % SKIN_EVERY === 1) {
              wctx.drawImage(video, 0, 0, work.width, work.height);
              const img = wctx.getImageData(0, 0, work.width, work.height);
              skins.push(HS.Analysis.analyzeSkinFrame(img, lm, gender));
            }
            if (!best || q.poseScore < best.poseScore) {   // keep the straightest frame as your photo
              const c = best ? best.canvas : document.createElement('canvas');
              c.width = W; c.height = H;
              const cx = c.getContext('2d', { willReadFrequently: true });
              cx.setTransform(-1, 0, 0, 1, W, 0); cx.drawImage(video, 0, 0, W, H); cx.setTransform(1, 0, 0, 1, 0, 0);
              best = { canvas: c, lm: lm.map(p => ({ x: p.x, y: p.y, z: p.z })), poseScore: q.poseScore, W, H };
            }
          }
          const progress = feats.length / TARGET_FRAMES;
          drawOverlay(overlay, lm, phase === 'capturing' ? progress : 0, good);
          hooks.onStatus({ phase, face: true, light: !lightIssue, good, issues: good ? [] : issues, progress, pose: q });
          if (feats.length >= TARGET_FRAMES) {
            running = false; cancelAnimationFrame(raf);
            resolve({ features: HS.Analysis.medianFeatures(feats), frames: feats.length, skinFrames: skins, photo: best, mirrored: true });
          }
        };
        loop();
      }).catch(reject);
    });
    return { promise, cancel: () => { running = false; cancelAnimationFrame(raf); } };
  }

  /* single uploaded photo */
  async function analyzePhoto(file, gender) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not open that image.')); i.src = url; });
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const lmk = await getLandmarker('IMAGE');
      const res = lmk.detect(c);
      const lm = res && res.faceLandmarks && res.faceLandmarks[0];
      if (!lm) { const e = new Error('We could not find a face in that photo. Try a clear, front-facing selfie.'); e.name = 'NoFace'; throw e; }
      const q = HS.Analysis.checkFrame(lm, c.width, c.height);
      const skin = HS.Analysis.analyzeSkinFrame(ctx.getImageData(0, 0, c.width, c.height), lm, gender);
      return {
        features: HS.Analysis.extractFeatures(lm, c.width, c.height), frames: 1, skinFrames: [skin],
        photo: { canvas: c, lm, W: c.width, H: c.height }, mirrored: false,
        warnings: q.straight ? [] : ['Your head was turned or tilted in the photo — results may be less accurate.']
      };
    } finally { URL.revokeObjectURL(url); }
  }

  return { loadVision, getLandmarker, startCamera, stopCamera, runLiveScan, analyzePhoto, TARGET_FRAMES };
})();
