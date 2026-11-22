/* =====================================================================
   HairyStylo — data.js
   ---------------------------------------------------------------------
   The "knowledge base" of the app. Everything a professional stylist
   knows, written down as data the recommender can score:

   1. FACE_SHAPES  – what each face shape looks like + what flatters it
   2. HAIRSTYLES   – every haircut we can recommend, with:
                       fit      → how well it suits each face shape (0–1)
                       hair     → how well it works on each hair type (0–1)
                       tags     → what the cut does (adds height, fringe…)
                       steps    → step-by-step instructions for the barber
                       render   → numbers the drawing code uses to draw it
   3. HAIR_COLOURS – shades that flatter each skin depth + undertone
   4. BEARDS       – beard styles and which face shapes they suit
   5. SKIN_TONES / MONK_SCALE – skin tone categories

   Edit this file to add new styles — no other code needs to change.
   ===================================================================== */
window.HS = window.HS || {};

/* ---------------------------------------------------------------------
   1. FACE SHAPES
   likes/dislikes map a style "tag" to a human-readable reason.
   --------------------------------------------------------------------- */
HS.FACE_SHAPES = {
  oval: {
    name: 'Oval',
    short: 'Balanced — a little longer than wide, softly rounded jaw',
    desc: 'Your face is a little longer than it is wide, your forehead is slightly wider than your jaw, and your chin is softly rounded. Stylists call this the most versatile shape: almost every cut works, so we chose the ones that show off your balanced proportions best.',
    goal: 'Keep the face open and show off the balance.',
    likes: {
      'face-framing': 'Face-framing pieces highlight your balanced features',
      'soft-texture': 'Soft texture keeps it modern without hiding your proportions',
      'tight-sides': 'Clean sides show off your well-balanced face shape',
      'height': 'A little height keeps your proportions in perfect balance',
      'side-fringe': 'A side sweep adds style while keeping your face open',
      'asymmetry': 'An off-centre line adds interest to an evenly balanced face',
      'length-below-chin': 'Your even proportions carry length beautifully',
      'short-all-over': 'An oval face is one of the few that can pull off very short hair',
      'curtain': 'Curtain bangs frame your eyes without hiding your shape'
    },
    dislikes: {
      'fringe': 'A heavy fringe hides your best feature — your balanced proportions'
    },
    brows: 'Soft, gently angled arch that follows your natural brow line.',
    glasses: 'Almost any frame works — try bold geometric or wayfarer frames that are as wide as the widest part of your face.',
    partTip: 'Any parting works. A centre part shows off your symmetry; a soft side part adds volume.'
  },
  round: {
    name: 'Round',
    short: 'Length and width about equal, full cheeks, soft jaw',
    desc: 'Your face is about as wide as it is long, your cheekbones are the widest part, and your jawline is soft and curved. The goal is to add height and vertical lines so the face looks longer and more defined.',
    goal: 'Add height and length; keep width off the sides.',
    likes: {
      'height': 'Height on top makes your face look longer and slimmer',
      'tight-sides': 'Short sides keep width off your cheeks',
      'side-fringe': 'An off-centre sweep breaks up the roundness',
      'asymmetry': 'Asymmetry adds angles to soft, round features',
      'length-below-chin': 'Length past the chin draws the eye down and slims the face',
      'face-framing': 'Long face-framing pieces create slimming vertical lines',
      'crown-volume': 'Volume at the crown adds height and length'
    },
    dislikes: {
      'side-volume': 'Volume at the sides adds width to a round face',
      'short-all-over': 'Very short hair all over shows the full roundness of the face',
      'chin-volume': 'Fullness at chin level widens the lower face',
      'fringe': 'A straight, heavy fringe makes a round face look shorter',
      'blunt-line': 'A blunt line at cheek or chin level emphasises roundness'
    },
    brows: 'A higher, more defined arch lifts and lengthens a round face.',
    glasses: 'Angular frames — rectangular or square — add structure. Avoid small round frames.',
    partTip: 'A deep side part with side-swept or long curtain bangs is the most slimming. Skip blunt full bangs.'
  },
  square: {
    name: 'Square',
    short: 'Strong, angular jaw; forehead, cheeks and jaw similar width',
    desc: 'Your forehead, cheekbones and jaw are close to the same width and your jawline is strong and angular. It’s a striking, structured shape: we either soften the angles with texture or show off that jawline with clean lines.',
    goal: 'Soften the corners or show off the strong jaw.',
    likes: {
      'soft-texture': 'Soft layers and texture balance your strong jawline',
      'side-fringe': 'A side sweep softens the angles of the forehead',
      'face-framing': 'Pieces that fall around the jaw soften its corners',
      'height': 'Some height on top lengthens a square face',
      'short-all-over': 'A strong jaw is a natural asset — short, clean cuts show it off',
      'tight-sides': 'Clean, tapered sides sharpen your already-strong structure',
      'curtain': 'Curtain bangs soften the straight line of a square forehead',
      'length-below-chin': 'Length past the jaw draws attention away from its corners',
      'asymmetry': 'An off-centre line breaks up the symmetry of a square face'
    },
    dislikes: {
      'blunt-line': 'A blunt line right at the jaw makes it look wider and boxier',
      'chin-volume': 'Volume at jaw level adds even more width there'
    },
    brows: 'Softly curved, rounded arches balance an angular jaw.',
    glasses: 'Round or oval frames soften angles. Avoid very boxy frames.',
    partTip: 'A side part with soft, wispy or curtain bangs softens your angles; avoid blunt, straight-across bangs.'
  },
  oblong: {
    name: 'Oblong (Rectangle)',
    short: 'Noticeably longer than wide, straight cheek line',
    desc: 'Your face is noticeably longer than it is wide, with forehead, cheekbones and jaw at similar widths. The goal is the opposite of a round face: add width at the sides and avoid too much height.',
    goal: 'Add width at the sides; avoid extra height.',
    likes: {
      'fringe': 'A fringe visually shortens a longer face',
      'curtain': 'Curtain bangs break up the length of the face',
      'side-volume': 'Width at the sides balances the length of your face',
      'chin-volume': 'Fullness at chin level adds width where you need it',
      'soft-texture': 'Waves and texture add width and softness',
      'side-fringe': 'A side fringe cuts across the length of the face'
    },
    dislikes: {
      'height': 'Lots of height on top makes a long face look even longer',
      'crown-volume': 'Extra volume at the crown adds more length',
      'sleek': 'Long, flat, straight hair drags the face down and lengthens it'
    },
    brows: 'Flatter, straighter brows make the face look shorter and wider.',
    glasses: 'Tall, oversized or decorative-temple frames add width. Avoid small, narrow frames.',
    partTip: 'A centre part with full or curtain bangs shortens the face beautifully.'
  },
  heart: {
    name: 'Heart',
    short: 'Wider forehead, narrow jaw, pointed chin',
    desc: 'Your forehead is the widest part of your face and it narrows down to a slimmer jaw and a more pointed chin. We balance it by adding fullness lower down and softening the forehead.',
    goal: 'Add fullness near the jaw; soften the forehead.',
    likes: {
      'chin-volume': 'Fullness around the jaw balances a wider forehead',
      'fringe': 'A fringe narrows a wide forehead',
      'side-fringe': 'A side-swept fringe balances the forehead and softens the chin',
      'curtain': 'Curtain bangs soften the forehead and frame the cheekbones',
      'face-framing': 'Face-framing layers draw attention to your eyes and cheekbones',
      'soft-texture': 'Soft texture adds width around the lower face',
      'side-volume': 'Some width at the sides balances a narrow chin'
    },
    dislikes: {
      'crown-volume': 'Lots of volume on top makes the forehead look wider',
      'height': 'Tall height on top exaggerates the V-shape of the face'
    },
    brows: 'Soft, rounded arches — avoid very high, sharp peaks.',
    glasses: 'Bottom-heavy, rimless, light or oval frames. Avoid heavy top-line frames.',
    partTip: 'Side-swept or curtain bangs balance your forehead; a centre or soft side part both work.'
  },
  diamond: {
    name: 'Diamond',
    short: 'Wide cheekbones, narrower forehead and jaw',
    desc: 'Your cheekbones are clearly the widest part of your face, with a narrower forehead and a narrower, defined chin. We add width at the forehead and chin so everything balances around those great cheekbones.',
    goal: 'Widen forehead and chin; soften the cheekbones.',
    likes: {
      'fringe': 'A fringe adds width to a narrow forehead',
      'side-fringe': 'A side-swept fringe widens the forehead and softens the cheekbones',
      'chin-volume': 'Fullness at the chin balances wide cheekbones',
      'curtain': 'Curtain bangs widen the forehead line',
      'soft-texture': 'Soft texture balances strong cheekbones',
      'face-framing': 'Layers that fall below the cheekbones soften them beautifully'
    },
    dislikes: {
      'side-volume': 'Volume right at cheekbone level makes them look wider',
      'height': 'Pointed height on top exaggerates the narrow forehead'
    },
    brows: 'Curved brows soften the angles of the cheekbones.',
    glasses: 'Oval, cat-eye or rimless frames. Avoid narrow frames that are narrower than your cheekbones.',
    partTip: 'Side-swept or curtain bangs add width to the forehead; try a deep side part.'
  },
  triangle: {
    name: 'Triangle (Pear)',
    short: 'Jaw wider than the forehead',
    desc: 'Your jawline is the widest part of your face and your forehead is narrower. We balance it by adding volume up top and keeping the jaw area light.',
    goal: 'Add volume on top; keep the jaw area light.',
    likes: {
      'height': 'Volume on top balances a wider jawline',
      'crown-volume': 'Fullness at the crown widens the upper face to balance the jaw',
      'side-fringe': 'A side sweep adds width to the forehead',
      'soft-texture': 'Texture through the top adds width up high',
      'face-framing': 'Layers starting below the jaw draw the eye away from it',
      'tight-sides': 'Neat, short sides stop extra width building at the jaw'
    },
    dislikes: {
      'chin-volume': 'Volume at the jaw makes it look even wider',
      'blunt-line': 'A blunt line at the jaw draws attention to its width',
      'short-all-over': 'Very short hair all over puts the focus on the wide jaw'
    },
    brows: 'Longer, gently arched brows widen the upper face.',
    glasses: 'Top-heavy frames — browline or cat-eye — widen the upper face.',
    partTip: 'A side part with volume at the crown balances your jaw; side-swept bangs add width up top.'
  }
};
HS.SHAPE_ORDER = ['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle'];

