import {arrangeMelody,followMelodyRhythm,phraseNotes} from './melody-arranger.js?v=2.0.0-alpha.7';
import { parse } from './music.js?v=2.0.0-alpha.7';
import { styles as legacyStyles } from './style-engine.js?v=2.0.0-alpha.7';
import { harmonize, auditHarmony, compatible, overlaps } from './harmony.js?v=2.0.0-alpha.7';
import { performance, voicePlan } from './performance.js?v=2.0.0-alpha.7';

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
export function protectChart(chart, melody, { meter, key = {root:0,mode:'major'}, style='Jazz', seed=0, policy='strict', timingTolerance=0 } = {}) {
  const beats = barLength(meter), normalized = normalizeChart(chart, beats);
  if (!melody?.length) return { bars: normalized, changed:0 };
  const preferred = normalized.flatMap((b,i) => { let at=i*beats; return b.chords.map(c=>{ const s={symbol:c.symbol,start:at,end:at+c.beats};at=s.end;return s; }); });
  let fallback, changed=0;
  const result = normalized.map((b,i) => {
    let at=i*beats; const chords=[];
    for (const c of b.chords) {
      const span={start:at,end:at+c.beats};at=span.end;
      const parsed=parse(c.symbol), active=timingTolerance?phraseNotes(melody,span.start,span.end,timingTolerance):melody.filter(n=>overlaps(n,span));
      if (c.symbol==='N.C.' || !active.length || parsed && [...parsed.pcs,parsed.bass].every(pc=>active.every(n=>compatible(pc,n.pitch,policy)))) {chords.push({...c});continue;}
      fallback ||= harmonize(melody,{key,seed,policy,harmonicGrid:.5,beatsPerBar:beats,...profile(style),preferred});
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
function spans(chart,beats){return normalizeChart(chart,beats).flatMap((bar,i)=>{let start=i*beats;return bar.chords.map(c=>{const s={...c,start,end:start+c.beats};start=s.end;return s;});});}
// Generate in the feasible melody-aware space, then compare the final protected chart.
export function rewriteWithMelody(candidate,melody,{meter,key,style='Jazz',seed=0,previous=[],policy='strict',melodyFirst=false}={}){
 const beats=barLength(meter),result=melodyFirst?arrangeMelody(melody,{key,seed,policy,beatsPerBar:beats,style,previous:spans(previous,beats)}):harmonize(melody,{key,seed,policy,harmonicGrid:.5,beatsPerBar:beats,spanBeats:beats/2,...profile(style),preferred:spans(candidate,beats),avoid:spans(previous,beats)});
 return chartFromSegments(result.segments,beats,result.totalBeats).map(bar=>{const chords=[];for(const c of bar.chords){if(chords.at(-1)?.symbol===c.symbol)chords.at(-1).beats+=c.beats;else chords.push({...c});}return {...bar,chords};});
}
// The groove belongs to the bar, never to the number or length of harmony repairs.
// Render a full-bar rhythm template and map its voice slots to the chord at each attack.
export function pulsePerformance(chart, pattern, options={}) {
 if(['sustain','block','arp'].includes(pattern))return performance(chart,pattern,options);
 const beats=options.barBeats||4, actual=voicePlan(chart,options);
 const template=chart.map(bar=>({chords:[{symbol:bar.chords?.find(c=>parse(c.symbol))?.symbol||'C',beats}]}));
 const anchors=voicePlan(template,options),raw=performance(template,pattern,options);
 return raw.flatMap(n=>{
  const chord=actual.find(s=>n.beat>=s.beat-1e-7&&n.beat<s.beat+s.beats-1e-7);
  if(!chord)return [];
  const anchor=anchors[Math.floor(n.beat/beats)];
  const slot=anchor.notes.reduce((best,p,i)=>Math.abs(p-n.note)<Math.abs(anchor.notes[best]-n.note)?i:best,0);
  const target=slot===0?0:1+Math.round((slot-1)*Math.max(0,chord.notes.length-2)/Math.max(1,anchor.notes.length-2));
  return [{...n,note:Math.max(21,Math.min(108,chord.notes[target]+n.note-anchor.notes[slot]))}];
 });
}
export function renderProtected(chart, pattern, options={}, melody=[]) {
 let raw=melody.length?pulsePerformance(chart,pattern,options):performance(chart,pattern,options);const policy=options.policy||'strict';
 if(melody.length&&options.followMelody&&pattern!=='arp')raw=followMelodyRhythm(raw,voicePlan(chart,options),melody,{...options,pattern});
 if(!melody.length)return {notes:raw,accompaniment:raw.map(n=>({pitch:n.note,start:n.beat,end:n.beat+n.duration,velocity:n.velocity})),removed:0,adjusted:0};
 const beats=options.barBeats||4,chartSpans=spans(chart,beats),notes=[];let removed=0,adjusted=0;
 for(const original of raw){
  const n={...original},end=n.beat+n.duration,active=melody.filter(m=>overlaps(m,{start:n.beat,end}));
  if(active.some(m=>!compatible(n.note,m.pitch,policy))){
   const firstConflict=active.filter(m=>!compatible(n.note,m.pitch,policy)).reduce((t,m)=>Math.min(t,m.start),Infinity);
   // A tiny early next-note detection should trim the tail, not replace an
   // otherwise correct third for the entire bar. Actual timing stays audited.
   if(options.followMelody&&firstConflict>=end-.125&&firstConflict>n.beat+.04){n.duration=firstConflict-n.beat;adjusted++;notes.push(n);continue;}

   const chord=parse(chartSpans.find(s=>n.beat>=s.start-1e-7&&n.beat<s.end-1e-7)?.symbol||'');
   const alternatives=Array.from({length:25},(_,i)=>n.note+i-12).filter(p=>p>=21&&p<=108&&chord?.pcs.includes(((p%12)+12)%12)&&active.every(m=>compatible(p,m.pitch,policy))).sort((a,b)=>Math.abs(a-n.note)-Math.abs(b-n.note)||a-b);
   if(alternatives.length){n.note=alternatives[0];adjusted++;}
   else{const conflict=active.filter(m=>!compatible(n.note,m.pitch,policy)).sort((a,b)=>a.start-b.start)[0];n.duration=Math.min(end,conflict.start)-n.beat;if(n.duration<.04){removed++;continue;}adjusted++;}
  }
  notes.push(n);
 }
 // Restore smooth shared tones, without merging rhythmic re-attacks.
 notes.sort((a,b)=>a.beat-b.beat||a.note-b.note);const merged=[],last=new Map();
 for(const n of notes){const p=last.get(n.note);if(p&&Math.abs(p.beat-n.beat)<.02){p.duration=Math.max(p.duration,n.beat+n.duration-p.beat);p.velocity=Math.max(p.velocity,n.velocity);continue;}if(p&&p.articulation==='held'&&n.articulation==='held'&&Math.abs(p.beat+p.duration-n.beat)<.04&&!melody.some(m=>overlaps(m,{start:p.beat,end:n.beat+n.duration})&&!compatible(n.note,m.pitch,policy))){p.duration=n.beat+n.duration-p.beat;continue;}last.set(n.note,n);merged.push(n);}
 const accompaniment=merged.map(n=>{
  const nextAttack=merged.find(m=>m!==n&&m.note===n.note&&m.beat>n.beat)?.beat??Infinity,gateEnd=Math.min(n.beat+n.duration,nextAttack);
  // A small natural damper tail is allowed only until the next conflicting melody or re-attack.
  const conflict=melody.filter(m=>m.end>gateEnd+1e-7&&!compatible(n.note,m.pitch,policy)).reduce((t,m)=>Math.min(t,Math.max(gateEnd,m.start)),Infinity);
  const releaseBeat=Math.min(.16,(options.bpm||108)/60*.12),end=Math.min(gateEnd+releaseBeat,conflict,nextAttack,chart.length*beats);
  return {pitch:n.note,start:n.beat,end:Math.max(gateEnd,Math.min(end,nextAttack)),gateEnd,velocity:n.velocity};
 });
 if(auditHarmony(melody,accompaniment,{policy}).length)throw Error('旋律保護檢查未通過。');
 return {notes:merged,accompaniment,removed,adjusted};
}
