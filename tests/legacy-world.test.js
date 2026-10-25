import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse,mod,midiBytes} from '../dist/music.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {mutate,styles} from '../dist/style-engine.js';
import {worldStyles,worldScales} from '../dist/world-styles.js';
import {scaleOptions,scaleNotes,scalePositions} from '../dist/scale-library.js';
import {performance,patterns} from '../dist/performance.js';

test('regional free rewrites keep strict pitch collections, basses and MIDI in scale in every key',()=>{
 const input=parseChart('| C | Am | F | G |'),original=serialize(input);
 for(const [style,cfg] of Object.entries(worldStyles)){
  assert.ok(patterns[cfg.pattern],style);
  for(const phrase of cfg.phrases)for(const bar of parseChart('| '+phrase.join(' | ')+' |'))for(const c of bar.chords){assert.ok(parse(c.symbol),c.symbol);if(cfg.strict)assert.ok(parse(c.symbol).pcs.concat(parse(c.symbol).bass).every(n=>worldScales[cfg.scaleIds[0]].intervals.includes(n)),style+' '+c.symbol);}
  for(let key=0;key<12;key++)for(const randomness of ['low','medium','high'])for(const seed of [0,1,8,20]){
   const allowed=worldScales[cfg.scaleIds[0]].intervals.map(n=>mod(n+key));
   const bars=mutate(input,{style,key,randomness,seed,method:'style',freedom:'free',density:3});
   assert.equal(bars.length,4);assert.ok(bars.every(b=>b.chords.reduce((sum,c)=>sum+c.beats,0)===4));
   const notes=performance(bars,cfg.pattern,{human:.5});assert.ok(notes.length,style);
   assert.ok(notes.every(n=>n.duration>0&&n.beat>=0&&n.beat+n.duration<=16.000001));
   if(cfg.strict)assert.ok(notes.every(n=>allowed.includes(mod(n.note))),style+' key '+key+' '+randomness+' seed '+seed);
   assert.equal(String.fromCharCode(...midiBytes(notes,16).slice(0,4)),'MThd');
  }
 }
 assert.equal(serialize(input),original);
});
test('world scale recommendations use project tonic, correct spelling and five playable regions',()=>{
 for(const [style,symbol,expected] of [
  ['Japanese Hirajoshi','Abmaj7','C D Eb G Ab'],['Japanese In-sen','Csus4','C Db F G Bb'],
  ['Indian Bhupali','C69','C D E G A'],['Indian Yaman','D/C','C D E F# G A B'],
  ['Ethiopian Tizita','Am7','C D E G A'],['Native Flute','Fsus4/C','C Eb F G Bb'],
  ['Greek Hijaz','Fm','C Db E F G Ab Bb']]){
  const scale=scaleOptions(symbol,{style,key:0})[0];assert.equal(scaleNotes(scale).join(' '),expected);assert.equal(scale.root,0);
  const positions=scalePositions(scale);assert.equal(positions.length,5);assert.ok(positions.every(p=>p.notes.every(n=>scale.pcs.includes(n.pc))));
 }
 const conflicting=scaleOptions('F',{style:'Indian Yaman',key:0})[0];assert.ok(conflicting.conflicts.includes('F'));assert.notEqual(conflicting.level,'和弦相容');
});
test('modal automatic studies avoid jazz cadences while explicit ii–V remains available',()=>{
 const input=parseChart('| C5 | C5 | C5 | C5 |');
 const automatic=mutate(input,{style:'Indian Bhupali',randomness:'high',density:3,seed:9});
 assert.ok(automatic.flatMap(b=>b.chords).every(c=>!parse(c.symbol).pcs.includes(5)&&!parse(c.symbol).pcs.includes(11)));
 const explicit=mutate(input,{style:'Indian Bhupali',method:'cadence',density:3,seed:9});
 assert.ok(explicit.some(b=>b.chords.length===3));assert.notEqual(serialize(automatic),serialize(explicit));
});
test('new groove families produce different note schedules and preserve full-length MIDI mode',()=>{
 const bars=parseChart('| Cm7 | Fm7 | Cm7 | Bb |');
 const rhythms=new Set(['afrobeats','amapiano','dembow','dancehall','highlife','slackKey','sparsePluck','ragaDrone'].map(pattern=>JSON.stringify(performance(bars,pattern,{human:0}).map(n=>[n.beat,n.note]))));
 assert.equal(rhythms.size,8);
 const sustained=performance(bars,'sustain',{human:1,swing:.3,gate:.1});assert.ok(sustained.every(n=>n.beat%4===0&&n.duration===4));
});
