const { getKey, send } = require('./_gemini');

// Tells the page what is configured in Vercel (never returns any secret).
module.exports = (req, res) => {
  const cf = !!((process.env.CLOUDFLARE_ACCOUNT_ID || '').trim() && (process.env.CLOUDFLARE_API_TOKEN || '').trim());
  send(res, 200, { ok: true, keyConfigured: getKey().length > 10, tryonCloudflare: cf });
};
