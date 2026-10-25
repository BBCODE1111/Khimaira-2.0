import {test} from 'node:test';import assert from 'node:assert/strict';
import {performance,patterns,segments} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';import {midiBytes} from '../dist/music.js';
import {BeatPlayer} from '../dist/tempo-player.js';
const connected=['doom','alternative','gothic','requiem','sustain','ballad','bossa','gospel','soul','rnb','lofi','neosoul','chill','ambient','neoclassical','modalPluck','sparsePluck','pentatonicAnswer','breathingDrone','ragaDrone'];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function decode(bytes){let p=22,tick=0,active=new Map,notes=[];while(p<bytes.length){let delta=0,x;do{x=bytes[p++];delta=(delta<<7)|(x&127);}while(x&128);tick+=delta;const status=bytes[p++];if(status===0xc0){p++;continue;}if(status===255){assert.equal(bytes[p++],47);assert.equal(bytes[p++],0);continue;}const note=bytes[p++],velocity=bytes[p++];if(status===0x90){assert.ok(!active.has(note),'overlapping MIDI '+note);active.set(note,{note,start:tick,velocity});}else {assert.equal(status,0x80);const n=active.get(note);assert.ok(n,'unmatched note off');assert.ok(tick>n.start,'zero-length MIDI');notes.push({...n,end:tick});active.delete(note);}}
 assert.equal(active.size,0,'stuck MIDI notes');return {notes,tick};}

test('held voices connect every chord and bar boundary, including dense changes and loop endpoints',()=>{
 for(const chart of ['| C | Am | F | G |','| C:2 Bm7b5:1 E7:1 | Am | F:1 G:1 C:2 | G7 |','| C C C | C C C C |']){
  const bars=parseChart(chart);for(const pattern of connected)for(const gate of [.1,.82,1]){
   const ns=performance(bars,pattern,{gate,human:.9,swing:.25});
   for(const segment of segments(bars)){const end=segment.beat+segment.beats;assert.ok(ns.some(n=>n.beat<end&&Math.abs(n.beat+n.duration-end)<1e-8),`${pattern} gate ${gate} chart ${chart} drops out before ${end}`);}
  }
 }
});
test('all performance patterns round-trip through MIDI without lost, stuck, overlapping or shortened notes',()=>{
 for(const chart of ['| C | Am | F | G |','| C Bm7b5 E7 | Am7 D7 | Fmaj9 G13 | C69 |'])for(const pattern of Object.keys(patterns))for(const gate of [.1,.82,1])for(const rate of [.25,.5,1]){
  const bars=parseChart(chart),ns=performance(bars,pattern,{gate,rate,human:1,swing:.32}),midi=decode(midiBytes(ns,16));
  assert.equal(midi.tick,7680);assert.equal(midi.notes.length,ns.length,pattern);
  const expected=ns.map(n=>({note:n.note,start:Math.round(n.beat*480),end:Math.round((n.beat+n.duration)*480),velocity:Math.round(n.velocity*100)}));
  const order=(a,b)=>a.start-b.start||a.note-b.note;assert.deepEqual(midi.notes.sort(order),expected.sort(order),pattern);
 }
});
test('swing arpeggios use actual long/short beat intervals; gate retains intentional articulation',()=>{
 const notes=performance(parseChart('| C |'),'arpUp',{gate:1,swing:.3,human:0,rate:.5});
 const first=notes.find(n=>n.beat===0),second=notes.find(n=>Math.abs(n.beat-.8)<1e-8);
 assert.ok(first.duration>.76&&first.duration<=.8);assert.ok(second.duration>.19&&second.duration<=.2);
 const funk=performance(parseChart('| C | Am |'),'funk',{gate:.82,human:0});assert.ok(funk.every(n=>n.duration<.5),'funk keeps its short attacks');
});
test('all patterns are scheduled through chord boundaries and loops despite mobile-sized timer jitter',()=>{
 for(const bpm of [60,92,180,260])for(const pattern of Object.keys(patterns)){
  const ns=performance(parseChart('| C | Am | F | G |'),pattern),calls=[],piano={context:{currentTime:0},note(note,when,duration){calls.push({note,when,duration});return {cancel(){},retime(){}};},stop(){}};
  const p=new BeatPlayer(piano,ns,16,{bpm,loop:true});let i=0;
  while(piano.context.currentTime<p.timeAt(32)){p.pump();piano.context.currentTime+=[.025,.045,.12][i++%3];}
  const expected=[...ns,...ns.map(n=>({...n,beat:n.beat+16}))];
  for(const n of expected){const call=calls.find(c=>c.note===n.note&&Math.abs(c.when-p.timeAt(n.beat))<1e-8);assert.ok(call,pattern+' '+bpm+' missing/onset late '+n.beat);near(call.duration,n.duration*60/bpm);}
 }
});
test('natural completion lets piano releases finish; explicit STOP still damps voices',()=>{
 let stops=0;const piano={context:{currentTime:0},stop(){stops++;}},p=new BeatPlayer(piano,[],4);p.stop({natural:true});assert.equal(stops,0);p.stop();assert.equal(stops,1);
});

test('MIDI quantization merges same-tick attacks and retains positive durations at sub-tick edges',()=>{
 const {notes,tick}=decode(midiBytes([{note:60,beat:0,duration:.0001,velocity:.6},{note:60,beat:.0002,duration:1,velocity:.7},{note:60,beat:1,duration:1,velocity:.6},{note:64,beat:2,duration:.0001,velocity:.5}],4));
 assert.equal(notes.length,3);assert.equal(tick,1920);assert.deepEqual(notes.map(n=>[n.note,n.start,n.end]),[[60,0,480],[60,480,960],[64,960,961]]);
});
