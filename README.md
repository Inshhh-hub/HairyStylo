# HairyStylo

Scan your face (camera or photo) and get your face shape, skin tone, hair type, the 4 best haircuts, and plain instructions to show your barber. Analysis is done by Google Gemini. No cartoon or overlay effects are ever drawn on your face.

## Deploy on Vercel (5 minutes)

Vercel's dashboard imports from Git, it has no "upload ZIP" button. Pick one:

**A. GitHub (easiest, no tools)**
1. Unzip this file. On github.com click New repository, then "uploading an existing file", drag in everything from the unzipped folder (including the `api` folder), commit.
2. On vercel.com: Add New > Project > import that repo > Deploy (leave every setting as it is).

**B. Vercel CLI**
1. Unzip, open a terminal in the folder, run `npx vercel` and answer the prompts, then `npx vercel --prod`.

## Attach Gemini (required, free)

1. Get a free key at https://aistudio.google.com/apikey
2. Vercel > your project > Settings > Environment Variables > add `GEMINI_API_KEY` = your key (tick Production, Preview, Development).
3. Deployments > latest > Redeploy (env vars apply only to new deployments).

The key lives only on Vercel's server (`api/*.js`); it is never in the page and never in this ZIP. Open `https://YOUR-SITE.vercel.app/api/health` to check: it should say `"keyConfigured":true`.

## Realistic photo try-on (free, Cloudflare)

The "See it on my photo" button edits your real photo with Cloudflare Workers AI (FLUX.2 klein 4B). Cloudflare gives a free daily allowance (10,000 neurons per day, no card needed). Setup:

1. Sign up free at https://dash.cloudflare.com
2. Open the Workers AI page (dashboard > AI > Workers AI), choose "Use REST API". It shows your **Account ID** and a button to **Create a Workers AI API Token**. Create it and copy the token.
3. In Vercel > Settings > Environment Variables add:
   - `CLOUDFLARE_ACCOUNT_ID` = your account id
   - `CLOUDFLARE_API_TOKEN` = the token
4. Redeploy. Check `/api/health`: it should show `"tryonCloudflare":true`.

Notes: the free model only accepts small input photos, so the site sends a 480px copy and the result is about that size. Quality has not been tested against real photos by the author: check a few results before relying on it.

If Cloudflare is not set or fails, the site falls back to Gemini image editing (only works if the Gemini key's Google project has billing). Force a provider with `TRYON_PROVIDER=cloudflare` or `gemini`.

## What is free and what is not

| Feature | Provider | Cost |
|---|---|---|
| Face shape, skin tone, hair, haircut list, barber notes | Gemini Flash models | Free tier (rate limits) |
| Photo try-on | Cloudflare FLUX.2 klein 4B | Free daily allowance, then it stops until tomorrow |
| Photo try-on (optional fallback) | Gemini image models | Paid only (no Gemini image model has a free tier) |

## Notes
- The camera needs HTTPS, which Vercel provides.
- Photos are resized in the browser to 1024px, sent to your Vercel function, forwarded to Gemini and not stored. Free-tier Gemini inputs may be used by Google to improve its products.
- A basic per-IP rate limit protects your free quota if the link is shared.
- Local run: `npx vercel dev` (needs a `.env` copied from `.env.example`).
