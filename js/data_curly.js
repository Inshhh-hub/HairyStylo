/* =====================================================================
   HairyStylo — data_curly.js
   Extra hairstyles made for NATURALLY CURLY and COILY hair (men + women).
   They are added to the same list as data.js and ranked by the same
   recommender (face-shape fit + hair-type fit + length + upkeep).
   Barber notes follow standard curly / textured-hair cutting practice:
   cut curls dry, work curl by curl, never brush dry coils, protect at night.
   ===================================================================== */
(function () {
  'use strict';
  const F = (o, r, s, ob, h, d, t) => ({ oval: o, round: r, square: s, oblong: ob, heart: h, diamond: d, triangle: t });
  const TALL   = F(.9, .88, .85, .45, .75, .75, .85);   // height on top: great for round/square, less for long faces
  const FULL   = F(.95, .7, .9, .85, .88, .88, .7);     // soft volume at the sides: balances long/narrow faces
  const CLOSE  = F(.95, .7, .85, .7, .8, .85, .8);      // short, close shapes
  const LONG   = F(.9, .8, .85, .7, .85, .85, .75);
  const FRINGE = F(.85, .75, .85, .9, .9, .7, .7);
  const CARE = 'Sulfate-free shampoo, always condition';

  const list = [
  /* ------------------------------ MEN · CURLY ------------------------------ */
  {
    id: 'm_curlyfringe', gender: 'male', name: 'Curly Fringe with Skin Fade', length: 'short', maint: 2, vibe: 'Trendy · Natural',
    fit: FRINGE, hair: { straight: .05, wavy: .8, curly: 1, coily: .55 }, tags: ['fringe', 'soft-texture', 'tight-sides'],
    desc: 'Your natural curls kept long on top and falling forward into a soft fringe, with a clean fade on the sides so the curls stand out.',
    ask: 'Curly fringe — mid skin fade on the sides, keep 7–10 cm of natural curl on top, cut dry so the curls fall forward into a soft fringe just above my eyebrows, no thinning shears on the curls.',
    guards: 'Mid skin fade · 7–10 cm curls on top',
    steps: [
      'Cut the curls DRY, in their natural pattern, so the length does not spring up after the cut.',
      'Sides and back: mid skin fade (#0 → #2 → #3), blended into the curls with a small guard or scissor-over-comb.',
      'Top: leave 7–10 cm and cut curl by curl (not in straight lines). Keep the front longest so it falls forward.',
      'Shape the fringe to sit just above the eyebrows — cut each front curl once when dry.',
      'Take weight out from inside the curl clumps (point-cut), not from the ends.',
      'Neaten the edges and temples.'
    ],
    styling: ['Apply curl cream to soaking-wet hair and scrunch', 'Add a little gel and let it dry without touching', 'Diffuse on low or air-dry, then scrunch out the crunch'],
    products: 'Curl cream, light gel, diffuser', trim: 'Every 3–4 weeks',
    render: { top: 'curly', vol: .4, sides: 'fade', fringe: 'brow', texture: 'curly' }
  },
  {
    id: 'm_curlymohawk', gender: 'male', name: 'Curly Burst Fade Mohawk', length: 'short', maint: 2, vibe: 'Bold · Statement',
    fit: TALL, hair: { straight: .0, wavy: .45, curly: 1, coily: .8 }, tags: ['height', 'tight-sides', 'crown-volume'],
    desc: 'A curly crest of natural curls on top with a burst fade curving round the ears — loud, fun and made for curls.',
    ask: 'Curly mohawk with a burst fade — burst fade curving around the ears from #0 to #2, leave 6–9 cm of natural curl in a centre strip on top, blend the strip into the sides, keep the curls free and defined.',
    guards: 'Burst fade #0 → #2 · 6–9 cm curls on top',
    steps: [
      'Cut dry, in the natural curl pattern.',
      'Burst fade: start the curve behind the ear and fade #0 → #1 → #2 around the ear toward the temple, leaving the back longer.',
      'Keep a centre strip of curls on top (about 6–9 cm), wider at the front and narrower at the back.',
      'Blend the edge of the strip into the fade so there is no hard line.',
      'Point-cut the ends of the curls so they clump and keep the crest shape.',
      'Clean up the neckline and line the temples.'
    ],
    styling: ['Curl cream or curl gel on wet hair, scrunch upward', 'Let dry (or diffuse) with the curls lifted at the roots', 'Fluff with fingers — never brush dry curls'],
    products: 'Curl gel, curl cream, diffuser', trim: 'Every 3 weeks',
    render: { top: 'curly', vol: .5, sides: 'fade', fringe: 'crop', texture: 'curly' }
  },
  {
    id: 'm_curlymedium', gender: 'male', name: 'Medium Curly Layers', length: 'medium', maint: 2, vibe: 'Relaxed · Free',
    fit: FULL, hair: { straight: .0, wavy: .85, curly: 1, coily: .5 }, tags: ['soft-texture', 'side-volume', 'face-framing'],
    desc: 'Medium-length curls with soft layers so they bounce and stack instead of puffing out sideways. Sides tidied, top left natural.',
    ask: 'Medium curly layers — cut dry, curl by curl, 10–14 cm on top, layered so the curls stack and do not triangle out, tidy the sides and back with a light taper, keep the length around the ears.',
    guards: 'Light taper on sides · 10–14 cm of layered curls',
    steps: [
      'Cut dry in the natural curl pattern; check the shape before cutting any curl.',
      'Cut small sections curl by curl and add layers around the crown for rounded volume.',
      'Keep the front curls at about cheekbone to eyebrow length so they frame the face.',
      'Remove bulk at the sides and back with a light taper or scissor-over-comb so it does not go wide.',
      'Refine the shape by looking from the front, sides and back.'
    ],
    styling: ['Leave-in + curl cream on soaking-wet hair', 'Scrunch, then diffuse or air-dry', 'Refresh day 2 with a spray of water and a little cream'],
    products: 'Leave-in, curl cream or gel', trim: 'Every 6–8 weeks',
    render: { top: 'curly', vol: .4, sides: 'long', len: 'jaw', layers: .5, frame: .5, texture: 'curly' }
  },
  {
    id: 'm_curlyquiff', gender: 'male', name: 'Curly Quiff', length: 'short', maint: 2, vibe: 'Sharp · Playful',
    fit: TALL, hair: { straight: .0, wavy: .75, curly: 1, coily: .6 }, tags: ['height', 'tight-sides', 'soft-texture'],
    desc: 'The classic quiff built from natural curls: tall and swept slightly forward at the front, with tidy tapered sides.',
    ask: 'Curly quiff — low taper on the sides and back, 8–10 cm of natural curl on top left longest at the front so it lifts and sweeps up and forward, cut dry, textured not blunt.',
    guards: 'Low taper #1 → #3 · 8–10 cm curls, longest at the front',
    steps: [
      'Cut dry so you see how the curls fall and spring.',
      'Taper sides and back low: #1 → #2 → #3, blended into the curls.',
      'Leave the front 8–10 cm and shorter toward the crown so the curls lift at the front.',
      'Cut curl by curl, point-cutting only the ends to keep definition.',
      'Check the profile: the highest point should be at the front, not the crown.'
    ],
    styling: ['Curl cream on wet hair, scrunch', 'Gel or mousse for hold, then diffuse upward at the roots', 'Do not touch while drying to avoid frizz'],
    products: 'Curl cream, strong-hold gel, diffuser', trim: 'Every 3–4 weeks',
    render: { top: 'curly', vol: .46, sides: 'fade', fringe: 'crop', texture: 'curly' }
  },
  {
    id: 'm_curlylong', gender: 'male', name: 'Long Natural Curls', length: 'long', maint: 3, vibe: 'Free-spirited · Bold',
    fit: LONG, hair: { straight: .0, wavy: .8, curly: 1, coily: .6 }, tags: ['length-below-chin', 'soft-texture', 'face-framing'],
    desc: 'Let your curls grow to the jaw or shoulders with long layers for shape and bounce, with a tidy neckline.',
    ask: 'Long curls — keep length around the jaw to shoulders, add long layers cut dry curl by curl so the curls stack and do not go triangle-shaped, just a light trim of the ends and a clean neckline.',
    guards: 'Scissors only · jaw to shoulder length, long layers',
    steps: [
      'Cut dry so each curl is trimmed where it actually falls.',
      'Dust the ends only (about 1–2 cm) to remove splits and keep your length.',
      'Add long layers (not short ones) so the curls stack and have volume at the top.',
      'Shape the front curls to sit at cheekbone to chin length to frame the face.',
      'Tidy the neckline and any wispy hairs.'
    ],
    styling: ['Deep condition weekly', 'Curl cream or gel on soaking-wet hair, scrunch', 'Sleep on a satin pillowcase or tie hair up loosely'],
    products: 'Deep conditioner, leave-in, curl gel', trim: 'Every 10–12 weeks',
    render: { top: 'curly', vol: .36, sides: 'long', len: 'shoulder', layers: .5, frame: .5, texture: 'curly' }
  },
  {
    id: 'm_curlylowtaper', gender: 'male', name: 'Short Curls with Low Taper', length: 'short', maint: 1, vibe: 'Clean · Easygoing',
    fit: CLOSE, hair: { straight: .05, wavy: .7, curly: 1, coily: .8 }, tags: ['short-all-over', 'tight-sides', 'soft-texture'],
    desc: 'A short, neat curl cut: 3–5 cm of curls on top with a low taper — the easy, wash-and-go version.',
    ask: 'Short curls with a low taper — #1 → #2 low taper on the sides and back, 3–5 cm of natural curl on top cut dry, rounded top, no fringe, clean neckline.',
    guards: 'Low taper #1 → #2 · 3–5 cm curls on top',
    steps: [
      'Cut dry so the curls are not cut too short.',
      'Low taper: #1 at the very bottom of the neckline and above the ears, fading up to #2.',
      'Top: 3–5 cm, rounded shape, cut curl by curl with scissors or a comb attachment.',
      'Line up the neckline and temples lightly.'
    ],
    styling: ['Cream or gel on damp hair', 'Air-dry', 'Refresh with water on non-wash days'],
    products: 'Curl cream or light gel', trim: 'Every 3–4 weeks',
    render: { top: 'curly', vol: .3, sides: 'fade', fringe: 'crop', texture: 'curly' }
  },

  /* ------------------------------ MEN · COILY ------------------------------ */
  {
    id: 'm_hightop', gender: 'male', name: 'High Top Fade', length: 'short', maint: 2, vibe: 'Iconic · Bold',
    fit: TALL, hair: { straight: 0, wavy: 0, curly: .7, coily: 1 }, tags: ['height', 'tight-sides', 'crown-volume'],
    desc: 'A flat or rounded high top of natural coils with a sharp fade on the sides. Instant height and a crisp outline.',
    ask: 'High top fade — fade the sides and back from skin up, leave 6–10 cm of coils on top shaped flat or round, crisp line-up on the forehead and temples, neck edge-up.',
    guards: 'Skin fade up the sides · 6–10 cm on top',
    steps: [
      'Pick out the hair on top (afro pick) so the true length shows.',
      'Fade the sides and back from skin up to the level where the top begins (mid or high fade).',
      'Shape the top: flat top with a square edge or a softer rounded top, cutting evenly with clippers and a comb.',
      'Blend where the fade meets the top so no step is visible.',
      'Line up the hairline and temples and edge the neck.'
    ],
    styling: ['Moisturise with leave-in + a little oil', 'Pick out the top for height and shape', 'Wear a satin durag or sleep on satin to keep the shape'],
    products: 'Leave-in conditioner, oil, afro pick', trim: 'Every 2–3 weeks',
    render: { top: 'afro', vol: .5, sides: 'fade', texture: 'coily' }
  },
  {
    id: 'm_waves', gender: 'male', name: '360 Waves', length: 'short', maint: 3, vibe: 'Smooth · Disciplined',
    fit: CLOSE, hair: { straight: 0, wavy: .1, curly: .55, coily: 1 }, tags: ['short-all-over', 'tight-sides'],
    desc: 'Short, brushed waves that ripple around the whole head. Needs a low cut and a brushing routine, but the finish is unmistakable.',
    ask: '360 waves — cut the hair very short and even (#1 to #2 on top, the same all around), with a low taper at the neck and temples and a clean line-up. I will brush and wrap it to form the waves.',
    guards: 'About #1–#2 all over · taper at neck and temples',
    steps: [
      'Clip the whole head to one even length (usually a #1 or #2) so the pattern can show.',
      'Taper the neckline and around the ears lightly; keep the top even.',
      'Sharp line-up on the forehead and temples.',
      'Brush in the direction of the wave pattern after moisturising — daily.',
      'Wrap with a durag or wave cap to train the pattern.'
    ],
    styling: ['Moisturise with a light pomade or wave cream', 'Brush with a medium-bristle wave brush, 5–10 minutes', 'Wear a durag overnight'],
    products: 'Wave brush, light pomade, durag', trim: 'Every 2 weeks',
    render: { top: 'afro', vol: .12, sides: 'short', texture: 'coily' }
  },
  {
    id: 'm_locs', gender: 'male', name: 'Short Locs with Taper', length: 'medium', maint: 2, vibe: 'Rooted · Stylish',
    fit: CLOSE, hair: { straight: 0, wavy: 0, curly: .8, coily: 1 }, tags: ['soft-texture', 'tight-sides', 'height'],
    desc: 'Neat locs of about 8–15 cm on top with a clean taper at the sides and neckline — long-term, low-daily-effort.',
    ask: 'Short locs with a taper — keep the locs on top at about 8–15 cm, taper the sides and back neatly (#1 → #2), crisp line-up and neckline, retwist the roots.',
    guards: 'Taper #1 → #2 · 8–15 cm locs on top',
    steps: [
      'Check that the locs are even in size and the parts (the scalp grid) are neat.',
      'Taper the sides and back, leaving the locs untouched on top.',
      'Line up the front hairline and temples, edge the neck.',
      'Retwist the new growth at the roots (palm-roll or interlock) every few weeks.',
      'Trim only stray ends; never cut the locs short by accident.'
    ],
    styling: ['Wash with a residue-free shampoo (not conditioner)', 'Light oil on the scalp only', 'Sleep with a satin cap'],
    products: 'Residue-free shampoo, light oil, satin cap', trim: 'Taper every 3 weeks · retwist every 4–6 weeks',
    render: { top: 'twists', vol: .36, sides: 'fade', texture: 'coily' }
  },
  {
    id: 'm_cornrows', gender: 'male', name: 'Cornrows with Taper', length: 'short', maint: 2, vibe: 'Protective · Sharp',
    fit: CLOSE, hair: { straight: 0, wavy: 0, curly: .6, coily: 1 }, tags: ['short-all-over', 'tight-sides', 'height'],
    desc: 'Braids of natural hair laid flat to the scalp in straight rows, with a clean taper on the sides. Protective, tidy and long-lasting.',
    ask: 'Cornrows with a taper — taper the sides and back first (#1 → #2), then braid the top into straight back or simple pattern rows, neat parts, not too tight at the hairline.',
    guards: 'Taper sides · cornrows on 6–10 cm top',
    steps: [
      'Taper the sides and back before braiding.',
      'Detangle the top and moisturise.',
      'Braid straight rows from the front to the nape (or a simple pattern), keeping the tension comfortable.',
      'Seal the ends and line up the hairline.',
      'Take the braids out after 2–4 weeks and give the scalp a rest.'
    ],
    styling: ['Oil the scalp lightly between rows', 'Wear a satin scarf at night', 'Do not pull the braids tight'],
    products: 'Light oil, satin scarf', trim: 'Taper every 2–3 weeks',
    render: { top: 'twists', vol: .28, sides: 'fade', texture: 'coily' }
  },
  {
    id: 'm_twistout', gender: 'male', name: 'Twist Out with Fade', length: 'short', maint: 2, vibe: 'Defined · Soft',
    fit: TALL, hair: { straight: 0, wavy: 0, curly: .85, coily: 1 }, tags: ['soft-texture', 'height', 'tight-sides'],
    desc: 'Two-strand twists undone into soft, defined coils on top, with a fade on the sides. Looks fresh and lasts several days.',
    ask: 'Fade with a twist-out — fade the sides and back, leave 7–12 cm on top that I will twist and unravel into defined coils; shape the top round and even.',
    guards: 'Fade sides · 7–12 cm on top',
    steps: [
      'Fade the sides and back and shape the top round or slightly tall.',
      'Wash and condition; apply leave-in and a twisting cream on damp hair.',
      'Do two-strand twists in small sections across the top and let them dry fully.',
      'Unravel the twists with oil on your fingers and fluff gently.',
      'Shape with a pick.'
    ],
    styling: ['Twist on damp, stretched hair with cream or butter', 'Let twists dry completely before unravelling', 'Keep it fresh by re-twisting the ends at night'],
    products: 'Leave-in, twisting cream or butter, oil', trim: 'Every 3 weeks',
    render: { top: 'twists', vol: .4, sides: 'fade', texture: 'coily' }
  },
  {
    id: 'm_twa', gender: 'male', name: 'Short Natural (TWA) with Line-up', length: 'short', maint: 1, vibe: 'Minimal · Natural',
    fit: CLOSE, hair: { straight: 0, wavy: 0, curly: .8, coily: 1 }, tags: ['short-all-over', 'tight-sides'],
    desc: 'A short natural afro (a "teeny weeny afro"): even 2–4 cm of coils all over with a sharp line-up. Very low maintenance.',
    ask: 'Short natural TWA — even 2–4 cm all over, shaped round, with a clean line-up on the forehead and temples and a tidy neckline.',
    guards: 'About 2–4 cm all over (#4–#6) · line-up',
    steps: [
      'Pick out the hair so the true length shows.',
      'Clip to one even length with a guard (about #4–#6), keeping a rounded shape.',
      'Line up the forehead, temples and neckline.',
      'Finish with a light moisturising oil.'
    ],
    styling: ['Moisturise with leave-in and a light oil', 'Pick out gently for shape', 'Satin pillowcase at night'],
    products: 'Leave-in, oil, afro pick', trim: 'Every 3–4 weeks',
    render: { top: 'afro', vol: .22, sides: 'short', texture: 'coily' }
  },

  /* ----------------------------- WOMEN · CURLY ----------------------------- */
  {
    id: 'w_curlybob', gender: 'female', name: 'Curly Bob (Chin-Length)', length: 'short', maint: 2, vibe: 'Chic · Bouncy',
    fit: FULL, hair: { straight: 0, wavy: .9, curly: 1, coily: .7 }, tags: ['chin-volume', 'soft-texture', 'face-framing'],
    desc: 'A rounded chin-length bob cut for curls: the curls spring up so it sits shorter than it looks stretched, with plenty of body.',
    ask: 'Curly bob — cut dry, curl by curl, to chin length once the curls spring up (so leave it 2–3 cm longer than the final length), rounded shape with soft layers at the crown, no blunt straight line.',
    guards: 'Scissors, dry cut · chin length when dry',
    steps: [
      'Cut dry in the natural curl pattern — curls spring up a lot, so check the length curl by curl.',
      'Cut small sections to a rounded outline at chin length, following the curve of the head.',
      'Add short layers at the crown so the shape is round, not a triangle.',
      'Soften the front pieces around the face.',
      'Dry-check the silhouette from every side.'
    ],
    styling: ['Leave-in + curl cream, scrunch on wet hair', 'Gel for hold, diffuse or air-dry', 'Refresh with a mist of water and cream'],
    products: 'Leave-in, curl cream, gel, diffuser', trim: 'Every 8–10 weeks',
    render: { top: 'curly', vol: .34, sides: 'long', len: 'chin', layers: .5, frame: .5, texture: 'curly' }
  },
  {
    id: 'w_curlyshag', gender: 'female', name: 'Curly Shag', length: 'medium', maint: 2, vibe: 'Edgy · Voluminous',
    fit: FULL, hair: { straight: 0, wavy: .9, curly: 1, coily: .6 }, tags: ['soft-texture', 'face-framing', 'crown-volume'],
    desc: 'Lots of layers all over to give curls shape and lift. The crown is shorter, the length falls to the shoulders and the face-framing curls are shorter.',
    ask: 'Curly shag — cut dry, curl by curl, with plenty of layers: shorter layers at the crown for lift, face-framing curls around the cheekbones, shoulder length at the back, with curly bangs optional.',
    guards: 'Dry cut · layered, shoulder length',
    steps: [
      'Cut dry, in the natural curl pattern.',
      'Cut short layers around the crown and top to create lift.',
      'Keep the back at about shoulder length, with long layers so it does not go heavy.',
      'Cut face-framing curls at cheekbone to chin length.',
      'Thin out only inside the curls if there is too much bulk.'
    ],
    styling: ['Leave-in + curl gel on soaking-wet hair', 'Scrunch up toward the roots', 'Diffuse with the head tipped upside down for volume'],
    products: 'Leave-in, curl gel, diffuser', trim: 'Every 8–10 weeks',
    render: { top: 'curly', vol: .46, sides: 'long', len: 'shoulder', layers: .8, frame: .6, texture: 'curly' }
  },
  {
    id: 'w_longcurly', gender: 'female', name: 'Long Curly Layers', length: 'long', maint: 2, vibe: 'Romantic · Natural',
    fit: LONG, hair: { straight: 0, wavy: .85, curly: 1, coily: .7 }, tags: ['length-below-chin', 'soft-texture', 'face-framing'],
    desc: 'Long natural curls with long layers for movement and volume, with face-framing curls that frame the cheekbones.',
    ask: 'Long curly layers — keep the length (mid-back or below the shoulders), cut dry curl by curl with long layers for bounce, soft face-framing curls around the cheekbones, dust the ends only.',
    guards: 'Dry cut · long layers, trim ends only',
    steps: [
      'Cut dry in the natural curl pattern.',
      'Dust the ends only (1–2 cm) to remove splits and keep the length.',
      'Add long layers starting at about chin level so the curls stack and the shape is not bottom-heavy.',
      'Cut face-framing curls to cheekbone/chin length.',
      'Check the shape with the hair in its natural position.'
    ],
    styling: ['Deep condition weekly', 'Leave-in + curl cream, scrunch on wet hair', 'Sleep on satin, "pineapple" the hair'],
    products: 'Deep conditioner, leave-in, curl cream', trim: 'Every 10–12 weeks',
    render: { top: 'curly', vol: .34, sides: 'long', len: 'chest', layers: .55, frame: .5, texture: 'curly' }
  },
  {
    id: 'w_curlypixie', gender: 'female', name: 'Curly Pixie (Tapered Curls)', length: 'short', maint: 2, vibe: 'Bold · Playful',
    fit: CLOSE, hair: { straight: 0, wavy: .7, curly: 1, coily: .8 }, tags: ['short-all-over', 'height', 'soft-texture'],
    desc: 'A short curly crop: tapered at the nape and around the ears, with 4–7 cm of springy curls on top.',
    ask: 'Curly pixie — taper the nape and around the ears short (#2–#3), leave 4–7 cm of natural curls on top, cut dry curl by curl, soft curls over the forehead or side swept.',
    guards: 'Nape and ears #2–#3 · 4–7 cm curls on top',
    steps: [
      'Cut dry so the curls are cut where they naturally sit.',
      'Taper the nape and around the ears with clippers or scissor-over-comb.',
      'Leave 4–7 cm of curl on top, longest at the front.',
      'Shape the front curls over the forehead or to one side.',
      'Define the shape and tidy the edges.'
    ],
    styling: ['Curl cream or gel on wet hair', 'Scrunch and air-dry', 'Refresh with water'],
    products: 'Curl cream, gel', trim: 'Every 4–5 weeks',
    render: { top: 'curly', vol: .32, sides: 'short', texture: 'curly' }
  },
  {
    id: 'w_curlybangs', gender: 'female', name: 'Curly Bangs with Layers', length: 'medium', maint: 2, vibe: 'Sweet · Trendy',
    fit: FRINGE, hair: { straight: 0, wavy: .8, curly: 1, coily: .55 }, tags: ['fringe', 'soft-texture', 'face-framing'],
    desc: 'Soft curly bangs that spring up to brow level, with layers through the length. Frames the eyes and brings volume.',
    ask: 'Curly bangs with layers — cut the bangs dry, curl by curl, longer than where I want them to end because they spring up (land at the brow once dry), blend into face-framing curls, add layers through the rest at shoulder length.',
    guards: 'Dry cut · bangs end at brow when dry · shoulder length',
    steps: [
      'Cut the bangs DRY — curls spring up by 3–5 cm.',
      'Start longer than needed and trim a little at a time until they sit at brow level.',
      'Blend the bangs into the face-framing curls.',
      'Add layers through the rest of the hair (shoulder length).',
      'Check how the bangs sit when the hair is air-dried.'
    ],
    styling: ['Style the bangs separately: cream and a bit of gel', 'Diffuse the bangs while they are flat', 'Refresh with a mist'],
    products: 'Curl cream, gel, diffuser', trim: 'Bangs every 4–6 weeks',
    render: { top: 'curly', vol: .34, sides: 'long', len: 'shoulder', layers: .5, frame: .6, fringe: 'brow', texture: 'curly' }
  },

  /* ----------------------------- WOMEN · COILY ----------------------------- */
  {
    id: 'w_twistout', gender: 'female', name: 'Twist Out', length: 'medium', maint: 2, vibe: 'Defined · Voluminous',
    fit: FULL, hair: { straight: 0, wavy: 0, curly: .85, coily: 1 }, tags: ['soft-texture', 'side-volume', 'crown-volume'],
    desc: 'Two-strand twists on damp hair unravelled into soft, defined coils with lots of volume. It lasts several days.',
    ask: 'Twist out — trim the ends and shape if needed, then two-strand twists on stretched damp hair, let them dry fully and unravel into defined coils; shape into a rounded outline.',
    guards: 'Trim ends and shape · twist on damp hair',
    steps: [
      'Wash and deep condition; detangle with a wide-tooth comb on damp hair.',
      'Apply leave-in and a twisting cream or butter.',
      'Section the hair and do two-strand twists, keeping each twist the same thickness.',
      'Let them dry completely (air-dry overnight or under a hooded dryer).',
      'Unravel with oil on the fingers and fluff gently to shape.'
    ],
    styling: ['Use a satin scarf at night to keep the definition', 'Re-twist 2–3 sections to refresh', 'Add a little oil to prevent frizz'],
    products: 'Leave-in, twisting butter, oil, satin scarf', trim: 'Trim every 8–12 weeks',
    render: { top: 'twists', vol: .5, sides: 'full', texture: 'coily' }
  },
  {
    id: 'w_braids', gender: 'female', name: 'Knotless Braids (Protective)', length: 'long', maint: 1, vibe: 'Protective · Elegant',
    fit: LONG, hair: { straight: 0, wavy: 0, curly: .8, coily: 1 }, tags: ['length-below-chin', 'face-framing'],
    desc: 'Long braids that start flat and lightly feed in extra hair so they are lighter and gentler on the scalp than traditional box braids.',
    ask: 'Knotless braids — medium size, mid-back length, no knot at the root (feed-in braiding), not too tight at the hairline, parts neat and straight.',
    guards: 'Medium knotless braids · mid-back',
    steps: [
      'Detangle and moisturise the hair and prepare the scalp.',
      'Section the hair neatly in a grid.',
      'Start each braid with your own hair and feed in extra braiding hair gradually.',
      'Keep the tension comfortable, especially at the edges.',
      'Seal the ends (dip in hot water) and finish with edge control.'
    ],
    styling: ['Moisturise the scalp lightly every few days', 'Sleep in a satin bonnet or scarf', 'Take them out after about 6–8 weeks'],
    products: 'Scalp oil, satin bonnet, edge control', trim: 'Redo every 6–8 weeks',
    render: { top: 'twists', vol: .3, sides: 'long', len: 'chest', layers: .1, frame: .3, texture: 'coily' }
  },
  {
    id: 'w_bantu', gender: 'female', name: 'Bantu Knot-Out', length: 'medium', maint: 2, vibe: 'Springy · Defined',
    fit: TALL, hair: { straight: 0, wavy: 0, curly: .6, coily: 1 }, tags: ['height', 'crown-volume', 'soft-texture'],
    desc: 'Coils twisted into small knots on damp hair, then unravelled to give springy, defined curls. Knots alone are also a style.',
    ask: 'Bantu knots (and a knot-out) — section the hair into small parts, twist each section tightly and coil it into a knot on the scalp, wear them as knots or undo them after drying to get springy curls.',
    guards: 'Small sections · twist and coil into knots',
    steps: [
      'Wash, condition and detangle; apply leave-in and a setting cream.',
      'Part the hair into small even sections.',
      'Twist each section from root to tip and wind it into a knot against the scalp.',
      'Let it dry fully (overnight or under a dryer).',
      'Take the knots down gently with a bit of oil and shape the curls.'
    ],
    styling: ['Use a satin scarf at night', 'Do not undo the knots until fully dry', 'Seal the ends with a little oil'],
    products: 'Leave-in, setting cream, oil', trim: 'Trim every 10–12 weeks',
    render: { top: 'twists', vol: .42, sides: 'full', texture: 'coily' }
  },
  {
    id: 'w_flattwists', gender: 'female', name: 'Flat Twists and Cornrows', length: 'medium', maint: 1, vibe: 'Neat · Protective',
    fit: CLOSE, hair: { straight: 0, wavy: 0, curly: .7, coily: 1 }, tags: ['face-framing', 'height'],
    desc: 'Twists or braids laid flat to the scalp in rows or a pattern, finished with the ends in an updo or hanging down. Neat and low-effort.',
    ask: 'Flat twists or cornrows — straight back or in a simple pattern, medium-size rows, neat parts, comfortable tension at the hairline, ends left out or finished in a bun.',
    guards: 'Medium rows · finish in a bun or left down',
    steps: [
      'Detangle and moisturise.',
      'Part neat rows from the front hairline toward the nape (or a simple curved pattern).',
      'Flat-twist or braid each row with comfortable tension.',
      'Finish the ends in a bun, twists or leave them out.',
      'Smooth the edges and parts.'
    ],
    styling: ['Moisturise the scalp lightly between washes', 'Satin scarf at night', 'Refresh the edges as needed'],
    products: 'Light oil, edge control, satin scarf', trim: 'Redo every 2–4 weeks',
    render: { top: 'twists', vol: .3, sides: 'full', texture: 'coily' }
  },
  {
    id: 'w_twa', gender: 'female', name: 'TWA (Teeny Weeny Afro)', length: 'short', maint: 1, vibe: 'Bold · Minimal',
    fit: CLOSE, hair: { straight: 0, wavy: 0, curly: .85, coily: 1 }, tags: ['short-all-over', 'crown-volume', 'height'],
    desc: 'A short rounded natural: 2–5 cm of coils all over, shaped evenly. Very easy and shows off your face.',
    ask: 'TWA — short natural afro, 2–5 cm all over, rounded shape, slightly tapered at the nape and around the ears, clean edges.',
    guards: 'About 2–5 cm all over · tapered nape and ears',
    steps: [
      'Pick out the hair so the true length shows.',
      'Shape the outline round, with the same length all over (about 2–5 cm).',
      'Taper the nape and around the ears lightly.',
      'Clean the edges at the hairline.'
    ],
    styling: ['Leave-in + a light oil', 'Define with finger coils or a twist-and-wash method', 'Satin bonnet at night'],
    products: 'Leave-in, light oil, satin bonnet', trim: 'Every 4–6 weeks',
    render: { top: 'afro', vol: .26, sides: 'short', texture: 'coily' }
  },
  {
    id: 'w_locs', gender: 'female', name: 'Shoulder-Length Locs', length: 'medium', maint: 1, vibe: 'Rooted · Effortless',
    fit: LONG, hair: { straight: 0, wavy: 0, curly: .8, coily: 1 }, tags: ['soft-texture', 'face-framing', 'length-below-chin'],
    desc: 'Locs that fall to the shoulders: a long-term style that needs little daily work and can be dressed up or down.',
    ask: 'Shoulder-length locs — neat, even-size locs, parts neat, retwist the roots, trim only the very ends, edges tidy.',
    guards: 'Even locs · shoulder length',
    steps: [
      'Start locs by twisting, braiding or interlocking; give them a few months to form.',
      'Keep the parts neat and the locs an even size.',
      'Retwist or interlock the roots every 4–6 weeks.',
      'Trim only the very ends and tidy the edges.'
    ],
    styling: ['Wash with a residue-free shampoo', 'Light oil on the scalp', 'Satin cap at night'],
    products: 'Residue-free shampoo, light oil, satin cap', trim: 'Retwist every 4–6 weeks',
    render: { top: 'twists', vol: .34, sides: 'long', len: 'shoulder', layers: .1, frame: .3, texture: 'coily' }
  }
  ];
  HS.HAIRSTYLES.push.apply(HS.HAIRSTYLES, list);
})();
