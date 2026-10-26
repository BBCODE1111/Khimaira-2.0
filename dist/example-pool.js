import {styles} from './style-engine.js?v=2.0.0-alpha.9';
import {songs} from './song-pool.js?v=2.0.0-alpha.9';
import {parseChart,serialize} from './solutions.js?v=2.0.0-alpha.9';
import {studyMood,moodCategory,exampleTitle} from './example-titles.js?v=2.0.0-alpha.9';
import {contrastExamples,moodOrder} from './contrast-examples.js?v=2.0.0-alpha.9';
export function examplePool(style){
 const cfg=styles[style];if(!cfg)return [];
 const order=cfg.moodOrder||moodOrder;
 const studies=cfg.phrases.map((phrase,i)=>({id:`exercise-${style}-${i}`,mood:studyMood(style,i),category:cfg.moodOrder?.[i%order.length],chart:'| '+phrase.join(' | ')+' |',key:0,mode:cfg.world?'modal':cfg.phraseModes?.[i]||cfg.defaultMode||(['Minor blues','Neoclassical rock','Dorian folk','Phrygian dominant'].includes(style)?'minor':'major'),style,type:'study'}));
 const seen=new Set,unique=[...(contrastExamples[style]||[]),...songs.filter(s=>s.style===style),...studies].filter(p=>{
  const fingerprint=serialize(parseChart(p.chart));if(seen.has(fingerprint))return false;seen.add(fingerprint);return true;
 });
 const buckets=Object.fromEntries(order.map(m=>[m,unique.filter(p=>(p.category||moodCategory(p.mood))===m)]));
 const ordered=[];
 const take=m=>ordered.push({...buckets[m].shift(),category:m});
 for(const m of order)if(buckets[m].length)take(m);
 while(order.some(m=>buckets[m].length)){
  const remaining=order.filter(m=>buckets[m].length),different=remaining.filter(m=>m!==ordered.at(-1).category);
  const next=(different.length?different:remaining).sort((a,b)=>buckets[b].length-buckets[a].length)[0];take(next);
 }
 return ordered.map((p,i)=>({...p,title:exampleTitle(p,i)}));
}
// IDs keep manual LOAD and INSPIRE in the same cycle, including after a style change.
export function nextExample(pool,currentId){if(!pool.length)return null;const index=pool.findIndex(p=>p.id===currentId);return pool[(index+1)%pool.length];}
