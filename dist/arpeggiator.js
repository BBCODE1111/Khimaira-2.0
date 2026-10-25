// Timing and note order are shared by preview and MIDI export.
export const arpModes = {
 up: ['UP · 上行', '由低至高，循環上行。'],
 down: ['DOWN · 下行', '由高至低，循環下行。'],
 upDown: ['UP / DOWN · 往返', '上行後下行；最高、最低音不重複。'],
 inclusive: ['INCLUSIVE · 端點重複', '上行後下行；最高、最低音各彈兩次。'],
 outsideIn: ['OUTSIDE IN · 向內交錯', '最低、最高、次低、次高，逐步靠近中心。'],
 insideOut: ['INSIDE OUT · 向外交錯', '從中間音往高低兩側展開。'],
 random: ['RANDOM · 隨機跳躍', '從目前和弦音抽選；按 VARIATE 換一組，匯出保留相同音序。'],
 walk: ['WALK · 隨機漫步', '在相鄰和弦音之間往上或往下，保留旋律連貫感。'],
 pedal: ['PEDAL · 低音交替', '最低音與其餘和弦音交替，形成反覆動機。'],
 poly: ['POLY · 和弦脈衝', '每一步同時彈出整個和弦；跨八度時逐步輪換音區。'],
 mixed: ['MIXED · 單音與和弦', '每四步以和弦起拍，其餘步進接續上行單音。']
};
export const arpRates = {
 '4': {label:'1/4 · 四分',step:1},
 '8': {label:'1/8 · 八分',step:.5},
 '8T': {label:'1/8T · 八分三連音',step:1/3,triplet:true},
 '16': {label:'1/16 · 十六分',step:.25},
 '24': {label:'1/24 · 十六分三連音',step:1/6,triplet:true},
 '32': {label:'1/32 · 三十二分',step:.125}
};
export const arpPresets = {
 drive:{label:'DRIVE',description:'緊湊、戲劇、古典搖滾 · 16 分往返 / 2 八度',arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpAccent:'beat',gate:82,swing:0,human:0},
 neon:{label:'NEON',description:'明亮、推進、EDM · 16 分上行 / 3 八度',arpMode:'up',arpRate:'16',arpOctaves:3,arpPhase:'chord',arpAccent:'beat',gate:58,swing:0,human:0},
 pulse:{label:'PULSE',description:'厚實、切分、和弦脈衝 · 8 分 POLY / 1 八度',arpMode:'poly',arpRate:'8',arpOctaves:1,arpPhase:'chord',arpAccent:'offbeat',gate:45,swing:0,human:0}
};
const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
export function arpOrder(pool,mode){
 const up=[...pool].sort((a,b)=>a-b),down=[...up].reverse();
 if(mode==='down')return down;
 if(mode==='upDown')return up.concat(down.slice(1,-1));
 if(mode==='inclusive')return up.concat(down);
 if(mode==='outsideIn'){const out=[];for(let a=0,b=up.length-1;a<=b;a++,b--){out.push(up[a]);if(a!==b)out.push(up[b]);}return out;}
 if(mode==='insideOut'){const out=[],mid=Math.floor((up.length-1)/2);out.push(up[mid]);for(let d=1;out.length<up.length;d++){if(mid+d<up.length)out.push(up[mid+d]);if(mid-d>=0)out.push(up[mid-d]);}return out;}
 if(mode==='pedal')return up.length===1?up:up.slice(1).flatMap(n=>[up[0],n]);
 return up;
}
export function arpeggiate(plan,options={}){
 if(!plan.length)return [];
 const mode=Object.hasOwn(arpModes,options.arpMode)?options.arpMode:'upDown';
 const rate=arpRates[options.arpRate]||arpRates['16'],step=rate.step;
 const octaves=Math.round(clamp(options.arpOctaves??2,1,4,2));
 const gate=clamp(options.gate??.82,.1,1,.82),human=clamp(options.human??0,0,1,0);
 const swing=rate.triplet?0:clamp(options.swing??0,0,.32,0)*2*step;
 let seed=(options.arpSeed??options.seed??42)>>>0;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const end=plan.at(-1).beat+plan.at(-1).beats,out=[];
 let segmentIndex=0,previous=-1,orderStep=0,walk=0;
 for(let tick=0;tick*step<end-1e-8;tick++){
  const beat=tick*step+(tick%2?swing:0);
  while(segmentIndex<plan.length&&beat>=plan[segmentIndex].beat+plan[segmentIndex].beats-1e-8)segmentIndex++;
  if(segmentIndex>=plan.length)break;
  const s=plan[segmentIndex];if(beat<s.beat-1e-8)continue;
  if(segmentIndex!==previous){if(options.arpPhase!=='flow')orderStep=walk=0;previous=segmentIndex;}
  // Use the upper voicing, keeping the sub-bass out of rapid synth lines.
  const base=[...new Set(s.notes.slice(1))].sort((a,b)=>a-b);
  const stacks=Array.from({length:octaves},(_,i)=>[...new Set(base.map(n=>n+i*12).filter(n=>n<=108))]).filter(a=>a.length);
  const pool=[...new Set(stacks.flat())].sort((a,b)=>a-b);if(!pool.length)continue;
  let selected;
  if(mode==='poly'||mode==='mixed'&&orderStep%4===0)selected=stacks[(mode==='poly'?orderStep:Math.floor(orderStep/4))%stacks.length];
  else if(mode==='random')selected=[pool[Math.floor(random()*pool.length)]];
  else if(mode==='walk'){walk%=pool.length;if(orderStep){walk+=random()<.5?-1:1;if(walk<0)walk=pool.length>1?1:0;if(walk>=pool.length)walk=Math.max(0,pool.length-2);}selected=[pool[walk]];}
  else {const order=arpOrder(pool,mode);selected=[order[orderStep%order.length]];}
  const next=(tick+1)*step+((tick+1)%2?swing:0),boundary=s.beat+s.beats;
  const span=Math.min(next,boundary)-beat;
  if(span<=1e-8)continue;
  // One timing offset per step keeps POLY attacks together. Gate=100 ends exactly at the next step.
  const jitter=random()*Math.min(.012,span*.12)*human,onset=beat+jitter;
  const duration=Math.min(span*gate,span-jitter);
  const beatAccent=Math.abs(beat-Math.round(beat))<1e-8;
  const accent=options.arpAccent==='none'?0:options.arpAccent==='offbeat'?(tick%2?.13:0):(beatAccent?.13:0);
  const velocity=Math.max(.25,Math.min(.96,.62+accent+(random()-.5)*.1*human));
  for(const note of selected)out.push({note,beat:onset,duration,velocity,articulation:'rhythmic'});
  orderStep++;
 }
 return out.sort((a,b)=>a.beat-b.beat||a.note-b.note);
}
