import test from 'node:test';
import assert from 'node:assert/strict';
import {transformNote, createNote, NoteHistory, MIN_NOTE_BEATS} from '../dist/note-edit.js';
import {demoMelody, harmonize, auditHarmony, validateMelody} from '../dist/harmony.js';
import {chartFromSegments, protectChart, renderProtected} from '../dist/fusion.js';
import {encodeAuditedMidi} from '../dist/export.js';
import {parseMidi} from '../dist/midi.js';
const original={pitch:64,start:.083,end:.733,velocity:.63,confidence:.87};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('drag snaps time, preserves duration/metadata and moves pitch without mutating input',()=>{
 const before=structuredClone(original), moved=transformNote(original,{deltaBeat:.6,deltaPitch:2});
 assert.equal(moved.start,.75);near(moved.end-moved.start,.65);assert.equal(moved.pitch,66);assert.equal(moved.velocity,.63);assert.equal(moved.confidence,.87);assert.deepEqual(original,before);
});
test('vertical motion leaves imported microtiming untouched and free move bypasses snap',()=>{
 const vertical=transformNote(original,{deltaPitch:-1,horizontal:false});assert.equal(vertical.start,original.start);assert.equal(vertical.end,original.end);
 const free=transformNote(original,{deltaBeat:.111,step:0});near(free.start,.194);near(free.end,.844);
});
test('drag clamps MIDI pitch and timeline boundaries while preserving duration',()=>{
 const lower=transformNote(original,{deltaBeat:-100,deltaPitch:-200});assert.equal(lower.start,0);assert.equal(lower.pitch,0);near(lower.end,.65);
 const upper=transformNote(original,{deltaBeat:999,deltaPitch:200});assert.equal(upper.pitch,127);near(upper.end,512);near(upper.end-upper.start,.65);validateMelody([lower,upper]);
});
test('resize either edge retains pitch and opposite edge; cannot invert a note',()=>{
 const note={pitch:60,start:1,end:2};
 assert.deepEqual(transformNote(note,{kind:'end',deltaBeat:.6}),{pitch:60,start:1,end:2.5});
 assert.deepEqual(transformNote(note,{kind:'start',deltaBeat:.3}),{pitch:60,start:1.25,end:2});
 const end=transformNote(note,{kind:'end',deltaBeat:-100}),start=transformNote(note,{kind:'start',deltaBeat:100});
 near(end.end-end.start,MIN_NOTE_BEATS);near(start.end-start.start,MIN_NOTE_BEATS);validateMelody([end,start]);
 assert.equal(transformNote(note,{kind:'end',deltaBeat:999}).end,512);
});
test('triplet grid and newly drawn notes remain valid at limits',()=>{
 const n=createNote(2.6,61,1/3);near(n.start,8/3);near(n.end,3);
 validateMelody([createNote(-3,-5),createNote(999,999),createNote(511.999,127,0)]);
 assert.throws(()=>transformNote(original,{deltaBeat:NaN}));
});
test('history snapshots are independent; undo/redo, new branches and bounded retention',()=>{
 const h=new NoteHistory(2),a=[{...original}],b=[transformNote(original,{deltaPitch:1})],c=[transformNote(original,{deltaPitch:2})];
 h.record(a);a[0].pitch=10;const restored=h.undo(b);assert.equal(restored[0].pitch,64);assert.deepEqual(h.redo(restored),b);
 h.record(b);h.record(c);assert.equal(h.undoStack.length,2);assert.deepEqual(h.undo(a),c);h.record(a);assert.equal(h.redo(a),null);h.clear();assert.equal(h.undo(a),null);
});
test('moving across bars, lengthening and adding chromatic melody notes re-protects accompaniment and exports edited notes',()=>{
 const before=demoMelody(), chart=chartFromSegments(harmonize(before).segments);
 const edited=structuredClone(before);edited[0]=transformNote(edited[0],{deltaBeat:4.25,deltaPitch:1});edited[2]=transformNote(edited[2],{kind:'end',deltaBeat:2});edited.push(createNote(7.5,66,.5));edited.sort((a,b)=>a.start-b.start);
 const protectedChart=protectChart(chart,edited),result=renderProtected(protectedChart.bars,'arp',{arpMode:'upDown',arpOctaves:3},edited);
 assert.equal(auditHarmony(edited,result.accompaniment).length,0);
 const midi=parseMidi(encodeAuditedMidi({melody:edited,accompaniment:result.accompaniment}));
 assert.equal(midi.tracks[0].notes.length,33);assert.ok(midi.tracks[0].notes.some(n=>n.pitch===before[0].pitch+1&&Math.abs(n.start-4.25)<1e-6));
});