/* ---------------------------------------------------------------------
   2. HAIRSTYLES
   length: short | medium | long        maint: 1 low · 2 medium · 3 high
   fit:    suitability for each face shape (stylist ratings, 0–1)
   hair:   suitability for each hair type (0–1)
   render: parameters for the drawing engine (renderer.js)
   --------------------------------------------------------------------- */
HS.HAIRSTYLES = [
  /* ============================ MEN ============================ */
  {
    id: 'm_crop', gender: 'male', name: 'Textured French Crop', length: 'short', maint: 1, vibe: 'Modern · Low-effort',
    fit: { oval: .9, round: .55, square: .95, oblong: .9, heart: .7, diamond: .85, triangle: .5 },
    hair: { straight: 1, wavy: .9, curly: .7, coily: .5 },
    tags: ['fringe', 'tight-sides', 'soft-texture'],
    desc: 'A short, choppy top pushed forward into a cropped fringe, with a clean fade on the sides.',
    ask: 'Textured French crop — mid skin fade, 4–5 cm on top point-cut for texture, short choppy fringe about 2 cm above my eyebrows.',
    guards: '#0 → #1 → #2 fade · 4–5 cm on top',
    steps: [
      'Section off the top, from the corners of the forehead back to the crown (where the head starts to curve — the "parietal ridge").',
      'Sides & back: mid fade — foil/#0 for the bottom 1–2 cm, #1 up to the temple line, #2 up to the section line. Blend each line with a half-guard or open-lever flick.',
      'Top: cut to 4–5 cm using scissor-over-fingers, slightly shorter (3–4 cm) at the crown.',
      'Texturize the top with point-cutting or thinning shears so it looks choppy, not blocky.',
      'Fringe: comb everything forward and cut a short, slightly uneven fringe ending about 2 cm above the eyebrows.',
      'Blend the top into the fade with scissor-over-comb so there is no hard line.',
      'Line up the temples, around the ears, and taper the neckline naturally.'
    ],
    styling: ['Towel-dry and rub a pea-sized amount of matte clay between your palms', 'Rough the hair forward with your fingertips', 'Pinch a few pieces at the fringe for texture'],
    products: 'Matte clay or texture powder', trim: 'Every 3–4 weeks',
    render: { top: 'messy', vol: .24, sides: 'fade', fringe: 'crop' }
  },
  {
    id: 'm_quiff', gender: 'male', name: 'Classic Quiff', length: 'short', maint: 2, vibe: 'Sharp · Confident',
    fit: { oval: .95, round: .9, square: .9, oblong: .4, heart: .55, diamond: .75, triangle: .9 },
    hair: { straight: .95, wavy: .9, curly: .5, coily: .3 },
    tags: ['height', 'tight-sides'],
    desc: 'Short tapered sides with a longer top that is blow-dried up and back at the front for height.',
    ask: 'Classic quiff — #2 taper on the sides blending to #3, 7–9 cm at the front of the top, getting shorter (4–5 cm) toward the crown. Texturize the front so it holds height.',
    guards: '#2 → #3 sides · 7–9 cm front, 4–5 cm crown',
    steps: [
      'Section the top from the corners of the forehead back to the crown.',
      'Sides & back: #2 taper blending into #3 near the top of the ears (or a low fade for a sharper look).',
      'Top: hold sections straight up and cut so the front is the longest (7–9 cm), getting gradually shorter to 4–5 cm at the crown.',
      'Point-cut the front 3–4 cm deep to remove weight, so it stands up instead of flopping.',
      'Blend the top into the sides with scissor-over-comb around the head — no hard line.',
      'Taper the neckline and clean up around the ears.'
    ],
    styling: ['Spray sea-salt or a pre-styler into damp hair', 'Blow-dry the front upward and back using a round brush', 'Finish with a medium-hold pomade or clay and shape with your fingers'],
    products: 'Pre-styler + medium-hold pomade or clay', trim: 'Every 3–4 weeks',
    render: { top: 'quiff', vol: .55, sides: 'short' }
  },
  {
    id: 'm_pompadour', gender: 'male', name: 'Modern Pompadour', length: 'short', maint: 3, vibe: 'Bold · Statement',
    fit: { oval: .9, round: .9, square: .85, oblong: .25, heart: .45, diamond: .6, triangle: .9 },
    hair: { straight: .9, wavy: .85, curly: .4, coily: .25 },
    tags: ['height', 'crown-volume', 'tight-sides', 'sleek'],
    desc: 'A bold, voluminous top swept up and back, with short faded sides for strong contrast.',
    ask: 'Modern pompadour — mid fade on the sides, 10–12 cm at the front of the top getting shorter toward the crown; keep the weight at the front for volume.',
    guards: '#1 → #2 → #3 fade · 10–12 cm at the front',
    steps: [
      'Section the top in a horseshoe shape from temple to temple around the crown.',
      'Sides & back: mid fade — #0.5/#1 at the bottom, #2 through the middle, blending into the top with #3–#4 at the section line.',
      'Top: keep the front longest (10–12 cm) and cut progressively shorter to about 6 cm at the crown, holding hair straight up (90°).',
      'Texturize only the ends — do not thin the roots; weight at the front is what creates volume.',
      'Connect the top to the faded sides with scissor-over-comb for a smooth transition.',
      'Sharpen the hairline and neckline with a trimmer.'
    ],
    styling: ['Blow-dry upward and back with a round brush', 'Use a high-shine pomade for a classic look, or matte clay for modern', 'Comb into shape, then push the front slightly forward to form the "pomp"'],
    products: 'Blow-dryer + pomade (shine) or clay (matte)', trim: 'Fade every 3 weeks, top every 6 weeks',
    render: { top: 'pomp', vol: .68, sides: 'fade' }
  },
  {
    id: 'm_sidepart', gender: 'male', name: 'Classic Side Part', length: 'short', maint: 2, vibe: 'Timeless · Professional',
    fit: { oval: 1, round: .8, square: .95, oblong: .8, heart: .85, diamond: .8, triangle: .7 },
    hair: { straight: 1, wavy: .9, curly: .5, coily: .4 },
    tags: ['asymmetry', 'tight-sides', 'side-fringe'],
    desc: 'A polished classic — neat tapered sides and a top combed to one side along a clean part.',
    ask: 'Classic side part — #2 taper on the sides up to a #3, 5–7 cm on top, part on my natural side, optional subtle hard-part line.',
    guards: '#2 → #3 sides · 5–7 cm on top',
    steps: [
      'Find the natural parting: comb hair straight back, push it gently forward — it splits at the natural part (usually above the outer corner of an eyebrow).',
      'Sides & back: #2 at the bottom blending into #3–#4 near the top of the sides; taper the neckline.',
      'Top: cut 5–7 cm with scissor-over-fingers, leaving the front slightly longer so it sweeps over.',
      'Blend the heavy side of the part into the top so there is no shelf.',
      'Optional: shave a subtle hard part (2–3 cm long) with a trimmer along the parting line.',
      'Clean up around the ears and the neckline.'
    ],
    styling: ['Towel-dry, then apply a matte or light-shine pomade', 'Comb hair to the side along the part', 'Lift the front slightly with a blow-dryer for volume'],
    products: 'Light-shine pomade or cream + comb', trim: 'Every 4 weeks',
    render: { top: 'part', part: 'side', vol: .28, sides: 'short' }
  },
  {
    id: 'm_buzz', gender: 'male', name: 'Buzz Cut', length: 'short', maint: 1, vibe: 'Clean · Effortless',
    fit: { oval: .9, round: .3, square: 1, oblong: .5, heart: .4, diamond: .6, triangle: .35 },
    hair: { straight: 1, wavy: 1, curly: 1, coily: .95 },
    tags: ['short-all-over', 'tight-sides'],
    desc: 'The cleanest, lowest-effort cut — the same short length all over that puts your face structure front and centre.',
    ask: 'Buzz cut — #3 all over (or #2 for shorter), with a #1 taper at the neckline and around the ears, natural line-up.',
    guards: '#3 all over · #1 taper at the edges',
    steps: [
      'Run the #3 guard over the whole head, going against the direction of hair growth.',
      'Go over the head again in different directions to catch any missed hairs.',
      'Taper the neckline and around the ears with a #1 (or a low fade #0 → #1 → #2).',
      'Line up the front hairline gently — keep it natural, not too sharp.',
      'Check the whole head shape for uneven patches.'
    ],
    styling: ['No product needed — just shampoo', 'Moisturize the scalp and use sunscreen on it outdoors'],
    products: 'None — scalp moisturizer & sunscreen', trim: 'Every 2–3 weeks',
    render: { top: 'buzz', vol: .045, sides: 'buzz' }
  },
  {
    id: 'm_crew', gender: 'male', name: 'Crew Cut', length: 'short', maint: 1, vibe: 'Neat · Classic',
    fit: { oval: .95, round: .6, square: .95, oblong: .6, heart: .6, diamond: .7, triangle: .55 },
    hair: { straight: .9, wavy: .9, curly: .75, coily: .7 },
    tags: ['tight-sides', 'short-all-over'],
    desc: 'Short and sharp: a tapered back and sides with a slightly longer top that is a touch longer at the front.',
    ask: 'Crew cut — #2 on the sides tapering to #1 at the neckline, 2.5–4 cm on top, slightly longer at the front, brushed up.',
    guards: '#2 sides, #1 neckline · 2.5–4 cm on top',
    steps: [
      'Sides & back: #2 guard up to where the head starts to curve; taper the bottom with #1.',
      'Top: scissor-over-comb or a #6–#8 guard, leaving 2.5–4 cm, slightly longer at the front hairline.',
      'Blend the top into the sides with a #3–#4 at the corners of the head.',
      'Shape the corners: slightly rounded for square faces, slightly squarer for round faces.',
      'Line up the temples and the neckline.'
    ],
    styling: ['A small amount of matte paste', 'Brush the front up, or forward for a casual look'],
    products: 'Matte paste', trim: 'Every 3–4 weeks',
    render: { top: 'flat', vol: .16, sides: 'short' }
  },
  {
    id: 'm_slickback', gender: 'male', name: 'Undercut Slick Back', length: 'medium', maint: 2, vibe: 'Polished · Bold',
    fit: { oval: .9, round: .7, square: .9, oblong: .3, heart: .4, diamond: .5, triangle: .75 },
    hair: { straight: .9, wavy: .8, curly: .3, coily: .2 },
    tags: ['sleek', 'tight-sides', 'height'],
    desc: 'Short undercut sides with a long top swept straight back — sharp, confident and polished.',
    ask: 'Slick-back undercut — #1–#2 on the sides and back, 10–15 cm on top, keep the weight so it lies back smoothly; light blend (or disconnected).',
    guards: '#1–#2 undercut · 10–15 cm on top',
    steps: [
      'Section the top from the corners of the forehead back to the crown in a rectangle.',
      'Sides & back: #1–#2 guard (or a skin fade for more contrast) up to the section line.',
      'Choose the connection: disconnected (hard line where top meets sides) or lightly blended with a #3 at the corners.',
      'Top: comb straight back and cut so the front is 10–15 cm, gradually shorter to ~8 cm at the crown.',
      'Remove only a little bulk from the mid-lengths so the hair lies flat when combed back.',
      'Line up the hairline and neckline.'
    ],
    styling: ['Apply pomade or styling cream to damp hair', 'Comb straight back', 'Blow-dry backward with a brush for volume, or leave sleek with a shiny pomade'],
    products: 'Water-based pomade + fine comb', trim: 'Every 4 weeks',
    render: { top: 'slick', vol: .26, sides: 'fade' }
  },
  {
    id: 'm_fauxhawk', gender: 'male', name: 'Faux Hawk', length: 'short', maint: 2, vibe: 'Edgy · Fun',
    fit: { oval: .8, round: .9, square: .75, oblong: .25, heart: .45, diamond: .7, triangle: .85 },
    hair: { straight: .85, wavy: .8, curly: .7, coily: .6 },
    tags: ['height', 'tight-sides'],
    desc: 'Faded sides with a longer strip down the middle, pushed up into a soft peak.',
    ask: 'Faux hawk — mid fade on the sides, 5–7 cm in the centre strip on top, a bit shorter toward the edges of the top so it peaks in the middle; heavily textured, blended (not a hard mohawk).',
    guards: '#0.5 → #1 → #2 fade · 5–7 cm centre strip',
    steps: [
      'Sides: mid fade #0.5 → #1 → #2, keeping a wider band of hair on top than a real mohawk.',
      'Top: cut the centre strip to 5–7 cm, slightly shorter (3–4 cm) toward the edges of the top so hair angles to the middle.',
      'Blend the top into the fade with scissor-over-comb — no hard lines.',
      'Point-cut the ends deeply for spiky texture.',
      'Clean up the neckline and around the ears.'
    ],
    styling: ['Apply matte clay or wax to dry hair', 'Push hair from both sides toward the centre', 'Pinch the middle upward into a soft peak'],
    products: 'Strong-hold matte clay or wax', trim: 'Every 3–4 weeks',
    render: { top: 'fauxhawk', vol: .52, sides: 'fade' }
  },
  {
    id: 'm_fringe', gender: 'male', name: 'Textured Fringe', length: 'medium', maint: 1, vibe: 'Relaxed · Youthful',
    fit: { oval: .85, round: .4, square: .8, oblong: 1, heart: .85, diamond: .95, triangle: .5 },
    hair: { straight: .9, wavy: 1, curly: .75, coily: .4 },
    tags: ['fringe', 'soft-texture', 'side-volume'],
    desc: 'A relaxed, longer top brushed forward into a soft fringe near the eyebrows, with natural, fuller sides.',
    ask: 'Textured fringe — #3–#4 on the sides with a low taper, 6–8 cm on top, fringe falling to just above my eyebrows, lots of texture.',
    guards: '#3–#4 sides, #2 low taper · 6–8 cm on top',
    steps: [
      'Sides & back: #3 or #4 guard with a low taper (#2) at the neckline and around the ears; keep the sides fuller.',
      'Top: cut 6–8 cm with point-cutting, layering it so it moves forward naturally.',
      'Fringe: comb forward and cut to sit just above the eyebrows, point-cutting for a soft, uneven edge.',
      'Thin out bulk on thick hair with texturizing shears.',
      'Blend the top and the sides with scissor-over-comb.'
    ],
    styling: ['Sea-salt spray on damp hair', 'Blow-dry forward using your fingers', 'A little matte paste to separate pieces'],
    products: 'Sea-salt spray + light matte paste', trim: 'Every 4–5 weeks',
    render: { top: 'messy', vol: .26, sides: 'medium', fringe: 'brow' }
  },
  {
    id: 'm_combover', gender: 'male', name: 'Comb Over Fade', length: 'short', maint: 2, vibe: 'Modern · Smart',
    fit: { oval: .9, round: .85, square: .85, oblong: .65, heart: .7, diamond: .75, triangle: .75 },
    hair: { straight: .95, wavy: .85, curly: .4, coily: .35 },
    tags: ['asymmetry', 'height', 'tight-sides'],
    desc: 'A modern side-swept style with lift at the front, a defined part and a crisp fade underneath.',
    ask: 'Comb over with a mid fade — skin/#0 at the bottom fading to #2, hard part on my natural side, 6–8 cm on top swept over with volume.',
    guards: '#0 → #1 → #2 mid fade · 6–8 cm on top',
    steps: [
      'Find the natural part and mark it; optionally shave a hard part with a trimmer.',
      'Sides & back: mid fade from foil/#0 at the bottom through #1 to #2, blending into the top.',
      'Top: 6–8 cm, longest at the front on the heavy side so it sweeps over.',
      'Layer the top so it can lift at the front.',
      'Blend the fade carefully under the part line.',
      'Line up the hairline and neckline.'
    ],
    styling: ['Blow-dry the hair up and over to the side', 'Comb a medium-hold pomade into place', 'Leave a little lift at the front'],
    products: 'Medium-hold pomade + blow-dryer', trim: 'Every 3 weeks',
    render: { top: 'part', part: 'side', vol: .4, sides: 'fade' }
  },
  {
    id: 'm_curlytop', gender: 'male', name: 'Curly Top Fade', length: 'short', maint: 1, vibe: 'Natural · Fresh',
    fit: { oval: .9, round: .8, square: .85, oblong: .5, heart: .7, diamond: .8, triangle: .8 },
    hair: { straight: .1, wavy: .7, curly: 1, coily: .85 },
    tags: ['height', 'soft-texture', 'tight-sides'],
    desc: 'Your natural curls kept longer on top with a clean fade on the sides — defined, fresh and low-effort.',
    ask: 'Curly top with a low/mid fade — keep 5–8 cm of curl on top, cut the curls dry so they fall into shape, a few curls falling forward, #1 → #2 → #3 fade on the sides.',
    guards: '#1 → #2 → #3 fade · 5–8 cm curls on top',
    steps: [
      'Cut curly hair DRY (or check the shape dry) — curls shrink, so cutting wet can make it far too short.',
      'Sides: low or mid fade #1 → #2 → #3 blending into the curls.',
      'Top: cut curl by curl, leaving 5–8 cm (when stretched), slightly shorter at the back for a rounded shape.',
      'Let a few curls fall forward and shape them to sit around mid-forehead.',
      'Remove bulk from inside the curls (not from the ends) so they clump nicely.',
      'Line up the edges.'
    ],
    styling: ['Wash with a gentle sulfate-free shampoo and always condition', 'Apply curl cream to soaking-wet hair and scrunch', "Air-dry or diffuse — don't brush when dry"],
    products: 'Curl cream or gel, diffuser', trim: 'Every 3–4 weeks',
    render: { top: 'curly', vol: .4, sides: 'fade', fringe: 'crop', texture: 'curly' }
  },
  {
    id: 'm_afrotaper', gender: 'male', name: 'Afro Taper', length: 'short', maint: 2, vibe: 'Bold · Natural',
    fit: { oval: .9, round: .75, square: .85, oblong: .45, heart: .7, diamond: .8, triangle: .8 },
    hair: { straight: 0, wavy: .2, curly: .7, coily: 1 },
    tags: ['height', 'crown-volume', 'tight-sides'],
    desc: 'A rounded (or slightly tall) natural top with a clean taper at the temples and neckline.',
    ask: 'Afro taper — shape the top into a rounded, slightly taller shape at 5–8 cm, taper the temples, behind the ears and the neckline from #1 to skin, crisp line-up.',
    guards: 'Temple/neck taper #1 → skin · 5–8 cm top',
    steps: [
      'Pick out (comb out) the hair fully with an afro pick so the length is even.',
      'Shape the top with clippers/scissors: rounded at the sides of the top, slightly higher in the middle/front to lengthen the face.',
      'Taper only around the temples, behind the ears and at the neckline — #1 down to skin. Keep everything else full.',
      'Check the silhouette from the front, both sides and the back; even it out.',
      'Line up the forehead, temples and neckline with a trimmer.'
    ],
    styling: ['Moisturize with leave-in conditioner + oil + cream (the "LOC" method)', 'Pick out the top for shape', 'Sleep with a satin durag or pillowcase'],
    products: 'Leave-in, oil, afro pick', trim: 'Taper every 2–3 weeks',
    render: { top: 'afro', vol: .46, sides: 'short', texture: 'coily' }
  },
  {
    id: 'm_caesar', gender: 'male', name: 'Caesar Cut', length: 'short', maint: 1, vibe: 'Neat · Easy',
    fit: { oval: .85, round: .55, square: .85, oblong: .85, heart: .75, diamond: .85, triangle: .5 },
    hair: { straight: .8, wavy: .9, curly: .85, coily: .95 },
    tags: ['fringe', 'short-all-over', 'tight-sides'],
    desc: 'Short, even length with a short horizontal fringe — neat, classic and very easy.',
    ask: 'Caesar cut — #3–#4 on top, #2 tapered sides, short straight fringe cut horizontally about 2–3 cm into the forehead.',
    guards: '#4 top, #2 → #1 sides',
    steps: [
      'Top: #4 guard (or scissor-over-comb at 2–3 cm), cutting forward.',
      'Sides & back: #2 tapering to #1 at the neckline.',
      'Comb the front forward and cut a straight, horizontal fringe that sits high on the forehead.',
      'Blend the top into the sides with a #3.',
      'Line up the temples and neckline.'
    ],
    styling: ['Brush forward', 'Optional: a little matte paste for texture'],
    products: 'Brush, optional matte paste', trim: 'Every 3 weeks',
    render: { top: 'flat', vol: .09, sides: 'short', fringe: 'caesar' }
  },
  {
    id: 'm_flow', gender: 'male', name: 'Medium Flow (Swept Back)', length: 'medium', maint: 2, vibe: 'Relaxed · Confident',
    fit: { oval: .9, round: .55, square: .85, oblong: .55, heart: .9, diamond: .85, triangle: .6 },
    hair: { straight: .85, wavy: 1, curly: .6, coily: .3 },
    tags: ['side-volume', 'soft-texture', 'chin-volume'],
    desc: 'Medium-length hair grown out to the neck, layered and swept back with natural movement.',
    ask: 'Medium flow — keep 10–15 cm on top and length to the neck/just below the ears, add long layers so it sweeps back, remove bulk around the ears, soft (not blunt) ends.',
    guards: 'Scissor cut · 10–15 cm top, neck-length back',
    steps: [
      'Set the length: back reaching the nape/collar, sides just below the ears.',
      'Cut long layers by lifting sections to 90° — removes weight while keeping length.',
      'Around the ears: remove bulk with point-cutting so the hair tucks behind the ears.',
      'Top: keep it longest at the front so it sweeps back.',
      'Soften the outline by point-cutting; avoid a heavy blunt line.',
      'Tidy the neckline without taking it too short.'
    ],
    styling: ['Air-dry with a light cream or sea-salt spray', 'Push the hair back with your fingers', 'Tuck behind the ears for a cleaner look'],
    products: 'Light styling cream or sea-salt spray', trim: 'Every 6–8 weeks',
    render: { top: 'slick', vol: .28, sides: 'long', len: 'jaw', layers: .5, frame: 0 }
  },
  {
    id: 'm_long', gender: 'male', name: 'Long Layered Hair', length: 'long', maint: 2, vibe: 'Free-spirited · Bold',
    fit: { oval: .9, round: .5, square: .85, oblong: .4, heart: .85, diamond: .8, triangle: .55 },
    hair: { straight: .85, wavy: .95, curly: .75, coily: .5 },
    tags: ['length-below-chin', 'face-framing', 'soft-texture', 'side-volume'],
    desc: 'Shoulder-length layered hair that can be worn down or tied up into a bun.',
    ask: 'Long layers — keep length at the shoulders, add long layers starting at the chin, a few face-framing pieces, point-cut ends.',
    guards: 'Scissor cut · shoulder length',
    steps: [
      'Trim 1–2 cm of split ends from the perimeter, keeping the length at the shoulders.',
      'Cut long layers by lifting to 90° with a guide at the top of the head at chin length.',
      'Add face-framing pieces from the cheekbone or chin down.',
      'Remove bulk on thick hair with point-cutting.',
      'Check it looks good both worn down and tied up.'
    ],
    styling: ['Leave-in conditioner + a little oil on the ends', 'Air-dry or diffuse for waves', 'Tie into a loose bun with a fabric hair tie'],
    products: 'Leave-in conditioner, hair oil', trim: 'Every 8–10 weeks',
    render: { top: 'part', part: 'center', vol: .14, sides: 'long', len: 'shoulder', layers: .5, frame: .45 }
  },
  {
    id: 'm_mullet', gender: 'male', name: 'Modern Mullet', length: 'medium', maint: 2, vibe: 'Trendy · Edgy',
    fit: { oval: .8, round: .6, square: .75, oblong: .5, heart: .7, diamond: .75, triangle: .6 },
    hair: { straight: .8, wavy: .95, curly: .85, coily: .5 },
    tags: ['soft-texture', 'fringe', 'crown-volume'],
    desc: 'A modern, textured take: shorter top and sides with a burst fade around the ears and extra length at the back.',
    ask: 'Modern mullet — burst fade around the ears, textured top 6–8 cm with a messy fringe, keep 8–12 cm of length at the back.',
    guards: 'Burst fade #0.5 → #2 · 6–8 cm top · 8–12 cm back',
    steps: [
      'Section off the back length (from the crown down to the nape, between the ears) — this stays long.',
      'Burst fade around the ears and temples: #0.5 → #1 → #2, curving around the ear (do not fade the back).',
      'Top: 6–8 cm, layered and point-cut; cut a messy fringe reaching mid-forehead.',
      'Back: keep 8–12 cm and add layers so it blends into the top.',
      'Texturize everything for a piece-y look.'
    ],
    styling: ['Sea-salt spray, rough-dry with your hands', 'Matte clay through the top', 'Let the back flow naturally'],
    products: 'Sea-salt spray + matte clay', trim: 'Every 4–6 weeks',
    render: { top: 'messy', vol: .3, sides: 'fade', fringe: 'crop', mullet: true }
  },
  {
    id: 'm_brushup', gender: 'male', name: 'Textured Brush Up', length: 'short', maint: 2, vibe: 'Sporty · Fresh',
    fit: { oval: .85, round: .9, square: .8, oblong: .3, heart: .55, diamond: .65, triangle: .85 },
    hair: { straight: .95, wavy: .8, curly: .4, coily: .3 },
    tags: ['height', 'tight-sides'],
    desc: 'A short, textured top brushed straight up for height, with neat tapered sides.',
    ask: 'Brush up — #2 taper on the sides, 4–6 cm on top, point-cut so it stands up with texture.',
    guards: '#2 → #1 sides · 4–6 cm on top',
    steps: [
      'Sides & back: #2 guard, tapering to #1 at the neckline.',
      'Top: 4–6 cm, slightly longer at the front.',
      'Point-cut deeply so the hair stands up on its own.',
      'Blend the corners of the top into the sides with scissor-over-comb.',
      'Clean up the edges.'
    ],
    styling: ['Blow-dry upward', 'Matte wax or fibre, pushed up with your fingertips'],
    products: 'Matte wax or fibre', trim: 'Every 3–4 weeks',
    render: { top: 'spiky', vol: .42, sides: 'short' }
  },
  {
    id: 'm_twists', gender: 'male', name: 'Twists with Taper', length: 'short', maint: 2, vibe: 'Stylish · Protective',
    fit: { oval: .9, round: .7, square: .85, oblong: .6, heart: .8, diamond: .85, triangle: .75 },
    hair: { straight: 0, wavy: .1, curly: .6, coily: 1 },
    tags: ['height', 'crown-volume', 'tight-sides'],
    desc: 'Natural twists on top (5–10 cm) with a clean taper on the sides — stylish and protective for coily hair.',
    ask: 'Taper with twists — #1 → #2 taper at the temples, around the ears and the nape; keep 5–10 cm on top shaped evenly, then two-strand or sponge twists on top.',
    guards: '#1 → #2 taper · 5–10 cm on top',
    steps: [
      'Wash, condition and stretch the hair; pick it out to see the real length.',
      'Shape the top evenly at 5–10 cm with scissors (rounded silhouette).',
      'Taper the temples, around the ears and the neckline (#1 → #2); keep the top full.',
      'Divide the top into small squares (1.5–2 cm).',
      'Apply twisting cream and two-strand twist each section — or use a twist sponge on shorter hair.',
      'Line up the edges.'
    ],
    styling: ['Moisturize twists with a light leave-in spray', 'Sleep in a satin durag or bonnet', 'Refresh the taper every 1–2 weeks'],
    products: 'Twisting cream, leave-in spray', trim: 'Taper every 2–3 weeks',
    render: { top: 'twists', vol: .44, sides: 'fade', texture: 'coily' }
  },

  /* =========================== WOMEN =========================== */
  {
    id: 'w_longlayers', gender: 'female', name: 'Long Face-Framing Layers', length: 'long', maint: 2, vibe: 'Soft · Elegant',
    fit: { oval: 1, round: .85, square: .85, oblong: .55, heart: .85, diamond: .9, triangle: .8 },
    hair: { straight: 1, wavy: 1, curly: .8, coily: .6 },
    tags: ['length-below-chin', 'face-framing', 'soft-texture'],
    desc: 'Length past the shoulders with long, soft layers and face-framing pieces from the cheekbones down.',
    ask: 'Long layers — keep my length past the shoulders, long layers starting around the chin, face-framing pieces from the cheekbones down, soft point-cut ends.',
    guards: 'Scissor cut · layers from chin length',
    steps: [
      'Comb hair straight down and set the outline first — dust 1–2 cm off the ends, keeping the length past the shoulders.',
      'Take a centre guide at the top of the head, lift it straight up (90°) and cut the shortest layer to sit at chin/collarbone level.',
      'Over-direct the back sections up to that guide so length stays at the back (classic long layers).',
      'Face-framing: take a triangle section at the front, comb it forward and cut on a diagonal from the cheekbone downward, getting longer toward the back.',
      'Point-cut all the ends so there are no heavy weight lines.',
      'Blow-dry with a round brush, check the layers in the mirror and refine any heavy spots.'
    ],
    styling: ['Use a heat protectant first', 'Blow-dry with a round brush, turning the ends away from your face', 'Or air-dry with a light mousse for natural movement'],
    products: 'Heat protectant, light serum', trim: 'Every 8–10 weeks',
    render: { top: 'part', part: 'side', vol: .14, sides: 'long', len: 'chest', layers: .6, frame: .6 }
  },
  {
    id: 'w_curtain', gender: 'female', name: 'Curtain Bangs & Layers', length: 'medium', maint: 2, vibe: 'Trendy · Romantic',
    fit: { oval: .95, round: .7, square: .9, oblong: 1, heart: .95, diamond: .9, triangle: .75 },
    hair: { straight: .95, wavy: 1, curly: .65, coily: .4 },
    tags: ['curtain', 'face-framing', 'soft-texture'],
    desc: 'Centre-parted bangs that sweep out to the cheekbones like opening curtains, blended into soft layers.',
    ask: 'Curtain bangs that start at nose-bridge/cheekbone length in the middle and blend into face-framing layers; soft layers through the rest, length around the shoulders.',
    guards: 'Scissor cut · bangs at cheekbone length',
    steps: [
      'Section a triangle at the front: corners at the temples, the point about 4–5 cm back from the hairline.',
      'Part the triangle down the middle. Hold each half straight down and cut at the bridge of the nose / top of the cheekbone (start longer — you can always go shorter).',
      'Pull each side across toward the opposite side and slide-cut, so the bangs get longer as they sweep outward.',
      'Blend the bangs into face-framing layers at the cheekbones and chin.',
      'Add soft long layers through the back (lifted to 90°) and point-cut the ends.',
      'Blow-dry the bangs with a round brush, rolling them away from the face.'
    ],
    styling: ['Blow-dry the bangs first with a round brush, rolling them back and away', 'Push each side outward toward your cheekbones', 'Dry shampoo at the bang roots keeps them fresh'],
    products: 'Small round brush, dry shampoo', trim: 'Bangs every 4–6 weeks, rest every 8–10',
    render: { top: 'part', part: 'center', vol: .14, sides: 'long', len: 'shoulder', fringe: 'curtain', layers: .5, frame: .7 }
  },
  {
    id: 'w_lob', gender: 'female', name: 'Textured Lob (Long Bob)', length: 'medium', maint: 1, vibe: 'Chic · Easy',
    fit: { oval: .95, round: .85, square: .85, oblong: .8, heart: .9, diamond: .9, triangle: .6 },
    hair: { straight: 1, wavy: .95, curly: .75, coily: .5 },
    tags: ['chin-volume', 'face-framing', 'soft-texture'],
    desc: 'A collarbone-length bob, slightly longer at the front, with soft textured ends instead of a heavy line.',
    ask: 'A lob that sits at the collarbone — slightly longer in front than at the back, soft textured ends, no heavy blunt line.',
    guards: 'Scissor cut · collarbone length',
    steps: [
      'Section the hair into back, sides and top. Start at the nape with a horizontal parting.',
      'Cut the nape guide 1–2 cm above the collarbone (hair drops when dry), at 0° elevation.',
      'Bring down each section and follow the guide, angling slightly so the front ends up 1–2 cm longer than the back.',
      'At the sides, comb straight down and connect to the back with a gentle forward angle.',
      'Point-cut or slide-cut the ends to soften the line and remove bulk on thick hair.',
      'Dry and check both sides match in the mirror.'
    ],
    styling: ['Loose waves with a 25 mm (1") curling iron, alternating directions', 'Or blow-dry straight with a slight bend at the ends', 'Finish with texture spray'],
    products: 'Texture spray, 25 mm curling iron', trim: 'Every 6–8 weeks',
    render: { top: 'part', part: 'side', vol: .12, sides: 'long', len: 'collar', layers: .3, frame: .45 }
  },
  {
    id: 'w_bob', gender: 'female', name: 'Classic Chin Bob', length: 'short', maint: 2, vibe: 'Sharp · Iconic',
    fit: { oval: .9, round: .3, square: .4, oblong: .9, heart: 1, diamond: 1, triangle: .3 },
    hair: { straight: 1, wavy: .85, curly: .6, coily: .4 },
    tags: ['chin-volume', 'blunt-line'],
    desc: 'A chin-length bob with a clean, polished line that adds fullness exactly at the jaw.',
    ask: 'Chin-length classic bob, cut at 0° for a clean line, with light internal texture so it moves.',
    guards: 'Scissor cut · chin length, 0° elevation',
    steps: [
      'Section the hair into four quadrants. Starting at the nape, take a thin horizontal section.',
      'Cut the guide at 0° elevation, at chin level (allow about 1 cm for the hair to drop when dry).',
      'Bring down each new section and cut to the guide, keeping the tension even.',
      'Sides: comb straight down (behind or in front of the ear, as worn) and cut to the chin line.',
      'Check both sides are level by pulling equal sections forward under the chin.',
      'Add subtle internal texture with point-cutting so the line stays crisp but not stiff.'
    ],
    styling: ['Blow-dry with a paddle or round brush, turning the ends slightly under', 'A drop of smoothing serum for shine'],
    products: 'Smoothing serum, round brush', trim: 'Every 5–6 weeks',
    render: { top: 'part', part: 'side', vol: .12, sides: 'long', len: 'chin', layers: .05, frame: .35, blunt: true }
  },
  {
    id: 'w_aline', gender: 'female', name: 'A-Line Bob', length: 'short', maint: 2, vibe: 'Edgy · Polished',
    fit: { oval: .9, round: .85, square: .75, oblong: .65, heart: .8, diamond: .75, triangle: .45 },
    hair: { straight: 1, wavy: .8, curly: .5, coily: .35 },
    tags: ['asymmetry', 'length-below-chin', 'face-framing'],
    desc: 'Short and stacked at the back, angling down so the front pieces fall just below the chin — slimming and sharp.',
    ask: 'A-line bob — short and slightly stacked at the nape, angling down so the front falls 3–4 cm below the chin.',
    guards: 'Scissor cut · front 3–4 cm below chin',
    steps: [
      'Section the back in a V shape. Cut the nape short (around the hairline) at low elevation.',
      'Build a little "stacking" by cutting each new section with slight elevation (15–30°) for volume at the back.',
      'Cut on a diagonal-forward line so each section gets longer toward the face.',
      'Front: comb straight down and cut 3–4 cm below the chin, connecting to the diagonal.',
      'Check symmetry by pulling both front pieces forward under the chin.',
      'Soften the edge with point-cutting.'
    ],
    styling: ['Blow-dry with a round brush, pulling the front forward', 'Flat iron for a sleek finish', 'Shine spray'],
    products: 'Round brush, flat iron, shine spray', trim: 'Every 5–6 weeks',
    render: { top: 'part', part: 'side', vol: .16, sides: 'long', len: 'chinplus', layers: .15, frame: .55, aline: true }
  },
  {
    id: 'w_pixie', gender: 'female', name: 'Textured Pixie', length: 'short', maint: 2, vibe: 'Bold · Fresh',
    fit: { oval: 1, round: .45, square: .55, oblong: .65, heart: .85, diamond: .8, triangle: .35 },
    hair: { straight: .95, wavy: .85, curly: .7, coily: .75 },
    tags: ['short-all-over', 'height', 'side-fringe'],
    desc: 'Short and tapered at the back and sides, with a longer, piece-y top and a wispy fringe.',
    ask: 'Classic pixie — short tapered back and sides around the ears, 5–8 cm on top with soft textured pieces and a wispy side fringe.',
    guards: 'Nape #3–#4 or scissor-over-comb · 5–8 cm on top',
    steps: [
      'Cut the back and nape short: scissor-over-comb or a #3–#4 clipper guard, tapering into the neck.',
      'Around the ears: cut a soft, rounded outline, leaving small wispy sideburns.',
      'Top: leave 5–8 cm, point-cutting at 90° to create texture and lift.',
      'Fringe: comb forward and cut a soft, wispy fringe at eyebrow level, sweeping slightly to one side.',
      'Blend the top into the sides so the shape is rounded, not boxy.',
      'Detail the edges and texturize to remove weight.'
    ],
    styling: ['A pea-sized amount of texture paste on towel-dried hair', 'Mess up the top with your fingers for lift', 'Sweep the fringe to the side'],
    products: 'Texture paste or pomade', trim: 'Every 4–5 weeks',
    render: { top: 'messy', vol: .24, sides: 'short', fringe: 'side' }
  },
  {
    id: 'w_longpixie', gender: 'female', name: 'Long Pixie with Side Sweep', length: 'short', maint: 2, vibe: 'Chic · Playful',
    fit: { oval: .95, round: .8, square: .75, oblong: .6, heart: .9, diamond: .85, triangle: .6 },
    hair: { straight: .95, wavy: .85, curly: .6, coily: .5 },
    tags: ['side-fringe', 'asymmetry', 'height'],
    desc: 'A softer, longer pixie: tapered nape, volume on top and a long fringe swept to the side.',
    ask: 'Long pixie — tapered nape, short around the ears, 8–10 cm on top, deep side part with a long sweeping fringe reaching the cheekbone.',
    guards: 'Nape #4 / scissor · 8–10 cm on top',
    steps: [
      'Find a deep side part (above the arch of the eyebrow).',
      'Back & nape: taper short with scissor-over-comb or a #4 guard, leaving a soft neckline.',
      'Sides: cut close around the ears, slightly longer on the heavy side of the part.',
      'Top: leave 8–10 cm, longest at the front; cut layers at 90° for lift.',
      'Fringe: sweep it to the heavy side and cut on a diagonal so it ends at the cheekbone.',
      'Point-cut throughout to remove weight and add movement.'
    ],
    styling: ['Volumizing mousse at the roots', 'Blow-dry the top up and over with a round brush', 'Finish with light-hold spray'],
    products: 'Volumizing mousse, light hairspray', trim: 'Every 5–6 weeks',
    render: { top: 'part', part: 'side', vol: .3, sides: 'medium', fringe: 'side' }
  },
  {
    id: 'w_shag', gender: 'female', name: 'Modern Shag', length: 'medium', maint: 1, vibe: 'Effortless · Laid-back',
    fit: { oval: .95, round: .75, square: .95, oblong: .85, heart: .8, diamond: .85, triangle: .75 },
    hair: { straight: .8, wavy: 1, curly: .9, coily: .55 },
    tags: ['soft-texture', 'crown-volume', 'curtain', 'face-framing'],
    desc: 'Shoulder-length with choppy layers, volume at the crown and a wispy curtain fringe — made to air-dry.',
    ask: 'Shoulder-length shag — lots of choppy layers with volume at the crown, shorter layers around the face, a wispy curtain fringe, texturized ends.',
    guards: 'Scissor/razor cut · shoulder length',
    steps: [
      'Set the outline at the shoulders, keeping it slightly uneven and textured.',
      'Make a short guide at the crown (10–15 cm) and lift the hair to 90°–180° to cut layers that get shorter on top.',
      'Work around the head following the guide so the layers concentrate at the crown and top.',
      'Cut a wispy curtain fringe and blend it into short face-framing layers at the cheekbones.',
      'Razor-cut or slide-cut through the layers for a choppy, piece-y finish.',
      'Finish by diffusing or air-drying with sea-salt spray to show the texture.'
    ],
    styling: ['Sea-salt spray or curl cream on damp hair', 'Scrunch and air-dry or diffuse', 'Twist a few front pieces for definition'],
    products: 'Sea-salt spray or curl cream', trim: 'Every 8 weeks',
    render: { top: 'messy', part: 'center', vol: .3, sides: 'long', len: 'shoulder', fringe: 'curtain', layers: .9, frame: .8 }
  },
  {
    id: 'w_butterfly', gender: 'female', name: 'Butterfly Cut', length: 'long', maint: 3, vibe: 'Glam · Voluminous',
    fit: { oval: .95, round: .8, square: .9, oblong: .75, heart: .85, diamond: .85, triangle: .8 },
    hair: { straight: .95, wavy: .95, curly: .6, coily: .4 },
    tags: ['face-framing', 'crown-volume', 'length-below-chin', 'soft-texture'],
    desc: 'Long hair with short, face-framing "wings" and lots of layers on top for a big, bouncy blow-out look.',
    ask: 'Butterfly cut — keep my length, add a short layer at the top/crown and face-framing layers from the cheekbones, longer layers underneath so it looks full but long.',
    guards: 'Scissor cut · face layers from cheekbone',
    steps: [
      'Section the top/crown in a horseshoe; the hair underneath keeps the long length.',
      'Lower section: trim the outline lightly and add long layers at 45°.',
      'Top section: pull it forward to the front of the face and cut it at chin-to-collarbone level — this creates the short "wings".',
      'Release it: the shorter layers fall around the face and over the long layers.',
      'Face-framing: cut from the cheekbone downward, blending into the top layer.',
      'Point-cut and slide-cut to blend everything smoothly.'
    ],
    styling: ['Blow-dry in sections with a big round brush, rolling away from the face', 'Or set the top layers in velcro rollers for a blow-out look', 'Light shine spray to finish'],
    products: 'Large round brush, velcro rollers', trim: 'Every 8 weeks',
    render: { top: 'part', part: 'center', vol: .3, sides: 'long', len: 'chest', layers: .7, frame: .95, flick: true }
  },
  {
    id: 'w_sideswept', gender: 'female', name: 'Side-Swept Bangs & Long Layers', length: 'long', maint: 2, vibe: 'Classic · Flattering',
    fit: { oval: .9, round: .95, square: .95, oblong: .85, heart: 1, diamond: .9, triangle: .8 },
    hair: { straight: 1, wavy: .9, curly: .55, coily: .35 },
    tags: ['side-fringe', 'asymmetry', 'length-below-chin', 'face-framing'],
    desc: 'A deep side part with a diagonal, sweeping fringe and long layers — flattering on almost everyone.',
    ask: 'Long layers with side-swept bangs — deep side part, bangs cut on a diagonal from eyebrow to cheekbone, long layers from the chin down.',
    guards: 'Scissor cut · diagonal fringe',
    steps: [
      'Find the side part; take a triangle section for the fringe on the heavy side.',
      'Comb the fringe across the forehead and cut on a diagonal: shortest near the part (eyebrow level), longest at the cheekbone.',
      'Point-cut the fringe edge so it blends softly.',
      'Cut long layers through the rest, lifted to 90°, starting around chin length.',
      'Blend the fringe into the face-framing layers.',
      'Dust the ends to remove split ends.'
    ],
    styling: ['Blow-dry the fringe across the forehead with a flat brush', 'Loose curls or waves through the lengths', 'Light hairspray to hold the sweep'],
    products: 'Flat brush, light hairspray', trim: 'Fringe every 4–6 weeks',
    render: { top: 'part', part: 'side', vol: .16, sides: 'long', len: 'chest', fringe: 'side', layers: .5, frame: .6 }
  },
  {
    id: 'w_blunt', gender: 'female', name: 'Blunt Shoulder-Length Cut', length: 'medium', maint: 1, vibe: 'Sleek · Minimal',
    fit: { oval: .9, round: .55, square: .5, oblong: .75, heart: .8, diamond: .75, triangle: .5 },
    hair: { straight: 1, wavy: .75, curly: .45, coily: .35 },
    tags: ['blunt-line', 'sleek'],
    desc: 'One length at the shoulders with a strong, glossy line — minimal and very easy to maintain.',
    ask: 'One-length blunt cut at the shoulders, cut at 0° for a strong clean line, lightly bevelled at the ends.',
    guards: 'Scissor cut · 0° elevation, shoulder length',
    steps: [
      'Section into four quadrants; start at the nape with a thin horizontal section.',
      'Cut a straight guide at shoulder level with 0° elevation (hair hanging naturally).',
      'Bring down each section and cut to the guide with even tension.',
      'Sides: cut to the same level, checking both sides match in the mirror.',
      'Dry the hair and refine the line (dry hair shows the true line).'
    ],
    styling: ['Flat iron for a sleek, glossy look', 'Or a soft bend at the ends with a round brush', 'Shine serum'],
    products: 'Shine serum, flat iron', trim: 'Every 8 weeks',
    render: { top: 'part', part: 'center', vol: .08, sides: 'long', len: 'shoulder', layers: 0, frame: .3, blunt: true }
  },
  {
    id: 'w_wolf', gender: 'female', name: 'Wolf Cut', length: 'medium', maint: 1, vibe: 'Edgy · Trendy',
    fit: { oval: .9, round: .7, square: .85, oblong: .75, heart: .7, diamond: .8, triangle: .8 },
    hair: { straight: .8, wavy: .95, curly: .9, coily: .5 },
    tags: ['soft-texture', 'crown-volume', 'curtain', 'side-volume'],
    desc: 'A shag-meets-mullet hybrid: heavy crown layers, curtain bangs and wispy, tapered lengths.',
    ask: 'Wolf cut — heavy short layers at the crown and top, curtain bangs, tapered choppy lengths around the shoulders, very textured (razor if possible).',
    guards: 'Razor/scissor cut · shoulder length',
    steps: [
      'Cut the curtain bangs first (centre-parted, cheekbone length).',
      'Make a short crown guide (8–12 cm) and cut layers with the hair pulled straight up (180°) for maximum volume on top.',
      'Keep length at the back/shoulders but thin and taper it so it looks wispy, like a soft mullet.',
      'Blend the sides into the bangs with face-framing layers.',
      'Razor-cut or slide-cut throughout for a shaggy texture.'
    ],
    styling: ['Texturizing spray or mousse', 'Diffuse or air-dry', 'Scrunch for volume and separate the bangs with your fingers'],
    products: 'Texturizing spray or mousse', trim: 'Every 6–8 weeks',
    render: { top: 'messy', part: 'center', vol: .36, sides: 'long', len: 'shoulder', fringe: 'curtain', layers: 1, frame: .8 }
  },
  {
    id: 'w_curlylayers', gender: 'female', name: 'Curly Rounded Layers', length: 'medium', maint: 1, vibe: 'Natural · Bouncy',
    fit: { oval: .95, round: .7, square: .9, oblong: .8, heart: .85, diamond: .85, triangle: .7 },
    hair: { straight: .05, wavy: .7, curly: 1, coily: .85 },
    tags: ['soft-texture', 'side-volume', 'chin-volume'],
    desc: 'Cut dry, curl by curl, into rounded layers so your curls stack with volume on top — no triangle shape.',
    ask: 'Curly layered cut — cut dry, curl by curl, with rounded layers so the curls stack and have volume at the top, no triangle shape; length around the shoulders.',
    guards: 'Dry curl-by-curl cut · shoulder length',
    steps: [
      'Cut DRY, with hair in its natural curl pattern (no stretching) — each curl is cut where it naturally sits.',
      'Start at the face and cut each curl clump where it starts to look heavy, building a rounded shape.',
      'Add layers around the crown so curls have room to spring up (this prevents a triangle/pyramid shape).',
      'Remove weight at the bottom so the shape is balanced, not bottom-heavy.',
      'Check the silhouette from every angle and refine individual curls.'
    ],
    styling: ['Sulfate-free shampoo; condition generously', 'Leave-in + curl cream or gel on soaking-wet hair, then scrunch', 'Diffuse on low heat or air-dry, then "scrunch out the crunch"'],
    products: 'Leave-in, curl cream/gel, diffuser', trim: 'Every 8–12 weeks',
    render: { top: 'curly', vol: .34, sides: 'long', len: 'shoulder', layers: .6, frame: .55, texture: 'curly' }
  },
  {
    id: 'w_tapered', gender: 'female', name: 'Tapered Natural Cut', length: 'short', maint: 1, vibe: 'Bold · Low-effort',
    fit: { oval: .95, round: .6, square: .8, oblong: .6, heart: .85, diamond: .85, triangle: .65 },
    hair: { straight: 0, wavy: .1, curly: .7, coily: 1 },
    tags: ['short-all-over', 'height', 'crown-volume'],
    desc: 'A short natural shape: tapered at the nape and around the ears, fuller and rounded on top.',
    ask: 'Tapered natural cut — shorter at the nape and around the ears, fuller and longer on top (5–8 cm) shaped round, cut on picked-out hair.',
    guards: 'Nape/sides #1–#3 · 5–8 cm on top',
    steps: [
      'Pick out the hair to see the full length.',
      'Taper the nape and around the ears short (#1–#3 clipper or scissor-over-comb).',
      'Shape the top round and full at 5–8 cm, longest at the crown and front.',
      'Blend the taper into the fuller top so the shape flows.',
      'Shape the hairline gently.'
    ],
    styling: ['Leave-in conditioner + curl cream or gel', 'Finger-coil or wash-and-go', 'Satin bonnet at night'],
    products: 'Leave-in, curl cream, satin bonnet', trim: 'Every 4–6 weeks',
    render: { top: 'afro', vol: .34, sides: 'short', texture: 'coily' }
  },
  {
    id: 'w_feathered', gender: 'female', name: 'Feathered Layers', length: 'medium', maint: 3, vibe: 'Bouncy · Glam',
    fit: { oval: .95, round: .8, square: .9, oblong: .7, heart: .9, diamond: .85, triangle: .85 },
    hair: { straight: .95, wavy: .9, curly: .5, coily: .35 },
    tags: ['face-framing', 'soft-texture', 'side-volume'],
    desc: 'Shoulder length with lots of soft layers that flick away from the face — bouncy and glamorous.',
    ask: 'Feathered layers — shoulder length, lots of soft layers that flick away from the face; shortest layer around the cheekbones.',
    guards: 'Scissor/razor cut · shoulder length',
    steps: [
      'Set the length at or just below the shoulders.',
      'Take a guide at the top centre at chin length and lift to 90°–180° to create layers throughout.',
      'Face-framing: over-direct the front sections back and cut on a diagonal so they flick away from the face.',
      'Slide-cut or razor-cut the layers to "feather" the ends.',
      'Blow-dry to check the movement and refine.'
    ],
    styling: ['Volumizing mousse at the roots', 'Blow-dry with a big round brush, flicking the ends away from your face', 'Flexible-hold hairspray'],
    products: 'Mousse, large round brush, hairspray', trim: 'Every 6–8 weeks',
    render: { top: 'part', part: 'side', vol: .26, sides: 'long', len: 'shoulder', layers: .7, frame: .85, flick: true }
  },
  {
    id: 'w_fringe', gender: 'female', name: 'Wispy Fringe & Long Hair', length: 'long', maint: 2, vibe: 'Sweet · Soft',
    fit: { oval: .85, round: .4, square: .65, oblong: 1, heart: .75, diamond: .8, triangle: .55 },
    hair: { straight: 1, wavy: .8, curly: .45, coily: .3 },
    tags: ['fringe', 'length-below-chin'],
    desc: 'A light, see-through fringe that grazes the eyebrows, with long hair and soft layers.',
    ask: 'Wispy see-through fringe that grazes my eyebrows, with long hair and soft long layers.',
    guards: 'Scissor cut · fringe at brow level',
    steps: [
      'Take a shallow triangle section for the fringe (not too deep — that keeps it wispy and light).',
      'Comb it down with no tension and cut just below the eyebrows (it springs up), using point-cutting.',
      'Thin the fringe with point-cutting so the forehead shows through.',
      'Blend the sides of the fringe into the face-framing pieces.',
      'Add soft long layers through the lengths.'
    ],
    styling: ['Blow-dry the fringe first, side to side with a flat brush', 'Dry shampoo on the fringe keeps it airy', 'Lengths: straight or loose waves'],
    products: 'Flat brush, dry shampoo', trim: 'Fringe every 3–4 weeks',
    render: { top: 'part', part: 'none', vol: .12, sides: 'long', len: 'chest', fringe: 'wispy', layers: .4, frame: .45 }
  },
  {
    id: 'w_afro', gender: 'female', name: 'Rounded Natural Afro', length: 'medium', maint: 2, vibe: 'Striking · Natural',
    fit: { oval: .9, round: .65, square: .85, oblong: .8, heart: .8, diamond: .85, triangle: .7 },
    hair: { straight: 0, wavy: .1, curly: .75, coily: 1 },
    tags: ['side-volume', 'crown-volume', 'soft-texture'],
    desc: 'Your natural texture sculpted into a balanced, rounded silhouette — slightly taller on top.',
    ask: 'Shape my natural hair into a rounded silhouette — cut on picked-out hair, a little longer on top to avoid a flat top, balanced at the sides.',
    guards: 'Sculpted scissor cut on picked-out hair',
    steps: [
      'Detangle and pick out the hair (or blow out on low heat) to see the true shape.',
      'Decide the silhouette: rounded or oval (slightly taller on top for round/square faces).',
      'Sculpt: trim small bits at a time all around the head, constantly checking symmetry.',
      'Keep the sides slightly shorter than the top for a flattering oval outline.',
      'Finish by fluffing and checking from all angles.'
    ],
    styling: ['LOC method: leave-in, oil, cream', 'Pick out for volume', 'Satin bonnet or pillowcase at night'],
    products: 'Leave-in, oil, cream, afro pick', trim: 'Every 8–12 weeks',
    render: { top: 'afro', vol: .58, sides: 'full', texture: 'coily' }
  }
];

