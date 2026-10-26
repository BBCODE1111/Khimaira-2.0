import test from 'node:test';
import assert from 'node:assert/strict';
import {MelodyWorkspace} from '../dist/melody-workspace.js';
import {MelodyPlayer} from '../dist/player.js';
import {demoMelody} from '../dist/harmony.js';
import {NoteHistory} from '../dist/note-edit.js';
import {beatToSeconds} from '../dist/midi.js';

function workspace(kind='audio',reviewRequired=false){
 const w=Object.create(MelodyWorkspace.prototype),notes=demoMelody(),button={setAttribute(name,value){this[name]=value;}};
 Object.assign(w,{kind,reviewRequired,notes:structuredClone(notes),audioNotes:notes.map(n=>({...n,start:n.start*60/108+.2,end:n.end*60/108+.2})),bpm:108,sourceBpm:108,offset:.2,mode:'notes',mix:{melody:.35,harmony:1},muted:false,history:new NoteHistory(),render(){},onStop(){return false;},onChange(){},onMix(){},$:()=>button});
 return w;
}
test('confirmed audio, MIDI and drawn notes keep pitch, beats, bar count and edits across repeated tempo changes',()=>{
 for(const kind of ['audio','midi','manual','demo']){
  const w=workspace(kind);w.notes[1].start+=.125;const before=structuredClone(w.notes);w.history.record(before);
  for(const bpm of [72,144,90,108]){w.setTempo(bpm);assert.deepEqual(w.notes,before,kind);assert.equal(Math.ceil(Math.max(...w.notes.map(n=>n.end))/4),8);assert.equal(w.tempoMap[0].bpm,bpm);assert.equal(beatToSeconds(32,w.tempoMap),32*60/bpm);}
  assert.equal(w.history.undoStack.length,1,'changing playback speed preserves editing undo');
 }
});
test('unconfirmed audio still calibrates seconds to beats; confirmation freezes the calibrated beat positions',()=>{
 const w=workspace('audio',true);w.setTempo(54);assert.equal(w.notes[4].start,2);assert.equal(w.sourceBpm,54);
 const calibrated=structuredClone(w.notes);w.reviewRequired=false;w.setTempo(120);assert.deepEqual(w.notes,calibrated);assert.equal(w.sourceBpm,54);
});
test('original audio switches to pitch-preserving note playback at another tempo, without changing the source',()=>{
 const w=workspace();w.mode='original';const source=structuredClone(w.audioNotes);w.setTempo(144);assert.equal(w.mode,'notes');assert.equal(w.originalAvailable,false);assert.deepEqual(w.audioNotes,source);w.setTempo(108);assert.equal(w.originalAvailable,true);
});
test('tempo changes resume an active transport; invalid values do not mutate it',()=>{
 const w=workspace();w.onStop=()=>true;let change;w.onChange=(kind,options)=>change={kind,...options};w.setTempo(144);assert.deepEqual(change,{kind:'tempo',resume:true});
 for(const value of [NaN,0,301])assert.throws(()=>w.setTempo(value));assert.equal(w.bpm,144);
});
test('mute is independent of audition source, volume, melody notes and transport',()=>{
 const w=workspace();w.mode='original';const notes=structuredClone(w.notes);let updates=[];w.onMix=restart=>updates.push([restart,w.melodyGain]);w.onStop=()=>assert.fail('mute must not stop transport');
 w.setMuted(true);assert.equal(w.$('mute')['aria-pressed'],'true');w.mix.melody=.55;assert.equal(w.melodyGain,0);w.setMuted(false);assert.equal(w.melodyGain,.55);assert.equal(w.mode,'original');assert.deepEqual(w.notes,notes);assert.deepEqual(updates,[[false,0],[false,.55]]);
});
test('player mix mutes and restores an already sounding melody bus without touching harmony or stopping playback',()=>{
 const p=new MelodyPlayer(),melody=[],harmony=[];p.context={currentTime:3};p.playing=true;p.melodyBus={gain:{setTargetAtTime(...a){melody.push(a);}}};p.piano={master:{gain:{setTargetAtTime(...a){harmony.push(a);}}}};
 p.setMix(0,1);p.setMix(.35,1);assert.deepEqual(melody,[[0,3,.015],[.35,3,.015]]);assert.deepEqual(harmony,[[.68,3,.015],[.68,3,.015]]);assert.equal(p.playing,true);
});
