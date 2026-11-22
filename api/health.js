const { getKey, send } = require('./_gemini');

// Tells the page which try-on providers are configured in Vercel (never returns any secret).
module.exports = (req, res) => {
  const cf = !!((process.env.CLOUDFLARE_ACCOUNT_ID || '').trim() && (process.env.CLOUDFLARE_API_TOKEN || '').trim());
  const gem = getKey().length > 10;
  send(res, 200, { ok: true, tryonCloudflare: cf, keyConfigured: gem, tryonReady: cf || gem });
};
