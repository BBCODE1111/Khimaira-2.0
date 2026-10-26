import test from 'node:test';import assert from 'node:assert/strict';
import {arrangeMelody,followMelodyRhythm} from '../dist/melody-arranger.js';
import {demoMelody,auditHarmony} from '../dist/harmony.js';
import {chartFromSegments,renderProtected} from '../dist/fusion.js';
import {styles} from '../dist/style-engine.js';
import {parse} from '../dist/music.js';
import {sampleAttackOffset} from '../dist/piano.js';
import {encodeAuditedMidi} from '../dist/export.js';import {parseMidi} from '../dist/midi.js';
const basic=['American pop','Rock','Jazz','Bossa nova','House','Classical','Lo-fi hip-hop','Ambient'];
const roots=[0,9,5,7,0,9,5,7,0];
test('the phrase core remains transposition-equivariant while genre harmony may substitute it',()=>{
 for(let key=0;key<12;key++)for(const style of basic){
  const melody=demoMelody().map(n=>({...n,pitch:n.pitch+key})),r=arrangeMelody(melody,{style,key:{root:key,mode:'major'}});
  assert.deepEqual(r.segments.map(s=>parse(s.core||s.symbol).root),roots.map(n=>(n+key)%12),`${style} ${key}`);
  assert.deepEqual(r.segments.map(s=>s.start),[0,4,8,12,16,20,24,28,30]);
 }
});
test('genre variation retains a traceable melody core without half-bar chord churn',()=>{
 for(const style of basic)for(let seed=0;seed<5;seed++){
  const r=arrangeMelody(demoMelody(),{style,seed});assert.deepEqual(r.segments.map(s=>parse(s.core||s.symbol).root),roots);assert.equal(r.segments.length,9);
 }
});
test('all eight basic arrangements have audible bar-one anchors and retain distinct genre rhythm, with zero discarded notes on the fixture',()=>{
 const melody=demoMelody(),signatures=new Set();
 for(const style of basic){const cfg=styles[style],h=arrangeMelody(melody,{style}),chart=chartFromSegments(h.segments),r=renderProtected(chart,cfg.pattern,{followMelody:true,policy:'musical',voicing:cfg.voicing,human:0,swing:style==='Jazz'?.16:0},melody);
  assert.equal(r.removed,0,style);assert.equal(auditHarmony(melody,r.accompaniment,{policy:'musical'}).length,0,style);
  for(let beat=0;beat<32;beat+=4){const sounding=r.accompaniment.filter(n=>n.start<=beat+1e-7&&n.end>beat+.1);assert.ok(sounding.length>=3,`${style}: missing harmony support at ${beat}`);}
  assert.ok(r.accompaniment.filter(n=>n.start<=30+1e-7&&n.end>30.1).length>=3,style+' final tonic arrival');
  if(style!=='Ambient')for(let beat=0;beat<32;beat+=2)assert.ok(r.notes.some(n=>n.beat===beat),`${style}: missing meter anchor ${beat}`);
  const file=parseMidi(encodeAuditedMidi({melody,accompaniment:r.accompaniment,policy:'musical',includeMelody:false}));assert.equal(file.tracks.length,1);
  signatures.add(r.notes.map(n=>`${n.beat.toFixed(3)}:${n.duration.toFixed(2)}`).join(','));
 }
 assert.ok(signatures.size>=7);
});
test('a changed melodic harmonic arrival shifts the arrangement, and denser phrases lighten subdivision velocities',()=>{
 const first=demoMelody(),changed=first.map(n=>n.start>=4&&n.start<8?{...n,pitch:n.pitch-2}:n);
 assert.notDeepEqual(arrangeMelody(changed).segments.map(s=>s.symbol),arrangeMelody(first).segments.map(s=>s.symbol));
 const plan=[{symbol:'C',beat:0,beats:4,notes:[36,60,64,67]}],raw=[{beat:.5,note:64,duration:.25,velocity:.7}],sparse=[{pitch:60,start:0,end:3.8}],busy=Array.from({length:8},(_,i)=>({pitch:60,start:i*.5,end:i*.5+.4}));
 const a=followMelodyRhythm(raw,plan,sparse,{pattern:'house'}),b=followMelodyRhythm(raw,plan,busy,{pattern:'house'});assert.ok(b.find(n=>n.beat===.5).velocity<a.find(n=>n.beat===.5).velocity);
});
test('sample lead-in is measured from audio data, bounded, and silence is not mistaken for an attack',()=>{
 const data=new Float32Array(4410);for(let i=600;i<1800;i++)data[i]=Math.sin((i-600)*.08)*.4;
 const buffer={sampleRate:44100,getChannelData:()=>data},offset=sampleAttackOffset(buffer);assert.ok(offset>.013&&offset<.015);
 assert.equal(sampleAttackOffset({sampleRate:44100,getChannelData:()=>new Float32Array(4410)}),0);
});
test('all 48 retained styles can arrange the baseline melody while retaining a traceable core or failing export',()=>{
 const melody=demoMelody();
 for(const [style,cfg] of Object.entries(styles)){
  const h=arrangeMelody(melody,{style}),r=renderProtected(chartFromSegments(h.segments),cfg.pattern,{followMelody:true,policy:'musical',voicing:cfg.voicing,human:0},melody);
  assert.deepEqual(h.segments.map(s=>parse(s.core||s.symbol).root),roots,style);assert.ok(r.notes.length,style);assert.equal(auditHarmony(melody,r.accompaniment,{policy:'musical'}).length,0,style);
  assert.ok(encodeAuditedMidi({melody,accompaniment:r.accompaniment,policy:'musical',includeMelody:false}).length,style);
 }
});
test('audio-like early onsets retain the same harmonic function, while real performed tails still respect exact melody timing',()=>{
 const melody=demoMelody().map((n,i)=>({...n,start:i?Math.max(0,n.start-.05):0,end:n.end+.02}));
 for(const style of basic){
  const h=arrangeMelody(melody,{style});assert.deepEqual(h.segments.map(s=>parse(s.core||s.symbol).root),roots,style);
  const cfg=styles[style],r=renderProtected(chartFromSegments(h.segments),cfg.pattern,{followMelody:true,policy:'musical',voicing:cfg.voicing,human:0,swing:0},melody);
  assert.equal(auditHarmony(melody,r.accompaniment,{policy:'musical'}).length,0,style);assert.equal(r.removed,0,style);
  for(let beat=0;beat<32;beat+=4)assert.ok(r.accompaniment.filter(n=>n.start<=beat+1e-7&&n.end>beat+.1).length>=3,style+' audio downbeat '+beat);
 }
});
