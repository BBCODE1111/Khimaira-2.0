import {parse,mod,names} from './music.js?v=2.0.0-alpha.9';
import {segments} from './performance.js?v=2.0.0-alpha.9';
import {seeded} from './style-engine.js?v=2.0.0-alpha.9';
const tuning=[40,45,50,55,59,64],cache=new Map;
export function melodyShapes(symbol){if(cache.has(symbol))return cache.get(symbol);const c=parse(symbol);if(!c)return [];
const third=c.intervals.find(n=>[3,4,5,2].includes(n)),seventh=c.intervals.find(n=>[10,11].includes(n));
const essential=[third,seventh].filter(n=>n!==undefined).map(n=>mod(c.root+n));
if(c.q.includes('dim')||c.q==='m7b5')essential.push(mod(c.root+6));
const sets=[[0,2,3,4],[0,2,3,5],[1,2,3,4],[1,2,3,5],[2,3,4,5],[0,1,2,3],[0,1,2,4],[1,3,4,5],[0,3,4,5]];
const all=[],seen=new Set;for(let start=0;start<=12;start++)for(const strings of sets){const choices=strings.map(i=>Array.from({length:5},(_,f)=>start+f).filter(f=>f<=15&&(c.pcs.includes(mod(tuning[i]+f))||(i===strings[0]&&mod(tuning[i]+f)===c.bass))));if(choices.some(a=>!a.length))continue;
const walk=(frets,depth)=>{if(depth<4){for(const f of choices[depth])walk([...frets,f],depth+1);return;}
const notes=frets.map((f,i)=>tuning[strings[i]]+f),pcs=notes.map(mod);if(mod(notes[0])!==c.bass||essential.some(pc=>!pcs.includes(pc)))return;
if(notes.some((n,i)=>i&&n<=notes[i-1]))return;
const pressed=frets.filter(f=>f>0),span=pressed.length?Math.max(...pressed)-Math.min(...pressed):0;if(span>3)return;
const layout=Array(6).fill(-1);frets.forEach((f,i)=>layout[strings[i]]=f);const key=layout.join();if(seen.has(key))return;seen.add(key);
const missing=c.pcs.filter(pc=>!pcs.includes(pc)),extensions=c.intervals.filter(n=>n>=13),top=notes.at(-1);
const missingColor=extensions.length&&!pcs.includes(mod(c.root+extensions.at(-1)))?4:0;
all.push({frets:layout,notes,top,position:pressed.length?Math.min(...pressed):0,omitted:missing.map(n=>names[n]),score:span+missing.length*.6+missingColor+(strings.at(-1)<5?1:0)});
};walk([],0);}
const result=all.sort((a,b)=>a.score-b.score||a.position-b.position).slice(0,90);cache.set(symbol,result);return result;}
export function guitarMelody(bars,{seed=0,minFret=0,maxFret=12}={}){const seg=segments(bars),random=seeded(seed+541);if(!seg.length)return [];
const lists=seg.map(s=>melodyShapes(s.symbol).filter(v=>v.position>=minFret&&Math.max(...v.frets)<=maxFret+3));
if(lists.some(a=>!a.length))return seg.map((s,i)=>({...s,shape:lists[i][0]||null}));
const center=64+(seed%5)*2,arc=seed%2?[-2,0,2,4,2,0,-2,0]:[0,2,4,2,0,-2,0,2];
let costs=lists[0].map(v=>v.score+Math.abs(v.top-center)*.8+random()*3),paths=lists[0].map((_,i)=>[i]);
for(let i=1;i<seg.length;i++){const next=[],path=[];lists[i].forEach((v,k)=>{let best=Infinity,at=0;lists[i-1].forEach((prev,j)=>{const leap=Math.abs(v.top-prev.top),shift=Math.abs(v.position-prev.position);const desired=center+arc[i%arc.length];const score=costs[j]+v.score*.5+shift*1.2+leap*.7+Math.max(0,leap-5)*2+Math.abs(v.top-desired)*.55+random()*2;if(score<best){best=score;at=j;}});next[k]=best;path[k]=[...paths[at],k];});costs=next;paths=path;}
const best=costs.indexOf(Math.min(...costs));return seg.map((s,i)=>({...s,shape:lists[i][paths[best][i]]}));}
export function melodyEvents(arrangement){return arrangement.flatMap(s=>s.shape?s.shape.notes.map((note,i)=>({note,beat:s.beat+i*.012,duration:Math.max(.05,s.beats-i*.012-.04),velocity:i===s.shape.notes.length-1?.85:.62})):[]);}
