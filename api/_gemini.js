// Shared helpers for the serverless functions. Files starting with "_" are not exposed as routes by Vercel.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

async function callGemini(model, body, key, timeoutMs) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs || 25000);
  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* non-JSON error body */ }
    return { status: r.status, ok: r.ok, json, text };
  } catch (e) {
    return { status: e.name === 'AbortError' ? 504 : 502, ok: false, json: null, text: String(e && e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

// Accepts a data URL (jpeg/png/webp). Returns { mime, data } or null.
function parseImage(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  if (m[2].length > 3500000) return null; // ~2.6MB binary; Vercel's body limit is 4.5MB
  return { mime: m[1], data: m[2] };
}

// Best-effort per-instance rate limit so a public URL can't burn through the free quota.
const hits = new Map();
function rateLimited(req, max, windowMs) {
  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket && req.socket.remoteAddress || 'x').trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

function apiMessage(json, fallback) {
  return (json && json.error && json.error.message) ? String(json.error.message).slice(0, 300) : fallback;
}

module.exports = { getKey, callGemini, parseImage, rateLimited, send, readBody, apiMessage };
