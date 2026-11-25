/* HairyStylo — data_long.js: more LONG and medium-long cuts for men (added to the same list). */
(function () {
  'use strict';
  const F = (o, r, s, ob, h, d, t) => ({ oval: o, round: r, square: s, oblong: ob, heart: h, diamond: d, triangle: t });
  HS.HAIRSTYLES.push(
    {
      id: 'm_surfer', gender: 'male', name: 'Surfer Hair (Long Textured Waves)', length: 'long', maint: 1, vibe: 'Beachy · Relaxed',
      fit: F(.95, .75, .9, .8, .9, .88, .75), hair: { straight: .8, wavy: 1, curly: .75, coily: .1 }, tags: ['soft-texture', 'face-framing', 'length-below-chin'],
      desc: 'Longer, tousled hair that falls to the collar with natural movement and a lived-in, sea-salt texture.',
      ask: 'Surfer hair — keep the length at the ears to the collar (15–25 cm on top), cut long layers with a point-cut for a loose, messy, textured finish, nothing blunt, leave the fringe long enough to tuck behind the ears.',
      guards: 'Scissors only · 15–25 cm, long layers',
      steps: ['Cut the hair dry so you can see how it falls.', 'Take only 1–2 cm off the ends and leave the length.', 'Add long layers and point-cut the ends for a loose, separated texture.', 'Keep the front long enough to tuck behind the ears or sweep to the side.', 'Do not cut a hard line at the back; soften it.'],
      styling: ['Apply sea-salt spray on damp hair and scrunch', 'Air-dry or rough-dry with fingers', 'Finish with a pinch of matte paste for texture'],
      products: 'Sea-salt spray, matte paste', trim: 'Every 8–10 weeks',
      render: { top: 'messy', vol: .3, sides: 'long', len: 'collar', layers: .6, frame: .5, texture: 'wavy' }
    },
    {
      id: 'm_manbun', gender: 'male', name: 'Long Hair with Undercut (Man Bun)', length: 'long', maint: 2, vibe: 'Edgy · Modern',
      fit: F(.92, .85, .88, .6, .8, .85, .85), hair: { straight: 1, wavy: .9, curly: .8, coily: .6 }, tags: ['height', 'tight-sides', 'face-framing'],
      desc: 'Long hair on top that can be worn down or tied up in a bun, with the sides and back cut short for contrast and comfort.',
      ask: 'Long top with an undercut — #2–#3 on the sides and back (disconnected), keep 15–20 cm of length on top so it can be worn down or tied into a bun, clean neckline.',
      guards: 'Undercut #2–#3 · 15–20 cm on top',
      steps: ['Section the long top hair and clip it out of the way.', 'Clip the sides and back with a #2–#3 guard, up to the temple and crown line.', 'Keep the top at least 15–20 cm so it can be tied up.', 'Blend lightly where the long hair meets the undercut, or leave it clearly disconnected.', 'Clean the neckline.'],
      styling: ['Use a light cream or pomade to control frizz', 'Tie it up with a soft elastic (not a rubber band)', 'Do not tie tightly at the hairline'],
      products: 'Light cream or pomade, soft hair ties', trim: 'Undercut every 3–4 weeks',
      render: { top: 'slick', vol: .34, sides: 'fade', texture: 'straight' }
    },
    {
      id: 'm_longfringe', gender: 'male', name: 'Long Curtain Fringe', length: 'long', maint: 2, vibe: 'Smooth · Cool',
      fit: F(.95, .7, .85, .85, .92, .8, .7), hair: { straight: 1, wavy: .9, curly: .6, coily: .2 }, tags: ['curtain', 'face-framing', 'soft-texture'],
      desc: 'A centre part with long, face-framing curtains that fall to the cheeks or jaw, layered so it moves.',
      ask: 'Long curtain fringe — centre part, curtains falling past the eyebrows to the cheekbones, 12–18 cm of layered length on top, ends point-cut for movement, back and sides kept long and blended.',
      guards: 'Scissors only · centre part · 12–18 cm layered length',
      steps: ['Cut dry, with the hair parted in the centre.', 'Leave the front long and angle the curtains from the eyebrow down to the cheekbone.', 'Add long layers through the sides and back.', 'Point-cut the ends for movement.', 'Check that both curtains are symmetrical.'],
      styling: ['Blow-dry the curtains away from the face', 'Finish with sea-salt spray or a light cream', 'Tuck behind the ears or leave them framing the face'],
      products: 'Light cream, sea-salt spray', trim: 'Every 8–10 weeks',
      render: { top: 'messy', vol: .28, sides: 'long', len: 'jaw', layers: .5, frame: .7, fringe: 'curtain', texture: 'straight' }
    }
  );
})();
