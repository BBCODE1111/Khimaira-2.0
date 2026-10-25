import { parse } from './music.js?v=2.0.0-alpha.3';
import { styles as legacyStyles } from './style-engine.js?v=2.0.0-alpha.3';
import { harmonize, auditHarmony, compatible, overlaps } from './harmony.js?v=2.0.0-alpha.3';
import { performance } from './performance.js?v=2.0.0-alpha.3';

export const barLength = meter => (meter?.numerator || 4) * 4 / (meter?.denominator || 4);
export function normalizeChart(chart, beats = 4) {
  return chart.map(bar => {
    const chords = structuredClone(bar.chords || []), sum = chords.reduce((n, c) => n + c.beats, 0);
    return { ...bar, chords: chords.map(c => ({ ...c, beats: c.beats * beats / sum })) };
  });
}
export function chartFromSegments(segments, beats = 4, totalBeats) {
  const count = Math.ceil((totalBeats ?? Math.max(...segments.map(s => s.end))) / beats);
  return Array.from({ length: count }, (_, i) => ({ reason: '旋律相容和弦', chords: segments.flatMap(s => {
    const start = Math.max(s.start, i * beats), end = Math.min(s.end, (i + 1) * beats);
    return end > start + 1e-7 ? [{ symbol: s.symbol, beats: end - start }] : [];
  }) }));
}
function profile(style) {
  const aliases = { Jazz:'jazz', 'Bossa nova':'bossa', Rock:'rock', Classical:'classical', Ambient:'ambient', 'Lo-fi hip-hop':'lofi' };
  const source = legacyStyles[style];
  const phrases = source?.phrases?.flat() || [];
  const qualities = [...new Set(phrases.flatMap(p => String(p).split(' ').map(s => parse(s)?.q).filter(q => q !== undefined)))];
  return { style: aliases[style] || 'pop', ...(qualities.length ? { qualities } : {}) };
}
export function protectChart(chart, melody, { meter, key = {root:0,mode:'major'}, style='Jazz', seed=0 } = {}) {
  const beats = barLength(meter), normalized = normalizeChart(chart, beats);
  if (!melody?.length) return { bars: normalized, changed:0 };
  const preferred = normalized.flatMap((b,i) => { let at=i*beats; return b.chords.map(c=>{ const s={symbol:c.symbol,start:at,end:at+c.beats};at=s.end;return s; }); });
  let fallback, changed=0;
  const result = normalized.map((b,i) => {
    let at=i*beats; const chords=[];
    for (const c of b.chords) {
      const span={start:at,end:at+c.beats};at=span.end;
      const parsed=parse(c.symbol), active=melody.filter(n=>overlaps(n,span));
      if (c.symbol==='N.C.' || !active.length || parsed && [...parsed.pcs,parsed.bass].every(pc=>active.every(n=>compatible(pc,n.pitch)))) {chords.push({...c});continue;}
      fallback ||= harmonize(melody,{key,seed,beatsPerBar:beats,...profile(style),preferred});
      changed++;
      for(const s of fallback.segments){const start=Math.max(s.start,span.start),end=Math.min(s.end,span.end);if(end>start+1e-7)chords.push({symbol:s.symbol,beats:end-start});}
      // A chart can extend beyond the melody; keep its requested harmony there.
      if(span.end>fallback.totalBeats)chords.push({...c,beats:span.end-Math.max(span.start,fallback.totalBeats)});
    }
    const merged=[];for(const c of chords){if(merged.at(-1)?.symbol===c.symbol)merged.at(-1).beats+=c.beats;else merged.push(c);}
    return {...b,chords:merged,reason:changed?'旋律保護 · 相容和弦':b.reason};
  });
  return {bars:result,changed};
}
export function renderProtected(chart, pattern, options={}, melody=[]) {
  const raw=performance(chart,pattern,options);
  const notes=raw.filter(n=>!melody.some(m=>overlaps(m,{start:n.beat,end:n.beat+n.duration})&&!compatible(n.note,m.pitch)));
  const accompaniment=notes.map(n=>({pitch:n.note,start:n.beat,end:n.beat+n.duration,velocity:n.velocity}));
  if(auditHarmony(melody,accompaniment).length)throw Error('旋律保護檢查未通過。');
  return {notes,accompaniment,removed:raw.length-notes.length};
}
