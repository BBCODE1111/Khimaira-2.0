import {parse} from './music.js?v=2.0.0-alpha.7';
import {compatible,overlaps,harmonize,validateMelody} from './harmony.js?v=2.0.0-alpha.7';
import {noteNames,mod} from './analysis.js?v=2.0.0-alpha.7';
import {styles} from './style-engine.js?v=2.0.0-alpha.7';

// Establish harmonic function from the phrase first. Genre colors may decorate
// this core; they must not replace it merely to make GENERATE look different.
export function phraseNotes(melody,start,end,tolerance=.08){
 return melody.filter(n=>overlaps(n,{start,end})&&!(n.start<start&&n.end<start+tolerance)&&!(n.end>end&&n.start>end-tolerance));
}
function coreCandidates(melody,start,end,key,policy){
 const active=phraseNotes(melody,start,end);
 const scale=(key.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(n=>mod(n+key.root));
 const pool=[];
 for(let degree=0;degree<7;degree++){
  const pcs=[scale[degree],scale[(degree+2)%7],scale[(degree+4)%7]],root=pcs[0];
  const q=mod(pcs[1]-root)===3?(mod(pcs[2]-root)===6?'dim':'m'):'';
  const c=parse(noteNames[root]+q);if(!c)continue;
  if(!c.pcs.every(p=>active.every(n=>compatible(p,n.pitch,policy))))continue;
  const weight=n=>Math.min(n.end,end)-Math.max(n.start,start);
  const total=active.reduce((a,n)=>a+weight(n),0)||1;
  const coverage=active.reduce((a,n)=>a+(c.pcs.includes(mod(n.pitch))?weight(n):0),0)/total;
  const tones=new Set(active.map(n=>mod(n.pitch))),complete=c.pcs.filter(p=>tones.has(p)).length/3;
  const score=coverage*8+complete*.8+(tones.has(root)?.3:0)+(root===key.root?.08:0);
  pool.push({...c,score,coverage});
 }
 return pool.sort((a,b)=>b.score-a.score||a.root-b.root);
}
function colorCore(core,active,style,seed,policy,previous){
 const pattern=styles[style]?.pattern||style;
 let qualities=core.q==='m'?['m']:core.q==='dim'?['dim']:[''];
 if(core.q==='m'){
  if(['jazz','bossa','soul','rnb','lofi','neosoul','house','gospel','fusion','chill'].includes(pattern))qualities=['m7','m9','m6','m'];
  else if(['pop','edm','jpop','ambient'].includes(pattern))qualities=['m','m7','madd9'];
 }else if(core.q===''){
  if(['jazz','bossa','soul','rnb','lofi','neosoul','house','gospel','fusion'].includes(pattern))qualities=['69','6','maj7','maj9','add9',''];
  else if(['ambient','chill','pop','edm','jpop'].includes(pattern))qualities=['add9','6','sus2',''];
  else if(['rock','metal','doom','grunge'].includes(pattern))qualities=['','5','add9'];
 }
 const choices=qualities.map(q=>parse(noteNames[core.root]+q)).filter(c=>c&&c.pcs.every(p=>active.every(n=>compatible(p,n.pitch,policy)))&&(c.q==='5'||core.pcs.every(p=>c.pcs.includes(p))));
 if(!choices.length)return core.symbol;
 const fresh=choices.filter(c=>c.symbol!==previous),usable=fresh.length?fresh:choices;
 return usable[Math.abs(seed)%usable.length].symbol;
}
export function arrangeMelody(melody,{key={root:0,mode:'major'},style='basic',seed=0,beatsPerBar=4,policy='musical',previous=[]}={}){
 validateMelody(melody);const totalBeats=Math.ceil(Math.max(...melody.map(n=>n.end))/beatsPerBar)*beatsPerBar,segments=[];
 let fallback;
 for(let start=0;start<totalBeats-1e-7;start+=beatsPerBar){
  const end=start+beatsPerBar,whole=coreCandidates(melody,start,end,key,policy),half=start+beatsPerBar/2;
  const left=coreCandidates(melody,start,half,key,policy),right=coreCandidates(melody,half,end,key,policy);
  // Split only when the melody describes a materially different harmonic arrival.
  const divided=left[0]&&right[0]&&left[0].root!==right[0].root&&(!whole[0]||(left[0].coverage+right[0].coverage)/2>whole[0].coverage+.18);
  const pieces=divided?[[start,half,left],[half,end,right]]:[[start,end,whole]];
  for(const[a,b,pool]of pieces){
   if(pool.length){const old=previous.find(s=>s.start<=a&&s.end>a)?.symbol;segments.push({start:a,end:b,symbol:colorCore(pool[0],phraseNotes(melody,a,b),style,seed,policy,old),core:pool[0].symbol});}
   else{
    fallback ||=harmonize(melody,{key,policy,beatsPerBar,harmonicGrid:.5,style:'basic'});
    for(const s of fallback.segments){const x=Math.max(a,s.start),y=Math.min(b,s.end);if(y>x+1e-7)segments.push({...s,start:x,end:y});}
   }
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
