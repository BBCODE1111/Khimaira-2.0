import {parse,pitchName,spellChord} from './music.js?v=2.0.0-alpha.9';
import {compatible,overlaps,harmonize,validateMelody,chordCompatible} from './harmony.js?v=2.0.0-alpha.9';
import {mod} from './analysis.js?v=2.0.0-alpha.9';
import {styles} from './style-engine.js?v=2.0.0-alpha.9';

export function phraseNotes(melody,start,end,tolerance=.08){
 return melody.filter(n=>overlaps(n,{start,end})&&!(n.start<start&&n.end<start+tolerance)&&!(n.end>end&&n.start>end-tolerance));
}
export function noteWeight(n,start,end){
 const length=Math.max(0,Math.min(n.end,end)-Math.max(n.start,start));
 const beat=Math.abs(n.start-Math.round(n.start))<.08;
 return length*(beat?2: n.end-n.start<.65?.22:1);
}
export function structuralNotes(melody,start,end){
 const notes=phraseNotes(melody,start,end);
 return notes.filter(n=>n.end-n.start>=.65||Math.abs(n.start-Math.round(n.start))<.08);
}
export function detectPickup(melody,beats=4){
 const first=Math.min(...melody.map(n=>n.start));
 return Number.isFinite(first)&&first>=Math.max(1,beats-2)&&first<beats;
}
function coreCandidates(melody,start,end,key,policy){
 const active=phraseNotes(melody,start,end),scale=(key.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(n=>mod(n+key.root));
 const pool=[];
 for(let degree=0;degree<7;degree++){
  const pcs=[scale[degree],scale[(degree+2)%7],scale[(degree+4)%7]],root=pcs[0],q=mod(pcs[1]-root)===3?(mod(pcs[2]-root)===6?'dim':'m'):'';
  const c=parse(pitchName(root,key)+q);
  if(policy==='strict'&&!active.every(n=>chordCompatible(c,n,policy)))continue;
  const total=active.reduce((a,n)=>a+noteWeight(n,start,end),0)||1;
  const coverage=active.reduce((a,n)=>a+(c.pcs.includes(mod(n.pitch))?noteWeight(n,start,end):0),0)/total;
  const clash=active.reduce((a,n)=>a+(!chordCompatible(c,n,policy)?noteWeight(n,start,end):0),0)/total;
  const tones=new Set(active.map(n=>mod(n.pitch))),complete=c.pcs.filter(p=>tones.has(p)).length/3;
  pool.push({...c,score:coverage*8+complete*.8-clash*2+(tones.has(root)?.3:0)+(root===key.root?.08:0),coverage});
 }
 return pool.sort((a,b)=>b.score-a.score||a.root-b.root);
}
function family(style){return styles[style]?.pattern||style;}
function colorCore(core,active,style,seed,policy,key,previous){
 const pattern=family(style),degree=mod(core.root-key.root),jazz=['jazz','bossa','soul','rnb','lofi','neosoul','gospel','fusion','house'].includes(pattern);
 let qualities=[core.q];
 if(['rock','metal','doom','grunge','punk'].includes(pattern))qualities=['5',core.q];
 else if(pattern==='blues')qualities=['7'];
 else if(pattern==='ambient')qualities=['sus2','sus4','7sus4(no5)','add9',core.q];
 else if(core.q==='m')qualities=jazz?(pattern==='bossa'?['m6','m7','m9','m']:pattern==='neosoul'?['m9','m11','m7','m']:['m7','m9','m6','m']):['pop','edm','jpop','chill'].includes(pattern)?['m','m7','madd9']:['m'];
 else if(core.q==='')qualities=degree===7&&(jazz||['alberti','classical'].includes(pattern))?['7','13','9']:jazz?(pattern==='bossa'?['69','maj7','6']:pattern==='neosoul'?['maj9','maj7','69']:['maj7','69','maj9','6']):['pop','edm','jpop','chill'].includes(pattern)?['add9','6','']:[''];
 // Harmonic minor's raised leading tone supports a real dominant.
 if(key.mode==='minor'&&degree===7&&jazz)qualities=['7','7b9','9'];
 const choices=qualities.map(q=>parse(pitchName(core.root,key)+q)).filter(c=>policy==='musical'||active.every(n=>chordCompatible(c,n,policy)));
 if(!choices.length)return core.symbol;
 const fresh=choices.filter(c=>c.symbol!==previous),usable=fresh.length?fresh:choices;
 let chosen=usable[Math.abs(seed)%usable.length].symbol;
 if(pattern==='gospel'&&core.q===''&&degree===0)chosen+='/'+pitchName(core.root+4,key);
 if(['alberti','classical'].includes(pattern)&&degree===0&&seed%2)chosen+='/'+pitchName(core.root+7,key);
 return chosen;
}
export function arrangeMelody(melody,{key={root:0,mode:'major'},style='basic',seed=0,beatsPerBar=4,policy='musical',previous=[],pickup=true,meter}={}){
 validateMelody(melody);const totalBeats=Math.ceil(Math.max(...melody.map(n=>n.end))/beatsPerBar)*beatsPerBar,segments=[];
 let fallback;
 for(let start=0;start<totalBeats-1e-7;start+=beatsPerBar){
  const end=start+beatsPerBar;
  if(start===0&&pickup&&detectPickup(melody,beatsPerBar)){segments.push({start,end,symbol:'N.C.',core:'N.C.'});continue;}
  const half=start+(meter?.denominator===8?beatsPerBar/2:beatsPerBar===3?2:beatsPerBar/2);
  const whole=coreCandidates(melody,start,end,key,policy),left=coreCandidates(melody,start,half,key,policy),right=coreCandidates(melody,half,end,key,policy);
  const strongArrival=melody.some(n=>Math.abs(n.start-half)<.08&&n.end-n.start>=.65);
  const divided=strongArrival&&left[0]&&right[0]&&left[0].root!==right[0].root&&(!whole[0]||(left[0].coverage+right[0].coverage)/2>whole[0].coverage+.18);
  for(const[a,b,pool]of divided?[[start,half,left],[half,end,right]]:[[start,end,whole]]){
   if(pool.length){const old=previous.find(s=>s.start<=a&&s.end>a)?.symbol;segments.push({start:a,end:b,symbol:colorCore(pool[0],phraseNotes(melody,a,b),style,seed,policy,key,old),core:pool[0].symbol});}
   else{
    fallback ||=harmonize(melody,{key,policy,beatsPerBar,harmonicGrid:beatsPerBar===3?(meter?.denominator===8?1.5:1):.5,style:'basic'});
    for(const s of fallback.segments){const x=Math.max(a,s.start),y=Math.min(b,s.end);if(y>x+1e-7)segments.push({...s,start:x,end:y,symbol:spellChord(s.symbol,key)});}
   }
  }
 }
 // Functional predominant–dominant motion follows melodic support, not bar numbers.
 if(policy==='musical'&&['jazz','neosoul','fusion','bossa','alberti','classical'].includes(family(style))){
  for(let i=0;i<segments.length-1;i++){
   const s=segments[i],c=parse(s.core),next=parse(segments[i+1].symbol);
   if(c&&next&&mod(c.root-key.root)===5&&mod(next.root-key.root)===7){
    const classical=['alberti','classical'].includes(family(style));
    const ii=parse(pitchName(key.root+2,key)+(key.mode==='minor'?(classical?'dim':'m7b5'):(classical?'m':'m7')));
    const active=structuralNotes(melody,s.start,s.end);
    if(active.every(n=>ii.pcs.includes(mod(n.pitch))||chordCompatible(ii,n,policy)))s.symbol=ii.symbol;
   }
  }
 }
 if(policy==='musical'&&['jazz','neosoul','fusion','alberti','classical'].includes(family(style))){
  for(let i=0;i<segments.length-1;i++){const s=segments[i],core=parse(s.core),next=parse(segments[i+1].symbol);
   if(core?.q==='dim'&&mod(core.root-key.root)===11&&next?.root===key.root){const dominant=parse(pitchName(key.root+7,key)+'7');if(structuralNotes(melody,s.start,s.end).every(n=>chordCompatible(dominant,n,policy)))s.symbol=dominant.symbol;}
  }
 }
 // Additional family vocabulary is available when the strong melody supports
 // it. Seeded substitutions never invent extra beat boundaries.
 if(policy==='musical'&&seed%3===2){
  const pattern=family(style);
  for(let i=0;i<segments.length;i++){
   const s=segments[i],c=parse(s.symbol),next=parse(segments[i+1]?.symbol);if(!c)continue;
   const active=structuralNotes(melody,s.start,s.end),weight=chord=>active.reduce((sum,n)=>sum+(chord.pcs.includes(mod(n.pitch))?noteWeight(n,s.start,s.end):0),0);
   const alternatives=[];
   if(['jazz','neosoul','fusion'].includes(pattern)&&c.intervals.includes(10))alternatives.push(pitchName(c.root+6,key)+'7');
   if(['jazz','alberti','classical'].includes(pattern)&&next)alternatives.push(pitchName(next.root+7,key)+'7');
   if(pattern==='gospel'&&next)alternatives.push(pitchName(next.root-1,key)+'dim7');
   if(pattern==='gospel'&&mod(c.root-key.root)===7)alternatives.push(pitchName(key.root+5,key)+'/'+pitchName(key.root+7,key));
   if(['rock','metal','doom','grunge'].includes(pattern))alternatives.push(pitchName(key.root+10,key)+'5',pitchName(key.root+8,key)+'5');
   if(['alberti','classical'].includes(pattern)&&next&&mod(next.root-key.root)===7)alternatives.push(pitchName(key.root,key)+'/'+pitchName(key.root+7,key));
   if(pattern==='ambient')alternatives.push(pitchName(c.root,key)+'sus4/'+pitchName(key.root,key));
   const choice=alternatives.map(parse).find(candidate=>candidate&&active.length&&weight(candidate)>=weight(c)&&active.every(n=>chordCompatible({...candidate,pcs:[...candidate.pcs,candidate.bass]},n,policy)));
   if(choice)s.symbol=choice.symbol;
  }
 }
 return {segments,totalBeats};
}

const near=(a,b)=>Math.abs(a-b)<.08;
// Keep a bass anchor on the meter, voice harmony at phrase arrivals, then let
// the genre's existing pattern answer the melody between those anchors.
export function followMelodyRhythm(raw,plan,melody,{barBeats=4,pattern='ballad',human=0}={}){
 if(!plan.length||!melody.length)return raw;
 const result=raw.map(n=>({...n})),end=Math.max(...plan.map(s=>s.beat+s.beats));
 const aligned=melody.filter(n=>Math.abs(n.start-Math.round(n.start*4)/4)<.08);
 const at=t=>plan.find(s=>t>=s.beat-1e-7&&t<s.beat+s.beats-1e-7);
 const add=(t,notes,duration,velocity,articulation='anchor')=>{
  for(const note of notes){const existing=result.find(n=>n.note===note&&near(n.beat,t));
   if(existing){existing.beat=t;existing.duration=Math.max(existing.duration,duration);existing.velocity=Math.max(existing.velocity,velocity);existing.articulation=articulation;}
   else result.push({beat:t,note,duration,velocity,articulation});
  }
 };
 for(let bar=0;bar<end-1e-7;bar+=barBeats){
  const active=melody.filter(n=>overlaps(n,{start:bar,end:bar+barBeats}));if(!active.length)continue;
  const notes=aligned.filter(n=>n.start>=bar-.08&&n.start<bar+barBeats-.08);
  const strong=notes.filter(n=>near(n.start,bar)||near(n.start,bar+barBeats/2));
  for(const m of strong){
   const t=Math.round(m.start*4)/4,s=at(t);if(!s)continue;
   const span=Math.min(s.beat+s.beats-t,barBeats/2);
   // Shared quarter-note pulse is audible even in syncopated genres; avoid rapid
   // sub-bass repeats in ambient/sustain, which retain their complete held notes.
   if(!['sustain','ambient','requiem','doom','breathingDrone','ragaDrone'].includes(pattern))add(t,[s.notes[0]],Math.min(span,.85),.65);
   if(near(t,bar)){
    // Harmony arrives with the phrase. Keep the genre answers and its voicing.
    const upper=s.notes.slice(1),length=['ballad','ambient','sustain','chill','requiem'].includes(pattern)?span:Math.min(.72,span);
    const opening=result.filter(n=>upper.includes(n.note)&&n.beat>=t&&n.beat<t+.12);
    for(const n of opening)n.beat=t;
    if(!opening.length)add(t,upper,length,.59);
   }
  }
  // Sparse/sustained melody leaves room for a genre response; busy phrases get
  // a lighter inner subdivision, while meter anchors retain their strength.
  const busy=notes.length>=barBeats*1.5;
  if(busy)for(const n of result)if(n.beat>=bar&&n.beat<bar+barBeats&&n.articulation!=='anchor'&&!near(n.beat,Math.round(n.beat)))n.velocity*=.72;
 }
 // At a newly articulated harmonic arrival, voice the new harmony in step with
 // the melody instead of waiting for the next preset syncopation.
 for(let i=1;i<plan.length;i++){
  const s=plan[i];if(near(s.beat%barBeats,0)||!aligned.some(n=>near(n.start,s.beat)))continue;
  if(plan[i-1].symbol===s.symbol)continue;const held=['sustain','ambient','ballad','chill','requiem'].includes(pattern);add(s.beat,s.notes,held?s.beats:Math.min(.72,s.beats),.60,held?'held':'anchor');
 }
 return result.sort((a,b)=>a.beat-b.beat||a.note-b.note);
}
