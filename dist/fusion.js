import {arrangeMelody,followMelodyRhythm,phraseNotes,structuralNotes} from './melody-arranger.js?v=2.0.0-alpha.9';
import { parse } from './music.js?v=2.0.0-alpha.9';
import { styles as legacyStyles } from './style-engine.js?v=2.0.0-alpha.9';
import { harmonize, auditHarmony, compatible, overlaps } from './harmony.js?v=2.0.0-alpha.9';
import { performance, voicePlan } from './performance.js?v=2.0.0-alpha.9';

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
      if (c.locked || b.locked || policy==='musical'&&parsed || c.symbol==='N.C.' || !active.length || parsed && [...parsed.pcs,parsed.bass].every(pc=>active.every(n=>compatible(pc,n.pitch,policy)))) {chords.push({...c});continue;}
      fallback ||= harmonize(melody,{key,seed,policy,harmonicGrid:beats===3?(meter?.denominator===8?1.5:1):.5,beatsPerBar:beats,...profile(style),preferred});
      changed++;
      for(const s of fallback.segments){const start=Math.max(s.start,span.start),end=Math.min(s.end,span.end);if(end>start+1e-7)chords.push({symbol:s.symbol,beats:end-start});}
      // A chart can extend beyond the melody; keep its requested harmony there.
      if(span.end>fallback.totalBeats)chords.push({...c,beats:span.end-Math.max(span.start,fallback.totalBeats)});
    }
    const merged=[];for(const c of chords){if(merged.at(-1)?.symbol===c.symbol&&!!merged.at(-1).locked===!!c.locked)merged.at(-1).beats+=c.beats;else merged.push(c);}
    return {...b,chords:merged,reason:changed?'旋律保護 · 相容和弦':b.reason};
  });
  return {bars:result,changed};
}
function spans(chart,beats){return normalizeChart(chart,beats).flatMap((bar,i)=>{let start=i*beats;return bar.chords.map(c=>{const s={...c,start,end:start+c.beats};start=s.end;return s;});});}
// Generate in the feasible melody-aware space, then compare the final protected chart.
export function rewriteWithMelody(candidate,melody,{meter,key,style='Jazz',seed=0,previous=[],policy='strict',melodyFirst=false,pickup=true}={}){
 const beats=barLength(meter),result=melodyFirst?arrangeMelody(melody,{key,seed,policy,beatsPerBar:beats,meter,pickup,style,previous:spans(previous,beats)}):harmonize(melody,{key,seed,policy,harmonicGrid:beats===3?(meter?.denominator===8?1.5:1):.5,beatsPerBar:beats,spanBeats:beats===3?3:beats/2,...profile(style),preferred:spans(candidate,beats),avoid:spans(previous,beats)});
 return preserveLocks(chartFromSegments(result.segments,beats,result.totalBeats),previous,beats).map(bar=>{const chords=[];for(const c of bar.chords){if(chords.at(-1)?.symbol===c.symbol&&!c.locked&&!chords.at(-1).locked)chords.at(-1).beats+=c.beats;else chords.push({...c});}return {...bar,chords};});
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
export function preserveLocks(chart,previous,beats=4){
 return chart.map((bar,i)=>{
  const old=previous[i];if(!old)return bar;if(old.locked)return structuredClone(old);
  let at=0;const locks=(old.chords||[]).flatMap(c=>{const start=at;at+=c.beats;return c.locked?[{...c,start,end:at}]:[];});
  if(!locks.length)return bar;
  at=0;const spans=(bar.chords||[]).map(c=>{const start=at;at+=c.beats;return {...c,start,end:at};});
  const boundaries=[...new Set([0,beats,...spans.flatMap(c=>[c.start,c.end]),...locks.flatMap(c=>[c.start,c.end])])].sort((a,b)=>a-b);
  const chords=[];
  for(let j=0;j<boundaries.length-1;j++){const start=boundaries[j],end=boundaries[j+1],c=locks.find(c=>start>=c.start&&start<c.end)||spans.find(c=>start>=c.start&&start<c.end);if(!c)continue;
   if(chords.at(-1)?.symbol===c.symbol&&!!chords.at(-1).locked===!!c.locked)chords.at(-1).beats+=end-start;
   else chords.push({symbol:c.symbol,beats:end-start,locked:!!c.locked});
  }return {...bar,chords};
 });
}
export function renderProtected(chart, pattern, options={}, melody=[]) {
 let raw=melody.length?pulsePerformance(chart,pattern,options):performance(chart,pattern,options);const policy=options.policy||'strict';
 const plan=voicePlan(chart,options);
 if(!melody.length)return {notes:raw,accompaniment:raw.map(n=>{const c=plan.find(c=>n.beat>=c.beat&&n.beat<c.beat+c.beats);return {pitch:n.note,start:n.beat,end:n.beat+n.duration,velocity:n.velocity,chord:c?.symbol,role:n.note===c?.notes[0]?'bass':'chords'};}),removed:0,adjusted:0,lowered:0};
 if(melody.length&&options.followMelody&&pattern!=='arp')raw=followMelodyRhythm(raw,plan,melody,{...options,pattern});
 const beats=options.barBeats||4,chartSpans=spans(chart,beats),notes=[];let removed=0,adjusted=0,lowered=0;
 for(const original of raw){
  const span=chartSpans.find(s=>original.beat>=s.start-1e-7&&original.beat<s.end-1e-7),chord=parse(span?.symbol||'');
  if(!chord)continue;
  const voicing=plan.find(s=>original.beat>=s.beat-1e-7&&original.beat<s.beat+s.beats-1e-7);
  const n={...original,chord:span.symbol,role:original.role||(original.note===voicing?.notes[0]?'bass':'chords')};
  const end=Math.min(n.beat+n.duration,span.end,chart.length*beats);n.duration=end-n.beat;if(n.duration<=0)continue;
  const active=melody.filter(m=>overlaps(m,{start:n.beat,end}));
  const ceiling=active.length?Math.min(...active.map(m=>m.pitch))-2:108;
  while(n.note>ceiling&&n.note-12>=21){n.note-=12;lowered++;}
  const fits=p=>p<=ceiling&&active.every(m=>compatible(p,m.pitch,policy,chord));
  if(!fits(n.note)){
   const alternatives=Array.from({length:88},(_,i)=>21+i).filter(p=>chord.pcs.includes(((p%12)+12)%12)&&fits(p)).sort((a,b)=>Math.abs(a-n.note)-Math.abs(b-n.note)||a-b);
   if(alternatives.length){n.note=alternatives[0];adjusted++;}
   else{
    const conflict=active.filter(m=>n.note>m.pitch-2||!compatible(n.note,m.pitch,policy,chord)).sort((a,b)=>a.start-b.start)[0];
    n.duration=Math.min(end,conflict?.start??end)-n.beat;if(n.duration<.04){removed++;continue;}adjusted++;
   }
  }
  notes.push(n);
 }
 notes.sort((a,b)=>a.beat-b.beat||a.note-b.note);const merged=[],last=new Map();
 for(const n of notes){const p=last.get(n.note);
  if(p&&Math.abs(p.beat-n.beat)<.02&&p.chord===n.chord){p.duration=Math.max(p.duration,n.beat+n.duration-p.beat);p.velocity=Math.max(p.velocity,n.velocity);if(n.role==='bass')p.role='bass';continue;}
  if(p&&p.chord===n.chord&&p.articulation==='held'&&n.articulation==='held'&&Math.abs(p.beat+p.duration-n.beat)<.04&&!melody.some(m=>overlaps(m,{start:p.beat,end:n.beat+n.duration})&&(n.note>m.pitch-2||!compatible(n.note,m.pitch,policy,n.chord)))){p.duration=n.beat+n.duration-p.beat;continue;}
  last.set(n.note,n);merged.push(n);
 }
 const accompaniment=merged.map(n=>{
  const nextAttack=merged.find(m=>m!==n&&m.note===n.note&&m.beat>n.beat)?.beat??Infinity,gateEnd=Math.min(n.beat+n.duration,nextAttack);
  const conflict=melody.filter(m=>m.end>gateEnd+1e-7&&(n.note>m.pitch-2||!compatible(n.note,m.pitch,policy,n.chord))).reduce((t,m)=>Math.min(t,Math.max(gateEnd,m.start)),Infinity);
  const boundary=chartSpans.find(s=>s.start>n.beat+1e-7&&s.symbol!==n.chord)?.start??chart.length*beats;
  const releaseBeat=Math.min(.16,(options.bpm||108)/60*.12),end=Math.min(gateEnd+releaseBeat,conflict,nextAttack,boundary,chart.length*beats);
  return {pitch:n.note,start:n.beat,end:Math.max(gateEnd,Math.min(end,nextAttack)),gateEnd,velocity:n.velocity,chord:n.chord,role:n.role};
 }).filter(n=>{const valid=Math.floor(n.end*960+1e-8)>Math.ceil(n.start*960-1e-8);if(!valid)removed++;return valid;});
 if(auditHarmony(melody,accompaniment,{policy}).length)throw Error('Melody protection check failed.');
 return {notes:merged,accompaniment,removed,adjusted,lowered};
}