/* ---------------------------------------------------------------------
   3. HAIR COLOURS by skin depth (light / medium / deep) × undertone
   --------------------------------------------------------------------- */
HS.HAIR_COLOURS = {
  light: {
    warm: [
      { name: 'Honey Brown', hex: '#8a5a32', tip: 'Warm, golden brown that brings a healthy glow to light warm skin.' },
      { name: 'Golden Blonde', hex: '#c2914a', tip: 'Sunny blonde that echoes your golden undertone.' },
      { name: 'Copper', hex: '#a2482a', tip: 'Rich copper makes warm, light skin look radiant.' },
      { name: 'Strawberry Blonde', hex: '#b97a4e', tip: 'A soft red-gold blend for a fresh, youthful look.' }
    ],
    cool: [
      { name: 'Ash Brown', hex: '#5f544c', tip: 'Smoky, cool brown that keeps pink tones in check.' },
      { name: 'Soft Black', hex: '#22201f', tip: 'Striking contrast with cool, fair skin.' },
      { name: 'Ash Blonde', hex: '#a39a84', tip: 'Cool, beige-grey blonde — never brassy.' },
      { name: 'Platinum', hex: '#d8d1c0', tip: 'High-fashion icy blonde; best for very fair, cool skin.' }
    ],
    neutral: [
      { name: 'Mushroom Brown', hex: '#6e5d50', tip: 'A soft, greige brown that flatters neutral skin.' },
      { name: 'Chestnut', hex: '#5f3622', tip: 'Balanced warm-and-cool brown with natural depth.' },
      { name: 'Beige Blonde', hex: '#b39672', tip: 'Neither gold nor ash — sits perfectly on neutral skin.' },
      { name: 'Natural Dark Brown', hex: '#3a2a20', tip: 'Classic, low-maintenance and always flattering.' }
    ]
  },
  medium: {
    warm: [
      { name: 'Caramel Balayage', hex: '#94602f', tip: 'Caramel ribbons light up warm, medium skin instantly.' },
      { name: 'Golden Chestnut', hex: '#6e4224', tip: 'A rich brown with gold reflections — natural but glowing.' },
      { name: 'Copper Brown', hex: '#7c3a20', tip: 'A warm, reddish brown that makes golden skin glow.' },
      { name: 'Natural Dark Brown', hex: '#34241b', tip: 'Deep, natural and effortless.' }
    ],
    cool: [
      { name: 'Espresso', hex: '#2e221d', tip: 'Deep cool brown — sharp and polished.' },
      { name: 'Burgundy', hex: '#55202b', tip: 'Wine-red tones complement cool undertones beautifully.' },
      { name: 'Ash Brown', hex: '#4e443e', tip: 'Cool brown that avoids brassiness.' },
      { name: 'Soft Black', hex: '#1d1b1b', tip: 'Clean, high-contrast and classic.' }
    ],
    neutral: [
      { name: 'Chocolate Brown', hex: '#46291d', tip: 'Rich and balanced — flattering on neutral, medium skin.' },
      { name: 'Mocha', hex: '#6a4a36', tip: 'A soft, creamy brown for a gentle glow-up.' },
      { name: 'Soft Caramel Highlights', hex: '#8c6038', tip: 'Subtle lighter pieces around the face add brightness.' },
      { name: 'Natural Black', hex: '#1d1918', tip: 'Timeless, glossy and low-maintenance.' }
    ]
  },
  deep: {
    warm: [
      { name: 'Rich Chocolate', hex: '#3a2216', tip: 'Warm, deep brown that makes rich skin glow.' },
      { name: 'Honey Highlights', hex: '#94602b', tip: 'Honey-gold pieces add a luminous, sun-kissed effect.' },
      { name: 'Mahogany', hex: '#4c1e16', tip: 'Red-brown depth that flatters warm, deep skin.' },
      { name: 'Natural Black', hex: '#1a1615', tip: 'Glossy, natural and always elegant.' }
    ],
    cool: [
      { name: 'Blue-Black', hex: '#14151c', tip: 'A cool, glossy black that makes cool, deep skin look luminous.' },
      { name: 'Burgundy / Plum', hex: '#4a1630', tip: 'Jewel-toned red-violet looks stunning on cool, deep skin.' },
      { name: 'Espresso', hex: '#271b17', tip: 'Deep, cool brown with a soft sheen.' },
      { name: 'Jet Black', hex: '#0f0e0e', tip: 'Bold, classic and high-shine.' }
    ],
    neutral: [
      { name: 'Natural Black', hex: '#1b1716', tip: 'Glossy, natural and flattering.' },
      { name: 'Dark Chocolate', hex: '#2e1f18', tip: 'A soft step lighter than black for dimension.' },
      { name: 'Deep Auburn', hex: '#55241a', tip: 'A subtle red-brown for a warm glow.' },
      { name: 'Mocha Highlights', hex: '#6a4a36', tip: 'Soft brown highlights add depth without a big change.' }
    ]
  }
};

