import test from 'node:test';
import assert from 'node:assert/strict';
import {pulsePerformance,renderProtected,chartFromSegments} from '../dist/fusion.js';
import {performance} from '../dist/performance.js';
import {harmonize,auditHarmony,demoMelody} from '../dist/harmony.js';
import {parseChart} from '../dist/solutions.js';
import {transformSelection,notesInBox,NoteHistory} from '../dist/note-edit.js';
import {encodeAuditedMidi} from '../dist/export.js';
import {parseMidi} from '../dist/midi.js';
const attacks=notes=>[...new Set(notes.map(n=>+n.beat.toFixed(6)))];
test('splitting identical harmony must not restart a groove or turn syncopations into downbeats',()=>{
 const whole=parseChart('| C | C |'),split=parseChart('| C:1 C:1 C:2 | C:2 C:1 C:1 |');
 for(const pattern of ['jazz','house','bossa','rock','funk','ballad','lofi','soul','gospel','alberti','folk','metal','afrobeats']){
  const options={human:0,swing:0,barBeats:4};
  assert.deepEqual(pulsePerformance(split,pattern,options),performance(whole,pattern,options),pattern);
 }
});
test('real changes at fractional melody onsets do not shift the bar groove, including odd meters',()=>{
 for(const beats of [3,4,6]){
  const chart=Array.from({length:3},()=>({chords:[{symbol:'C',beats:.37},{symbol:'Am',beats:1.29},{symbol:'F',beats:beats-1.66}]}));
  const reference=chart.map(()=>({chords:[{symbol:'C',beats}]}));
  for(const pattern of ['house','bossa','jazz','rock','funk','alberti'])assert.deepEqual(attacks(pulsePerformance(chart,pattern,{barBeats:beats,human:0,swing:0})),attacks(performance(reference,pattern,{barBeats:beats,human:0,swing:0})),`${pattern} ${beats}`);
 }
});
test('harmonic repairs use the beat grid while the reference melody retains its microtiming',()=>{
 const melody=[{pitch:60,start:.13,end:1.28},{pitch:61,start:1.28,end:2.17},{pitch:66,start:2.17,end:3.39},{pitch:67,start:3.39,end:4}],before=structuredClone(melody);
 const result=harmonize(melody,{policy:'musical',harmonicGrid:.5});
 for(const s of result.segments){assert.equal(s.start*2,Math.round(s.start*2));assert.equal(s.end*2,Math.round(s.end*2));}
 assert.deepEqual(melody,before);
 const r=renderProtected(chartFromSegments(result.segments),'house',{policy:'musical',human:0},melody);assert.equal(auditHarmony(melody,r.accompaniment,{policy:'musical'}).length,0);
});
test('batch move preserves relative timing and pitch intervals even at timeline and pitch limits',()=>{
 const notes=[{pitch:2,start:.13,end:.93},{pitch:65,start:2.37,end:3.1},{pitch:100,start:8,end:9}];
 const moved=transformSelection(notes,new Set([0,1]),{deltaBeat:-20,deltaPitch:-30});
 assert.equal(moved[0].start,0);assert.equal(moved[0].pitch,0);assert.ok(Math.abs((moved[1].start-moved[0].start)-(notes[1].start-notes[0].start))<1e-9);assert.equal(moved[1].pitch-moved[0].pitch,63);assert.deepEqual(moved[2],notes[2]);
 const vertical=transformSelection(notes,[0,1],{deltaPitch:12,horizontal:false});assert.equal(vertical[1].start,notes[1].start);
 const end=transformSelection(notes,[0,2],{deltaBeat:600,deltaPitch:100});assert.equal(end[2].end,512);assert.equal(end[2].pitch,127);
});
test('marquee supports reverse drags, partially intersected notes, and shared resize cannot invert a note',()=>{
 const notes=[{pitch:60,start:0,end:1},{pitch:64,start:1,end:2},{pitch:72,start:1,end:2}];
 assert.deepEqual(notesInBox(notes,{start:1.5,end:.5,low:66,high:58}),[0,1]);
 const resized=transformSelection(notes,[0,1],{kind:'end',deltaBeat:-5});assert.ok(resized[0].end>resized[0].start);assert.ok(resized[1].end>resized[1].start);
 const h=new NoteHistory();h.record(notes);assert.deepEqual(h.undo([]),notes);assert.deepEqual(h.redo(notes),[]);
});
test('harmony-only MIDI physically omits the melody track but keeps tempo, meter and audited note timing',()=>{
 const melody=demoMelody(),r=harmonize(melody),tempoMap=[{beat:0,bpm:80},{beat:4,bpm:96}],meter={numerator:3,denominator:4};
 const bytes=encodeAuditedMidi({includeMelody:false,melody,accompaniment:r.accompaniment,tempoMap,meter});
 assert.equal(new DataView(bytes.buffer).getUint16(10),2); // Conductor + harmony, no empty melody track.
 const decoded=parseMidi(bytes);assert.equal(decoded.tracks.length,1);assert.equal(decoded.tracks[0].channel,1);assert.equal(decoded.tracks[0].notes.length,r.accompaniment.length);assert.deepEqual(decoded.meter,{beat:0,...meter});assert.equal(decoded.tempoMap.length,2);assert.equal(decoded.tempoMap[0].bpm,80);
 assert.throws(()=>encodeAuditedMidi({includeMelody:false,melody:[{pitch:60,start:.0002,end:.0003}],accompaniment:[{pitch:61,start:.0004,end:.0005}]}),/MIDI tick|timing/);
});
test('harmony-only rounding stays inside audible bounds against an unquantized reference audio track',()=>{
 const melody=[{pitch:61,start:1.0002,end:2}],accompaniment=[{pitch:60,start:0,end:1.0002}];
 const decoded=parseMidi(encodeAuditedMidi({melody,accompaniment,includeMelody:false}));
 assert.ok(decoded.tracks[0].notes[0].end<=1.0002);assert.equal(auditHarmony(melody,decoded.tracks[0].notes).length,0);
});
