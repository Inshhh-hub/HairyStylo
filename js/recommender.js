/* =====================================================================
   HairyStylo — recommender.js
   ---------------------------------------------------------------------
   A "content-based recommender": every hairstyle in data.js is scored
   against YOUR profile, then sorted from best to worst.

     score = 55% face-shape fit      (blended over the shape probabilities)
           + 25% hair-type fit       (straight / wavy / curly / coily)
             (and cuts that don't suit your hair type are pushed down further)
           + 12% length preference
           +  8% maintenance preference

   It also explains every pick in plain words (the "why"), lists the
   styles to avoid, picks hair colours for your skin tone and (for men)
   beard styles for your face shape.
   ===================================================================== */
window.HS = window.HS || {};

HS.Recommender = (function () {
  'use strict';
  const W = { shape: 0.55, hair: 0.25, length: 0.12, maint: 0.08 };
  const LEN_ORDER = ['short', 'medium', 'long'];

  /* face-shape fit: average the style's rating over your shape
     probabilities (so a face that is 60% oval / 30% round gets a
     blend of both — this makes the result robust to small errors) */
  function shapeFit(style, probs) {
    let s = 0, tot = 0;
    Object.entries(probs).forEach(([shape, p]) => { s += p * (style.fit[shape] ?? 0.5); tot += p; });
    return tot ? s / tot : 0.5;
  }
  function lengthFit(style, pref) {
    if (!pref || pref === 'any') return 1;
    const d = Math.abs(LEN_ORDER.indexOf(style.length) - LEN_ORDER.indexOf(pref));
    return [1, 0.55, 0.2][d];
  }
  function maintFit(style, pref) {
    if (!pref || pref === 'any') return 1;
    const want = { low: 1, medium: 2, high: 3 }[pref];
    const over = style.maint - want;
    return over <= 0 ? 1 : over === 1 ? 0.6 : 0.3;
  }

  function reasonsFor(style, shapeKey, hairType) {
    const fs = HS.FACE_SHAPES[shapeKey];
    const reasons = [], cautions = [];
    style.tags.forEach(t => { if (fs.likes[t]) reasons.push(fs.likes[t]); });
    style.tags.forEach(t => { if (fs.dislikes[t]) cautions.push(fs.dislikes[t]); });
    const hf = style.hair[hairType] ?? 0.5;
    const ht = HS.HAIR_TYPES[hairType].name.toLowerCase();
    if (hf >= 0.9) reasons.push(`Works naturally with your ${ht} hair`);
    else if (hf >= 0.6) reasons.push(`Works with your ${ht} hair with a little styling`);
    else cautions.push(`Takes extra styling effort with ${ht} hair`);
    return { reasons: reasons.slice(0, 4), cautions };
  }

  /**
   * profile = { gender, hairType, lengthPref, maintPref, shapeProbs, shape }
   */
  function rank(profile) {
    const styles = HS.HAIRSTYLES.filter(s => s.gender === profile.gender);
    const results = styles.map(style => {
      const sf = shapeFit(style, profile.shapeProbs);
      const hf = style.hair[profile.hairType] ?? 0.5;
      const lf = lengthFit(style, profile.lengthPref);
      const mf = maintFit(style, profile.maintPref);
      // hair type is a hard requirement: a cut that doesn't suit your natural texture is pushed down the list
      const gate = hf >= 0.7 ? 1 : 0.45 + 0.55 * Math.pow(hf / 0.7, 2);
      // small bonus for cuts designed for curls/coils when that's your hair type
      const bonus = (profile.hairType === 'curly' || profile.hairType === 'coily') && hf >= 0.9 && (style.hair.straight ?? 1) <= 0.2 ? 0.05 : 0;
      // a length you asked for is a firm requirement too: cuts of the wrong length are pushed down
      const lgate = lf >= 1 ? 1 : lf >= 0.5 ? 0.88 : 0.6;
      const score = (W.shape * sf + W.hair * hf + W.length * lf + W.maint * mf) * gate * lgate + bonus;
      const why = reasonsFor(style, profile.shape, profile.hairType);
      return {
        style, score: Math.min(score, 1), pct: Math.min(100, Math.round(score * 100)),
        parts: { shape: sf, hair: hf, length: lf, maint: mf },
        reasons: why.reasons, cautions: why.cautions
      };
    });
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /* styles to avoid = worst face-shape fit, with the reason why */
  function avoid(profile, ranked) {
    const fs = HS.FACE_SHAPES[profile.shape];
    return ranked
      .filter(r => r.parts.shape < 0.6)
      .sort((a, b) => a.parts.shape - b.parts.shape)
      .slice(0, 3)
      .map(r => {
        const why = r.style.tags.map(t => fs.dislikes[t]).find(Boolean)
          || (r.parts.hair < 0.5 ? `Hard to style with ${profile.hairType} hair` : `Doesn't balance a ${fs.name.toLowerCase()} face as well as your top picks`);
        return { style: r.style, why };
      });
  }

  function colours(skin) {
    const depth = skin.tone.depth;                       // light | medium | deep
    return HS.HAIR_COLOURS[depth][skin.undertone] || HS.HAIR_COLOURS[depth].neutral;
  }

  function beards(shapeKey) {
    const b = HS.BEARD_FOR_SHAPE[shapeKey];
    return { recs: b.recs, tip: b.tip };
  }

  return { rank, avoid, colours, beards, WEIGHTS: W };
})();
