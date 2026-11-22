const { getKey, send } = require('./_gemini');

// Tells the page whether the Gemini key has been added in Vercel (never returns the key itself).
module.exports = (req, res) => {
  send(res, 200, { ok: true, keyConfigured: getKey().length > 10 });
};
