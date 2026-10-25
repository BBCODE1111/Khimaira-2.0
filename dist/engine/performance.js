import {arpeggiate} from './arpeggiator.js?v=12';
import {parse,mod} from './music.js?v=12';
export const patterns={arp:'ARP · 合成器分解',sustain:'長音和弦 · 精準全拍',ballad:'Ballad · 柔和分解',jazz:'Jazz · Swing comping',bossa:'Bossa · Bass & syncopation',gospel:'Gospel · Rolling chords',house:'Deep house · Flowing syncopation',soul:'Soul · Laid-back comping',rnb:'R&B · Broken pocket',funk:'Funk · 16th conversation',edm:'EDM · Octave pulse',lofi:'Lo-fi · Dusty late pocket',chill:'Chill · Breathing chords',neosoul:'Neo-soul · Rolling answers',pop:'Pop · Lifted eighths',blues:'Blues · Shuffle comping',neoclassical:'Classical rock · Dramatic ostinato',disco:'Nu-disco · Octave syncopation',ambient:'Ambient · Floating sustain',fusion:'Fusion · 16th accents',rock:'Rock · Eighth pulse',jpop:'J-rock · Driving broken chords',alberti:'Classical · Alberti bass',folk:'Folk · Fingerstyle',ostinato:'Modal · Pedal ostinato',arpUp:'Arp · Up',arpDown:'Arp · Down',arpBounce:'Arp · Up / Down',arpRandom:'Arp · Seeded random',arpOctave:'Arp · Two octaves'};
Object.assign(patterns,{metal:'Metal · 低音 Gallop',doom:'Doom · 緩慢重擊',grunge:'Grunge · 重擊與留白',alternative:'Alternative · 破碎音型',gothic:'Gothic · 冷峻反覆',requiem:'Requiem · 合唱長音',modalPluck:'調式 · Pedal & plucked answers',sparsePluck:'日本五聲 · Sparse plucks',highlife:'Highlife · Interlocking guitar',pentatonicAnswer:'Tizita · Pentatonic answers',slackKey:'Slack-key · Alternating bass',breathingDrone:'當代笛樂 · Breathing drone',ragaDrone:'印度音列 · Sa–Pa drone',afrobeats:'Afrobeats · Syncopated pocket',amapiano:'Amapiano · Keys & bass replies',dembow:'Reggaeton · Dembow-inspired keys',dancehall:'Dancehall · Offbeat vamp',latinPop:'Latin pop · 3–3–2 keys',flamenco:'Flamenco · 4/4 strum study'});
export function segments(bars){const out=[];bars.forEach((b,i)=>{let at=i*4;for(const c of b.chords??(b.symbol?[{symbol:b.symbol,beats:4}]:[])){if(parse(c.symbol))out.push({...c,beat:at});at+=c.beats;}});return out;}
function candidates(symbol,voicing){const c=parse(symbol);let ints=c.intervals.map(mod);if(voicing==='rootless'&&ints.length>=4){const third=ints.find(n=>n===3||n===4)||ints[1];const seventh=ints.find(n=>n===10||n===11)||ints.at(-1);const colors=ints.filter(n=>![0,third,seventh,7].includes(n));ints=[third,seventh,...colors];if(ints.length<4&&c.pcs.includes(mod(c.root+7)))ints.push(7);if(ints.length<3)ints.push(0);ints=ints.slice(0,5);}else if(ints.length>6)ints=ints.filter(n=>n!==7).slice(0,6);
const pcs=[...new Set(ints.map(n=>mod(c.root+n)))].sort((a,b)=>a-b),out=[];for(let inv=0;inv<pcs.length;inv++){const seq=pcs.slice(inv).concat(pcs.slice(0,inv));let notes=seq.map(n=>48+n);for(let j=1;j<notes.length;j++)while(notes[j]<=notes[j-1])notes[j]+=12;if(voicing==='open'&&notes.length>=4){notes[1]+=12;notes.sort((a,b)=>a-b);}for(const shift of [0,12]){const upper=notes.map(n=>n+shift);if(upper.at(-1)>88)continue;let bass=36+c.bass;while(bass>=upper[0]-3)bass-=12;out.push([bass,...upper]);}}return out;}
export function voicePlan(bars,{voicing='close',register=0}={}){const seg=segments(bars);if(!seg.length)return [];const lists=seg.map(c=>candidates(c.symbol,voicing));let costs=lists[0].map(v=>Math.abs(v[1]-57)*.6),paths=lists[0].map((_,i)=>[i]);for(let t=1;t<lists.length;t++){const next=[],nextPaths=[];for(const v of lists[t]){let score=Infinity,best=0;lists[t-1].forEach((p,j)=>{let move=Math.abs(v[0]-p[0])*.3;for(let k=1;k<v.length;k++)move+=Math.abs(v[k]-p[Math.min(k,p.length-1)]);move+=Math.abs(v.length-p.length)*3;if(costs[j]+move<score){score=costs[j]+move;best=j;}});next.push(score);nextPaths.push([...paths[best],next.length-1]);}costs=next;paths=nextPaths;}const best=costs.indexOf(Math.min(...costs));return seg.map((s,i)=>({...s,notes:lists[i][paths[best][i]].map(n=>Math.max(21,Math.min(108,n+register)))}));}
export function performance(bars,pattern='sustain',options={}){const alias={block:'sustain',rhythmic:'jazz',melodic:'ballad',arpeggio:'arpUp',mixed:'gospel'};pattern=alias[pattern]||pattern;const plan=voicePlan(bars,options),all=[];const human=Math.max(0,Math.min(1,Number(options.human??.45))),gate=Math.max(.1,Math.min(1,Number(options.gate??.8))),rate=Number(options.rate??.5),swing=Math.max(0,Math.min(.32,Number(options.swing??.08)));let state=(options.seed??42)>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
if(pattern==='arp')return arpeggiate(plan,options);
for(const [idx,s] of plan.entries()){const v=s.notes,upper=v.slice(1),length=s.beats;const add=(t,notes,dur,velocity=.74,roll=0,articulation='rhythmic')=>{notes.forEach((note,j)=>{const jitter=pattern==='sustain'||articulation==='held'&&notes.length===1?0:(random()*.025*human+j*roll);const local=t+jitter;if(local>=length)return;all.push({beat:s.beat+local,note,articulation:pattern==='sustain'?'held':articulation,duration:Math.min(pattern==='sustain'||articulation==='held'?dur:dur*gate*(.96+random()*.04),length-local),velocity:Math.max(.25,Math.min(.96,velocity+(pattern==='sustain'?0:(random()-.5)*.16*human)))});});};
if(pattern==='sustain'){add(0,v,length,.78);continue;}
if(pattern==='metal'){
 for(let t=0;t<length;t+=1){add(t,[v[0]],Math.min(.34,length-t),.86);add(t+.5,[v[0]],.16,.63);add(t+.75,[v[0]],.16,.7);}
 [0,1.5,2.75,3.5].filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(i===0?.6:.28,length-t),i===0?.84:.68));
}
else if(pattern==='doom'){add(0,v,length,.78,.006*human,'held');if(length>3)add(2.5,[v[0]],length-2.5,.59,0,'held');}
else if(pattern==='grunge'){
 (idx%2?[0,.75,2,3.5]:[0,1.5,2,2.75]).filter(t=>t<length).forEach((t,i)=>add(t,v,Math.min(i===0?1.05:.45,length-t),i%2?.58:.84,.005*human));
}
else if(pattern==='alternative'){
 add(0,[v[0]],length,.61,0,'held');const seq=[upper[0],upper.at(-1),upper[1]??upper[0],upper[0]];
 [0,.75,1.5,2.5,3.25].filter(t=>t<length).forEach((t,i)=>add(t,[seq[(i+idx)%seq.length]],Math.min(.7,length-t),i%3?.54:.74));
 if(idx%2)add(3,upper,Math.min(.85,length-3),.65,.008);
}
else if(pattern==='gothic'){
 add(0,[v[0]],length,.65,0,'held');for(let t=0,n=0;t<length;t+=.5,n++)add(t,[upper[(n%2?upper.length-1:0)]],Math.min(.44,length-t),n%2?.51:.72);
}
else if(pattern==='requiem'){
 // Each chord keeps its full harmonic span; moving basses belong to the chart, not random ornaments.
 add(0,v,length,.61,0,'held');
}
else if(pattern==='ballad'){add(0,[v[0]],length,.62,0,'held');add(.025,upper,length-.025,.7,.012*human,'held');if(length>=3)add(2.5,[upper.at(-1)],length-2.5,.57,0,'held');}
else if(pattern==='jazz'){add(0,[v[0]],Math.min(1.7,length),.63);const rhythms=idx%2?[.5+swing,2,3.5+swing]:[0,1.5+swing,3];rhythms.filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(.9,length-t),i===0?.76:.63,.004*human));}
else if(pattern==='bossa'){[0,2].filter(t=>t<length).forEach((t,j)=>add(t,[v[0]+(j?7:0)],Math.min(2,length-t),.64,0,'held'));(idx%2?[0,1,2.5]:[0,1.5,3]).filter(t=>t<length).forEach(t=>add(t,upper,.65,.68,.003));}
else if(pattern==='gospel'){add(0,[v[0]],length,.68,0,'held');[0,1.5,3].filter(t=>t<length).forEach((t,i)=>add(t,i===1?[...upper].reverse():upper,Math.min(1.25,length-t),i===0?.77:.61,.018*human));}
else if(pattern==='house'){
// Sustained upper voices answer a separate syncopated bass; alternating two-bar phrases.
const attacks=idx%2?[[.5,1.45],[2.75,1.25]]:[[0,1.3],[1.75,1.6],[3.5,.5]];
attacks.filter(([t])=>t<length).forEach(([t,d],i)=>add(t,upper,Math.min(d,length-t),i===0?.65:.56,.006*human));
[[0,.8],[1.5,.45],[2.5,.8],[3.75,.25]].filter(([t])=>t<length).forEach(([t,d],i)=>add(t,[v[0]+(i===3?12:0)],d,.61));}
else if(['soul','rnb','lofi','neosoul','chill','ambient'].includes(pattern)){
const gentle=['chill','ambient'].includes(pattern),late=pattern==='lofi'?.055:pattern==='rnb'?.025:0;
add(0,[v[0]],length,.57,0,'held');
const hits=gentle?[[0,length]]:idx%2?[[.5+swing,1.15],[2.75,1.2]]:[[late,1.6],[2.5+swing,1.3]];
hits.forEach(([t,d],i)=>{if(t<length)add(t,upper,Math.min(d,length-t),i?.57:.66,(pattern==='neosoul'?.026:.012)*human,gentle?'held':'rhythmic');});
if(length>=3&&pattern!=='ambient')add(3.25,[upper.at(-1)],gentle?length-3.25:.6,.51,0,gentle?'held':'rhythmic');
}
else if(pattern==='funk'||pattern==='fusion'){
add(0,[v[0]],Math.min(.45,length),.73);const ts=pattern==='funk'?(idx%2?[.25,1,1.75,2.5,3.75]:[0,.75,1.75,2.5,3.25]):[0,.75,1.5,2.75,3.5];
ts.filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(.28,length-t),i%3===0?.79:.58));}
else if(pattern==='edm'||pattern==='disco'||pattern==='pop'){
for(let t=0;t<length;t+=.5){add(t,[v[0]+(t%1?12:0)],.4,t%1?.56:.73);if(pattern==='edm'||t%1||t===0)add(t,upper,pattern==='pop'?.7:.38,t%1?.6:.72);}}
else if(pattern==='blues'){
for(let t=0;t<length;t+=1){add(t,[v[0]],.7,.68);add(t+.67,upper,.28,.61);}add(0,upper,.6,.74);}
else if(pattern==='neoclassical'){
add(0,[v[0]],length,.75,0,'held');const seq=[upper[0],upper.at(-1),upper[1]??upper[0],upper.at(-1)];for(let t=0,n=0;t<length;t+=.25,n++)add(t,[seq[n%4]],.35,n%4===0?.76:.54);}
else if(['modalPluck','sparsePluck','pentatonicAnswer','breathingDrone','ragaDrone'].includes(pattern)){
 const drone=['breathingDrone','ragaDrone'].includes(pattern);add(0,[v[0]],length,.48,0,'held');
 if(drone)add(.02,[v[0]+7],length-.02,.35,0,'held');
 const times=pattern==='sparsePluck'?(idx%2?[.5,2.5]:[0,1.5,3.5]):pattern==='ragaDrone'?[.5,1.5,2.75]:pattern==='breathingDrone'?[.25,2.5]:[0,.75,1.5,3];
 times.filter(t=>t<length).forEach((t,i)=>add(t,[upper[(i+idx)%upper.length]],Math.min(pattern==='sparsePluck'?.55:1.15,length-t),i===0?.63:.5));
}
else if(pattern==='highlife'){
 add(0,[v[0]],Math.min(.8,length),.6);if(length>2)add(2,[v[0]],.7,.55);
 [0,.75,1.5,2,2.75,3.5].filter(t=>t<length).forEach((t,i)=>add(t,[upper[(i+idx)%upper.length]],.36,i%3===0?.68:.54));
 [.5,1.75,3.25].filter(t=>t<length).forEach(t=>add(t,[upper.at(-1)],.24,.45));
}
else if(pattern==='slackKey'){
 const chord=parse(s.symbol),fifth=chord.pcs.includes(mod(chord.root+7))?36+mod(chord.root+7):v[0];
 for(let t=0;t<length;t+=1){add(t,[t%2?fifth:v[0]],.85,.56);if(t+.5<length)add(t+.5,[upper[(idx+t)%upper.length]],.9,.6);}
 add(.025,upper,Math.min(1.7,length-.025),.5,.012);
}
else if(pattern==='afrobeats'){
 [[0,.65],[1.5,.4],[2.75,.7]].forEach(([t,d])=>{if(t<length)add(t,[v[0]],d,.63);});
 (idx%2?[.5,1.75,3]:[.75,2,3.5]).filter(t=>t<length).forEach((t,i)=>add(t,upper,.38,i?.57:.66,.006));
}
else if(pattern==='amapiano'){
 [0,2.5].filter(t=>t<length).forEach((t,i)=>add(t,upper,Math.min(i?1.4:1.8,length-t),i?.51:.6,.008));
 [[.75,.3],[1.5,.45],[2.75,.3],[3.5,.45]].forEach(([t,d],i)=>{if(t<length)add(t,[v[0]+(i===3?12:0)],d,i%2?.65:.56);});
}
else if(['dembow','dancehall','latinPop','flamenco'].includes(pattern)){
 [0,2].filter(t=>t<length).forEach(t=>add(t,[v[0]],.75,.66));
 const hits=pattern==='dembow'?[.75,1.5,2.75,3.5]:pattern==='dancehall'?[.5,1.5,2.5,3.5]:pattern==='latinPop'?[0,1.5,3]:[0,1,2.5,3.5];
 hits.filter(t=>t<length).forEach((t,i)=>add(t,pattern==='flamenco'&&i%2?[...upper].reverse():upper,Math.min(.45,length-t),i%2?.58:.72,pattern==='flamenco'?.012:.003));
}
else if(pattern==='rock'){for(let t=0;t<length;t+=.5)add(t,v,.45,t%1===0?.8:.61);}
else {const arp=pattern.startsWith('arp');const seq=pattern==='arpOctave'?[...upper,...upper.map(n=>n+12)]:pattern==='folk'?[v[0],upper[1]??upper[0],upper.at(-1),upper[0]]:pattern==='alberti'?[v[0],upper.at(-1),upper[0],upper.at(-1)]:pattern==='ostinato'?[v[0],upper[0],v[0],upper.at(-1)]:v;const step=arp?rate:pattern==='jpop'?.5:.5;let n=0;for(let t=0;t<length-.00001;t+=step,n++){let k=n%seq.length;if(pattern==='arpDown')k=seq.length-1-k;if(pattern==='arpBounce'){const period=Math.max(1,seq.length*2-2);k=n%period;k=k<seq.length?k:period-k;}if(pattern==='arpRandom')k=Math.floor(random()*seq.length);const shift=step===.5&&n%2?swing:0;const interval=step===.5?step+(n%2?-swing:swing):step;add(t+shift,[seq[k]],interval,n%4===0?.78:.62);}}
}
// End a repeated note before its next attack; prevent ambiguous overlapping MIDI note pairs.
all.sort((a,b)=>a.beat-b.beat||a.note-b.note);const last=new Map(),clean=[];for(const n of all){const p=last.get(n.note);
// Two hands on the same key are one attack, even with independent humanization.
if(p&&n.beat-p.beat<.04){p.duration=Math.max(p.duration,n.beat+n.duration-p.beat);p.velocity=Math.max(p.velocity,n.velocity);if(n.articulation==='held')p.articulation='held';continue;}
if(p&&p.beat+p.duration>n.beat){const end=p.beat+p.duration;if(p.articulation==='held'){n.duration=Math.max(n.duration,end-n.beat);n.articulation='held';}p.duration=n.beat-p.beat;}
last.set(n.note,n);clean.push(n);}return clean;}
