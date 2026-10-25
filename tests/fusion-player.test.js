import test from 'node:test';
import assert from 'node:assert/strict';
import {MelodyPlayer} from '../dist/player.js';
import {Piano} from '../dist/piano.js';
function setup(){const p=new MelodyPlayer(),calls=[];p.context={currentTime:0};p.unlock=async()=>p.context;p.setMix=(m,h)=>{p.mix=[m,h];};p.piano={note(...a){calls.push(a);},stop(){}};return {p,calls};}
test('sampled harmony uses original velocities and strict releases; melody defaults to 35%',async()=>{
 const {p,calls}=setup();try{await p.play({melody:[],accompaniment:[{pitch:60,start:0,end:1,velocity:.74}],tempoMap:[{beat:0,bpm:120}],totalBeats:4});assert.deepEqual(p.mix,[.35,1]);assert.equal(calls[0][3],.74);assert.deepEqual(calls[0][4],{strict:true,alignAttack:true});}finally{p.stop();}
});
test('cue and variable-tempo playback use a common clock and loops stop at the current cycle end',async()=>{
 const {p,calls}=setup();try{
  await p.play({melody:[],accompaniment:[{pitch:60,start:0,end:1,velocity:.7},{pitch:64,start:2,end:3,velocity:.7}],tempoMap:[{beat:0,bpm:120},{beat:2,bpm:60}],totalBeats:4,startBeat:2,loop:true});
  assert.equal(calls.length,1);assert.equal(calls[0][0],64);assert.ok(Math.abs(calls[0][2]-1)<1e-8);
  p.context.currentTime=2.08;p.pump();assert.equal(calls.length,2);p.setLoop(false);assert.equal(p.playing,true);p.context.currentTime=3;p.pump();assert.equal(p.playing,true);p.context.currentTime=4.08;p.pump();assert.equal(p.playing,false);
 }finally{p.stop();}
});
test('stopping while piano samples load prevents a late playback start',async()=>{
 const {p,calls}=setup();let resolve;p.unlock=()=>new Promise(r=>resolve=r);const pending=p.play({melody:[],accompaniment:[{pitch:60,start:0,end:1}],tempoMap:[{beat:0,bpm:120}],totalBeats:4});p.stop();resolve();assert.equal(await pending,false);assert.equal(calls.length,0);
});
test('strict sampled-piano envelope reaches zero at note-off; v1 natural release remains available',()=>{
 function context(){const curves=[];const param={value:0,setValueAtTime(...a){curves.push(['set',...a]);},linearRampToValueAtTime(...a){curves.push(['linear',...a]);},exponentialRampToValueAtTime(...a){curves.push(['exp',...a]);}};const node=()=>({gain:{...param},frequency:{value:0},playbackRate:{value:1},connect(){return this;},start(){},stop(){},disconnect(){}});return {curves,context:{currentTime:0,destination:{},createGain:node,createBufferSource:node,createBiquadFilter:node,createDynamicsCompressor(){return {...node(),threshold:{value:0},ratio:{value:0}};}}};}
 for(const strict of [false,true]){const {curves,context:c}=context(),piano=new Piano(c);piano.buffers.set(60,{});const voice=piano.note(60,1,.5,.7,{strict});assert.equal(voice.releaseEnd,strict?1.5:1.6);if(strict)assert.ok(curves.some(a=>a[0]==='linear'&&a[1]===0&&a[2]===1.5));}
});
test('on-beat melody and harmony share exact scheduled attacks through variable tempo and loop boundaries',async()=>{
 const {p,calls}=setup(),tones=[];p.tone=(note,when,duration)=>tones.push({pitch:note.pitch,when,duration});
 const notes=Array.from({length:8},(_,i)=>({pitch:60+i,start:i,end:i+.8,velocity:.7}));
 try{
  await p.play({melody:notes,accompaniment:notes,tempoMap:[{beat:0,bpm:108},{beat:4,bpm:80}],totalBeats:8,loop:true});
  for(let now=.025;now<p.cycleSeconds*2+.05;now+=.025){p.context.currentTime=now;p.pump();}
  assert.ok(tones.length>=16);assert.equal(calls.length,tones.length);
  for(let i=0;i<calls.length;i++){assert.equal(calls[i][0],tones[i].pitch);assert.equal(calls[i][1],tones[i].when);assert.equal(calls[i][2],tones[i].duration);}
  assert.ok(Math.abs(tones[8].when-tones[0].when-p.cycleSeconds)<1e-9);
 }finally{p.stop();}
});
