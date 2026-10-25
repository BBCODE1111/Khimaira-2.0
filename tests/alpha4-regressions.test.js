import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceHints,decodeMelody,transcriptionResult} from '../dist/transcription.js';
import {demoMelody,harmonize,auditHarmony} from '../dist/harmony.js';
import {rewriteWithMelody,chartFromSegments,renderProtected} from '../dist/fusion.js';
import {mutate,styles} from '../dist/style-engine.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {performance} from '../dist/performance.js';
import {synthEnvelope,synthPresets} from '../dist/melody-synth.js';
import {encodeAuditedMidi} from '../dist/export.js';
import {parseMidi} from '../dist/midi.js';
test('source loop labels preserve BPM/key and leading rests; never pretend they are acoustic estimates',()=>{
 assert.deepEqual(sourceHints('PACK_VOC_80_vocal_phrase_wet_Dmaj.wav'),{bpm:80,key:{root:2,mode:'major'}});
 assert.deepEqual(sourceHints('vocal_95bpm_F#min.wav'),{bpm:95,key:{root:6,mode:'minor'}});
 assert.deepEqual(sourceHints('recording.wav'),{bpm:null,key:null});
 const notes=[{pitch:69,start:.7,end:1.3,confidence:.8}],r=transcriptionResult(notes,48,'phrase_80_Dmaj.wav');
 assert.equal(r.tempo.bpm,80);assert.equal(r.offset,0);assert.equal(r.key.root,2);assert.match(r.warnings[0],/檔名/);assert.equal(r.notes[0].pitch,69);
 const unknown=transcriptionResult(notes,2,'recording.wav');assert.equal(unknown.reviewRequired,true);assert.equal(unknown.tempo.confidence,'不足以判定');
});
const activation=(pitch,strength=.9)=>{const row=Array(88).fill(.001);if(pitch!==null)row[pitch-21]=strength;return row;};
test('melody path suppresses brief octave glitches while retaining sustained chromatic changes and rests',()=>{
 const frames=Array.from({length:160},(_,i)=>activation(i<45?69:i<70?70:i<105?null:66));frames[12]=activation(81);frames[13]=activation(81);
 const notes=decodeMelody(frames);assert.deepEqual(notes.map(n=>n.pitch),[69,70,66]);assert.ok(notes[2].start-notes[1].end>.3);assert.equal(notes[0].start,0);
 assert.deepEqual(decodeMelody(Array.from({length:50},()=>activation(null))),[]);
});
test('GENERATE changes the final protected chart across styles, not just discarded raw candidates',()=>{
 const melody=demoMelody(),source=chartFromSegments(harmonize(melody).segments),results=new Set();let previous=source;
 for(const style of ['Jazz','Rock','House','Bossa nova','Ambient']){
  const candidate=mutate(source,{style,key:0,mode:'major',method:'style',seed:2});const bars=rewriteWithMelody(candidate,melody,{style,key:{root:0,mode:'major'},seed:2,previous});
  assert.notEqual(serialize(bars),serialize(previous),style);results.add(serialize(bars));previous=bars;
  const r=renderProtected(bars,styles[style].pattern,{voicing:styles[style].voicing,bpm:108},melody);assert.equal(auditHarmony(melody,r.accompaniment).length,0);
  assert.ok(parseMidi(encodeAuditedMidi({melody,accompaniment:r.accompaniment})).tracks[1].notes.length);
 }
 assert.equal(results.size,5);
});
test('same-style repeated generation explores different safe harmonies',()=>{
 const melody=demoMelody(),source=chartFromSegments(harmonize(melody).segments),seen=new Set();let previous=source;
 for(let seed=1;seed<=4;seed++){previous=rewriteWithMelody(source,melody,{style:'Jazz',seed,previous});seen.add(serialize(previous));}
 assert.ok(seen.size>=3);
});
test('unsafe bossa fifth ornament is revoiced onto a safe chord tone without losing its rhythmic attack',()=>{
 const chart=parseChart('| Caug |'),line=[{pitch:68,start:0,end:4}],raw=performance(chart,'bossa',{human:0}),r=renderProtected(chart,'bossa',{human:0},line);
 assert.ok(raw.some(n=>n.note%12===7&&n.beat===2));
 assert.ok(r.adjusted>0);assert.ok(r.notes.some(n=>n.beat===2));assert.equal(r.removed,0);assert.equal(auditHarmony(line,r.accompaniment).length,0);
});
test('held common tones cross bar lines without reattacks; rhythmic pulses are retained',()=>{
 const chart=parseChart('| C | C |'),melody=[{pitch:64,start:0,end:8}];
 const held=renderProtected(chart,'sustain',{},melody);assert.ok(held.notes.every(n=>n.beat===0&&n.duration===8));
 const pulse=renderProtected(chart,'rock',{human:0},melody);assert.ok(pulse.notes.some(n=>n.beat===4));
});
test('natural release extends safe sounds but ends before an incompatible next melody',()=>{
 const chart=parseChart('| C |'),melody=[{pitch:64,start:0,end:1},{pitch:61,start:1,end:4}],r=renderProtected(chart,'jazz',{human:0,gate:1,swing:0},melody);
 assert.equal(auditHarmony(melody,r.accompaniment).length,0);assert.ok(r.accompaniment.every(n=>n.end>=n.gateEnd));
 const safe=renderProtected(chart,'rock',{human:0},[{pitch:64,start:0,end:4}]);assert.ok(safe.accompaniment.some(n=>n.end>n.gateEnd));
});
test('warm and keys presets have harmonic content and bounded click-free short-note envelopes',()=>{
 for(const name of Object.keys(synthPresets))for(const duration of [.002,.05,.5,3]){const e=synthEnvelope(duration,name);assert.ok(e.attack+e.decay+e.release<=duration+1e-9);assert.ok(e.attack>0&&e.release>0);}
 assert.ok(synthPresets.warm.partials.slice(2).some(v=>v>0));assert.ok(synthPresets.keys.partials.slice(2).some(v=>v>0));
});

test('a strong fresh onset splits repeated same-pitch notes without quantizing their timing',()=>{
 const frames=Array.from({length:100},()=>activation(72,.85)),onsets=Array.from({length:100},()=>Array(88).fill(0));
 for(let t=44;t<50;t++)frames[t][51]=.5;onsets[50][51]=.95;
 const notes=decodeMelody(frames,onsets);assert.deepEqual(notes.map(n=>n.pitch),[72,72]);assert.equal(notes[0].end,notes[1].start);
});

test('musical color is explicit: permits whole-tone colors, retains semitone/tritone protection, and exports using the selected rule',()=>{
 const melody=[{pitch:62,start:0,end:4}],chart=parseChart('| C |');
 const result=renderProtected(chart,'sustain',{policy:'musical'},melody);
 assert.ok(result.accompaniment.some(n=>n.pitch%12===0));
 assert.ok(auditHarmony(melody,result.accompaniment).length>0);
 assert.equal(auditHarmony(melody,result.accompaniment,{policy:'musical'}).length,0);
 assert.throws(()=>encodeAuditedMidi({melody,accompaniment:result.accompaniment}));
 assert.ok(encodeAuditedMidi({melody,accompaniment:result.accompaniment,policy:'musical'}).length);
 for(const pitch of [61,66])assert.ok(auditHarmony([{pitch,start:0,end:4}],[{pitch:60,start:0,end:4}],{policy:'musical'}).length>0);
});
