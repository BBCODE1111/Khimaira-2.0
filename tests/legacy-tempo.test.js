import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BeatPlayer,validTempo} from '../dist/tempo-player.js';
import {releaseSeconds} from '../dist/piano.js';
import {performance,patterns} from '../dist/performance.js';
import {parseChart} from '../dist/solutions.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fakePiano(){return {context:{currentTime:0},voices:[],note(note,when,duration){const v={note,when,end:when+duration,retimes:0,cancelled:false,cancel(){this.cancelled=true;},retime(end){this.end=end;this.retimes++;}};this.voices.push(v);return v;},stop(){this.voices.forEach(v=>v.cancel());}};}
const notes=[{note:60,beat:0,duration:4,velocity:.7},{note:64,beat:1,duration:.5,velocity:.7}];
test('60, 120 and 240 BPM map beats and note lengths to audio seconds exactly',()=>{
 for(const bpm of [60,120,240]){
 const piano=fakePiano(),p=new BeatPlayer(piano,notes,4,{bpm,lead:0});p.pump();
 near(piano.voices[0].end,240/bpm);near(p.timeAt(4),240/bpm);
 piano.context.currentTime=60/bpm-.04;p.pump();near(piano.voices[1].when,60/bpm);near(piano.voices[1].end-piano.voices[1].when,30/bpm);
 piano.context.currentTime=240/bpm;assert.equal(p.pump(),false);
 }
});
test('live acceleration preserves beat position, retimes held notes and cancels future attacks',()=>{
 const piano=fakePiano(),p=new BeatPlayer(piano,notes,4,{bpm:60,lead:0});p.pump();
 piano.context.currentTime=.95;p.pump();const held=piano.voices[0],future=piano.voices[1];
 p.setTempo(240);near(p.beatAt(),.95);near(held.end,.95+3.05/4);assert.equal(held.retimes,1);assert.ok(future.cancelled);
 const replacement=piano.voices[2];near(replacement.when,.95+.05/4);near(replacement.end-replacement.when,.5/4);
 assert.equal(piano.voices.filter(v=>v.note===60).length,1);
 piano.context.currentTime=1.2;near(p.beatAt(),1.95);p.setTempo(60);near(p.beatAt(),1.95);near(held.end,1.2+2.05);
});
test('invalid intermediate tempo input is ignored and startup lead stays in the future',()=>{
 const piano=fakePiano(),p=new BeatPlayer(piano,notes,4,{bpm:120});p.pump();
 for(const input of ['',2,0,261,NaN]){assert.equal(validTempo(input),false);p.setTempo(input);assert.equal(p.bpm,120);}
 p.setTempo(240);near(piano.voices.at(-1).when,.04);assert.ok(piano.voices[0].cancelled);
});
test('loop remains on the beat grid through tempo changes and finishes current cycle when disabled',()=>{
 const piano=fakePiano(),p=new BeatPlayer(piano,notes,4,{bpm:120,lead:0,loop:true});p.pump();
 piano.context.currentTime=1.96;p.pump();near(piano.voices.find(v=>v.when===2).when,2);
 piano.context.currentTime=2.5;p.setTempo(240);near(p.beatAt(),5);p.setLoop(false);near(p.stopBeat,8);
 piano.context.currentTime=3.25;assert.equal(p.pump(),false);p.stop();assert.ok(piano.voices.every(v=>v.cancelled));
});
test('background lag skips expired attacks instead of replaying them in a burst',()=>{
 const piano=fakePiano(),p=new BeatPlayer(piano,notes,4,{bpm:60,lead:0});piano.context.currentTime=2;p.pump();
 assert.equal(piano.voices.length,1);assert.equal(piano.voices[0].note,60);near(piano.voices[0].end,4);
});
test('gate shortens rhythmic notes while held voices keep their musical landing points',()=>{
 const bars=parseChart('| C | Am |');
 for(const pattern of Object.keys(patterns)){
 const a=performance(bars,pattern,{gate:.1,human:0,swing:0}),b=performance(bars,pattern,{gate:1,human:0,swing:0});
 assert.equal(a.length,b.length);a.forEach((n,i)=>{near(n.beat,b[i].beat);assert.equal(n.note,b[i].note);assert.ok(n.duration<=b[i].duration+1e-8,pattern);});
 if(pattern==='sustain'){assert.deepEqual(a,b);assert.ok(a.every(n=>n.duration===4));}
 else {a.forEach((n,i)=>{if(n.articulation==='held')near(n.duration,b[i].duration);});const rhythmic=a.filter(n=>n.articulation!=='held');if(rhythmic.length)assert.ok(rhythmic.reduce((s,n)=>s+n.duration,0)<b.filter(n=>n.articulation!=='held').reduce((s,n)=>s+n.duration,0)*.6,pattern);}
 }
});
test('short-note releases scale with duration instead of a fixed quarter-second tail',()=>{
 near(releaseSeconds(.125),.025);near(releaseSeconds(.5),.1);near(releaseSeconds(4),.12);
 assert.ok(releaseSeconds(.0625)<.0625/4);
});
