# HairyStylo

Scan your face (camera, selfie or photo), get your face shape, skin tone and the haircuts that suit you, a step-by-step barber card, and a realistic try-on on your own photo.

- The face scan, face-shape and skin-tone analysis and haircut matching run in your browser (MediaPipe).
- The realistic try-on runs through a protected server function (`api/tryon.js`) using a free image model (Cloudflare Workers AI, FLUX.2 klein). No API key is ever typed into, or stored in, the browser.
- There is no cartoon or illustration on your face. The only sketches are the small style thumbnails, and the built-in "sample face" demo.

## Deploy on Vercel

Vercel imports from Git, so: unzip, upload all files (including the `api` folder) to a GitHub repo, then Vercel > Add New > Project > import it > Deploy (keep all defaults, framework "Other").

## Turn on the free realistic try-on (Cloudflare)

1. Sign up free at https://dash.cloudflare.com (no card needed).
2. Dashboard > AI > Workers AI > "Use REST API": copy your **Account ID** and click "Create a Workers AI API Token".
3. In Vercel > Settings > Environment Variables add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
4. Redeploy (commit any change, or Deployments > ... > Redeploy).
5. Open `https://YOUR-SITE.vercel.app/api/health`: it should show `"tryonCloudflare":true`.

Cloudflare's free allowance is 10,000 neurons per day. One try-on at the default size costs roughly 60 neurons (about 150 per day). When it is used up the page says to try again tomorrow.

Notes
- The free model only accepts small input photos, so a 480px copy of your photo is sent and the result is about 512 x 672. Quality varies, so check a few results.
- Optional fallback: set `GEMINI_API_KEY` (from aistudio.google.com/apikey). Gemini image editing has no free tier, so it only works if that key's Google project has billing. Force a provider with `TRYON_PROVIDER=cloudflare` or `gemini`.
- `TRYON_OUT_LONG` (default 672) sets the output size; bigger is sharper but uses more of the free allowance.
- The camera needs HTTPS, which Vercel provides.
- Photos are sent only when a try-on is created, are not stored by this site, and a basic per-IP rate limit protects your free allowance.
