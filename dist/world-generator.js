import {parse,mod,names} from './music.js?v=2.0.0-alpha.9';
import {parseBar,chordList} from './solutions.js?v=2.0.0-alpha.9';
import {worldScales} from './world-styles.js?v=2.0.0-alpha.9';

const cycle=(n,size)=>((n%size)+size)%size;
const shifted=(symbol,key)=>{const c=parse(symbol);return names[mod(c.root+key)]+c.q+(symbol.includes('/')?'/'+names[mod(c.bass+key)]:'');};
export function worldMutation(source,cfg,{key=0,seed=0,randomness='medium',freedom='free',density=2,method='style'}={}){
 const count=source.length||4,allowed=worldScales[cfg.scaleIds[0]].intervals.map(n=>mod(n+key));
 const palette=[...new Set(cfg.phrases.flatMap(p=>p.flatMap(b=>parseBar(b).map(c=>shifted(c.symbol,key)))))].filter(s=>!cfg.strict||parse(s).pcs.concat(parse(s).bass).every(n=>allowed.includes(n)));
 const phrase=cfg.phrases[cycle(seed,cfg.phrases.length)];
 const rootDistance=(a,b)=>Math.min(mod(a-b),mod(b-a));
 return Array.from({length:count},(_,i)=>{
  const input=chordList(source[i]||{}),anchored=freedom==='color'||method==='color';
  let cs;
  if(input.length&&(anchored||randomness==='low'||randomness==='medium'&&seed%2===0)){
   cs=input.map((c,j)=>{
    const original=parse(c.symbol);let options=palette.filter(s=>!anchored||parse(s).root===original.root);
    // An explicitly retained root outside the pitch collection stays editable and is flagged by scale matching.
    if(!options.length)return {...c};
    options.sort((a,b)=>{const cost=s=>{const p=parse(s);return rootDistance(p.root,original.root)*2+p.pcs.filter(n=>!original.pcs.includes(n)).length;};return cost(a)-cost(b);});
    const nearest=options.filter(s=>rootDistance(parse(s).root,original.root)===rootDistance(parse(options[0]).root,original.root));
    return {symbol:nearest[cycle(seed+i+j,Math.min(nearest.length,randomness==='low'?2:4))],beats:c.beats};
   });
  }else{
   const offset=randomness==='high'&&!cfg.pedal?Math.floor(seed/cfg.phrases.length):0;
   cs=parseBar(phrase[cycle(i+offset,phrase.length)]).map(c=>({...c,symbol:shifted(c.symbol,key)}));
  }
  if(density===1)cs=[{symbol:cs[0].symbol,beats:4}];
  if(!anchored&&randomness==='high'&&density>=2&&cs.length===1&&(seed+i)%3===0){
   const choices=palette.filter(s=>s!==cs[0].symbol);const next=choices[cycle(seed+i,choices.length)];
   if(next)cs=[{symbol:cs[0].symbol,beats:3},{symbol:next,beats:1}];
  }
  return {chords:cs,reason:cfg.label+' · '+(anchored?'保留根音':'原創伴奏練習')};
 });
}
