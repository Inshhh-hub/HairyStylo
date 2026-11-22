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

## What is free and what is not

| Feature | Model | Free tier |
|---|---|---|
| Face shape, skin tone, hair type, haircut list, barber instructions | gemini-2.5-flash (falls back to other free Flash / Flash-Lite models) | Yes, free with rate limits |
| "See it on my photo" (realistic hair edit on your real photo) | gemini-3.1-flash-image | No. Google lists no free tier for any image-output Gemini model (checked Nov 2026) |

If the key has no image access, the try-on button explains that and the rest of the app keeps working. To enable realistic try-on, turn on billing for the key's Google Cloud project (roughly a few cents per image) and redeploy. You can pick another model with `GEMINI_IMAGE_MODEL`; change the analysis model with `GEMINI_TEXT_MODEL`.

## Notes
- The camera needs HTTPS, which Vercel provides.
- Photos are resized in the browser to 1024px, sent to your Vercel function, forwarded to Gemini and not stored. Free-tier Gemini inputs may be used by Google to improve its products.
- A basic per-IP rate limit protects your free quota if the link is shared.
- Local run: `npx vercel dev` (needs a `.env` copied from `.env.example`).
