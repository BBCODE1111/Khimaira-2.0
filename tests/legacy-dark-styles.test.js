import {test} from 'node:test';import assert from 'node:assert/strict';
import {darkStyles} from '../dist/dark-styles.js';import {mutate,styles} from '../dist/style-engine.js';import {examplePool,nextExample} from '../dist/example-pool.js';import {parseChart,serialize} from '../dist/solutions.js';import {parse,mod,midiBytes} from '../dist/music.js';import {performance,segments} from '../dist/performance.js';import {scaleOptions} from '../dist/scale-library.js';
const input=parseChart('| C | Am | F | G |');
function verifyMidi(bytes,expected){let p=22,tick=0,count=0;const active=new Map;while(p<bytes.length){let d=0,x;do{x=bytes[p++];d=d*128+(x&127);}while(x&128);tick+=d;const status=bytes[p++];if(status===0xc0){p++;continue;}if(status===255){assert.equal(bytes[p++],47);assert.equal(bytes[p++],0);continue;}const note=bytes[p++];p++;if(status===0x90){assert.ok(!active.has(note));active.set(note,tick);count++;}else{assert.equal(status,0x80);assert.ok(active.has(note));assert.ok(tick>active.get(note));active.delete(note);}}assert.equal(active.size,0);assert.equal(count,expected);assert.equal(tick,7680);}

test('six dark styles expose 48 unique studies, four dark directions, suitable tempos and matching grooves',()=>{
 assert.equal(Object.keys(darkStyles).length,6);let count=0;
 for(const [style,cfg] of Object.entries(darkStyles)){const pool=examplePool(style);count+=pool.length;assert.equal(pool.length,8,style);assert.deepEqual(pool.slice(0,4).map(p=>p.category),cfg.moodOrder);assert.ok(pool.every(p=>!/明亮|浪漫|溫暖/.test(p.title)));assert.equal(new Set(pool.map(p=>serialize(parseChart(p.chart)))).size,8);let id=null;const visited=new Set;for(let i=0;i<8;i++){const p=nextExample(pool,id);visited.add(p.id);id=p.id;}assert.equal(visited.size,8);assert.equal(styles[style].defaultMode,'minor');assert.ok(cfg.tempo>=60&&cfg.tempo<=150);}
 assert.equal(count,48);
});
test('authored Phrygian/tritone, suspended, chromatic and Neapolitan colors survive generation in every key',()=>{
 const empty=Array.from({length:4},()=>({chords:[]}));
 for(const [style,cfg] of Object.entries(darkStyles))for(let seed=0;seed<4;seed++)for(let key=0;key<12;key++){
  const expected=parseChart('| '+cfg.phrases[seed].join(' | ')+' |'),out=mutate(empty,{style,key,seed,mode:'minor',randomness:'high',density:3});
  out.forEach((b,i)=>b.chords.forEach((c,j)=>{const a=parse(c.symbol),e=parse(expected[i].chords[j].symbol);assert.equal(a.root,mod(e.root+key));assert.equal(a.q,e.q);assert.equal(a.bass,mod(e.bass+key));}));
 }
});
test('low mutation respects supplied roots; free high mutation changes structure without soft jazz extensions',()=>{
 const before=structuredClone(input);
 for(const style of Object.keys(darkStyles)){
  const low=mutate(input,{style,mode:'minor',randomness:'low',seed:1});low.forEach((b,i)=>assert.equal(parse(b.chords[0].symbol).root,parse(input[i].chords[0].symbol).root));
  const variants=new Set;for(let seed=0;seed<4;seed++){const out=mutate(input,{style,mode:'minor',randomness:'high',seed});variants.add(serialize(out));assert.ok(out.every(b=>b.chords.every(c=>!/(maj9|m11|13|69)/.test(c.symbol))));}
  assert.equal(variants.size,4,style);
 }
 assert.deepEqual(input,before);
});
test('every dark example has musical boundaries and balanced MIDI at all keys and gate extremes',()=>{
 for(const [style,cfg] of Object.entries(darkStyles))for(const p of examplePool(style))for(let key=0;key<12;key++)for(const gate of [.1,1]){
  const bars=parseChart(p.chart);for(const b of bars)for(const c of b.chords){const x=parse(c.symbol),names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];c.symbol=names[mod(x.root+key)]+x.q+(c.symbol.includes('/')?'/'+names[mod(x.bass+key)]:'');}
  const ns=performance(bars,cfg.pattern,{voicing:cfg.voicing,gate,human:1});assert.ok(ns.length);verifyMidi(midiBytes(ns,16),ns.length);
  const last=new Map;for(const n of ns){const s=segments(bars).find(s=>n.beat>=s.beat&&n.beat<s.beat+s.beats);assert.ok(s);assert.ok(n.duration>0&&n.beat+n.duration<=s.beat+s.beats+1e-8);assert.ok(parse(s.symbol).pcs.includes(mod(n.note))||parse(s.symbol).bass===mod(n.note));assert.ok(n.beat>=(last.get(n.note)||0)-1e-8);last.set(n.note,n.beat+n.duration);}
 }
});
test('metal gallops, doom and requiem hold, and all six patterns sound rhythmically distinct',()=>{
 const bars=parseChart('| Cm | Ab | Fm | G7 |'),signatures=new Set;
 for(const cfg of Object.values(darkStyles))signatures.add(JSON.stringify(performance(bars,cfg.pattern,{human:0,gate:.82})));
 assert.equal(signatures.size,6);
 for(const p of ['doom','requiem']){const ns=performance(bars,p,{human:0,gate:.1});for(const end of [4,8,12,16])assert.ok(ns.some(n=>Math.abs(n.beat+n.duration-end)<1e-8));}
 const gallop=performance(parseChart('| C5 |'),'metal',{human:0});for(const beat of [0,.5,.75,1,1.5,1.75])assert.ok(gallop.some(n=>n.note===36&&n.beat===beat));
 const scales=scaleOptions('C5');for(const label of ['Aeolian','Phrygian','Harmonic minor','Minor blues'])assert.ok(scales.some(s=>s.label===label&&s.level==='和弦相容'));
});