/* ---------------------------------------------------------------------
   4. BEARDS (men) and which face shapes they flatter
   --------------------------------------------------------------------- */
HS.BEARDS = {
  none: { name: 'Clean Shaven', desc: 'Smooth and fresh.', barber: 'Hot-towel shave or close electric shave; moisturize after.' },
  stubble: { name: 'Designer Stubble', desc: 'Even 3–5 day growth — adds shadow and definition to the jaw.', barber: 'Trimmer at 2–3 mm all over; neckline one finger above the Adam’s apple; leave the cheek line natural.' },
  boxed: { name: 'Short Boxed Beard', desc: 'Neat, short beard with clean, defined lines.', barber: '6–9 mm on the cheeks, 10–15 mm on the chin; sharp cheek line; neckline two fingers above the Adam’s apple; mustache trimmed just above the lip.' },
  full: { name: 'Full Rounded Beard', desc: 'Fuller beard with a softly rounded shape at the chin.', barber: '12–25 mm overall, shorter on the sides (8–10 mm) and rounded at the chin; tidy neckline; blend the mustache in.' },
  goatee: { name: 'Extended Goatee', desc: 'Mustache plus chin beard, cheeks shaved — adds length to the face.', barber: 'Shave the cheeks; keep the mustache and chin beard at 6–12 mm; leave the chin slightly longer and squared off to add length.' },
  circle: { name: 'Circle Beard', desc: 'Rounded mustache connected to a chin beard — softens a strong jaw.', barber: 'Shave the cheeks and sides of the jaw; keep a rounded mustache connected to the chin beard at 6–10 mm; round the shape around the mouth.' }
};
HS.BEARD_FOR_SHAPE = {
  oval: { recs: ['boxed', 'stubble'], tip: 'Your balanced shape suits almost any beard — keep it neat and even.' },
  round: { recs: ['goatee', 'boxed'], tip: 'Keep the sides short and the chin longer — it adds length and angles.' },
  square: { recs: ['circle', 'full'], tip: 'Rounded beard shapes soften a strong, square jaw.' },
  oblong: { recs: ['boxed', 'stubble'], tip: 'Keep the sides fuller and the chin short — avoid long chin beards that add length.' },
  heart: { recs: ['full', 'boxed'], tip: 'A fuller beard adds width to a narrower chin and balances the forehead.' },
  diamond: { recs: ['full', 'goatee'], tip: 'Fullness at the chin balances wide cheekbones.' },
  triangle: { recs: ['stubble', 'goatee'], tip: 'Keep the jaw area short; focus the beard on the chin and mustache.' }
};

/* ---------------------------------------------------------------------
   5. SKIN TONES — ITA° categories (Chardon et al. 1991) mapped to
      everyday names and the approximate Fitzpatrick type.
   --------------------------------------------------------------------- */
HS.SKIN_TONES = [
  { id: 'very-fair', minITA: 55, name: 'Very Fair', alias: 'Porcelain', fitz: 'I', depth: 'light' },
  { id: 'fair', minITA: 41, name: 'Fair', alias: 'Ivory / Light', fitz: 'II', depth: 'light' },
  { id: 'medium', minITA: 28, name: 'Medium', alias: 'Wheatish / Beige', fitz: 'III', depth: 'medium' },
  { id: 'tan', minITA: 10, name: 'Tan', alias: 'Golden / Caramel', fitz: 'IV', depth: 'medium' },
  { id: 'brown', minITA: -30, name: 'Brown', alias: 'Bronze / Chestnut', fitz: 'V', depth: 'deep' },
  { id: 'deep', minITA: -Infinity, name: 'Deep', alias: 'Espresso / Ebony', fitz: 'VI', depth: 'deep' }
];
/* Monk Skin Tone scale (Google, 2022) — 10 reference swatches */
HS.MONK_SCALE = ['#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96', '#a07e56', '#825c43', '#604134', '#3a312a', '#292420'];

HS.UNDERTONES = {
  warm: { name: 'Warm', desc: 'Golden, peachy or yellow hints. Gold jewellery usually looks best on you.' },
  neutral: { name: 'Neutral', desc: 'A balance of warm and cool. Both gold and silver suit you.' },
  cool: { name: 'Cool', desc: 'Pink, rosy or bluish hints. Silver jewellery usually looks best on you.' }
};

HS.HAIR_TYPES = {
  straight: { name: 'Straight', note: 'lies flat from root to tip' },
  wavy: { name: 'Wavy', note: 'loose S-shaped bends' },
  curly: { name: 'Curly', note: 'defined spiral curls' },
  coily: { name: 'Coily', note: 'tight coils or zig-zags' }
};
