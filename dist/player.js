import {playMelodyTone} from './melody-synth.js?v=2.0.0-alpha.9';
import {beatToSeconds,secondsToBeat} from './midi.js?v=2.0.0-alpha.9';
import {Piano} from './piano.js?v=2.0.0-alpha.9';
export class MelodyPlayer {
 constructor(){this.context=null;this.playing=false;this.generation=0;this.voices=new Set();this.sources=new Set();this.timer=null;}
 async unlock(){this.context ||=new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();this.piano ||=new Piano(this.context);await this.piano.load();this.melodyBus ||=this.context.createGain();if(!this.connected){this.melodyBus.connect(this.piano.mixInput||this.context.destination);this.connected=true;}return this.context;}
 setMix(melody=.35,harmony=1){if(this.melodyBus)this.melodyBus.gain.setTargetAtTime(melody,this.context.currentTime,.015);if(this.piano)this.piano.master.gain.setTargetAtTime(.68*harmony,this.context.currentTime,.015);}
 setLoop(enabled){this.loop=enabled;if(enabled)this.stopCycle=Infinity;if(!enabled){const now=this.context.currentTime;this.stopCycle=Math.floor(Math.max(0,now-this.origin)/this.cycleSeconds)+1;for(const source of this.sources)if(source.startTime>=this.origin+this.stopCycle*this.cycleSeconds){try{source.stop();}catch{}}}}
 tone(note,when,duration){return playMelodyTone(this.context,this.melodyBus,this.voices,note,when,duration,this.instrument);}
 async play({melody,accompaniment,tempoMap,totalBeats,sourceBuffer=null,offset=0,mode='notes',instrument='warm',melodyGain=.35,harmonyGain=1,startBeat=0,loop=false,countIn=false,metronome=false,meter={numerator:4,denominator:4},onTick=()=>{},onStop=()=>{}}){
  this.stop();const generation=this.generation;await this.unlock();if(generation!==this.generation)return false;
  this.instrument=instrument;this.setMix(melodyGain,harmonyGain);this.onStop=onStop;this.origin=this.context.currentTime+.06;this.loop=loop;this.stopCycle=loop?Infinity:1;
  const pulse=meter.denominator===8?1.5:1,barBeats=meter.numerator*4/meter.denominator,beatSeconds=60/tempoMap[0].bpm;
  const click=(when,strong)=>{const o=this.context.createOscillator(),g=this.context.createGain();o.frequency.value=strong?1200:850;g.gain.setValueAtTime(.12,when);g.gain.exponentialRampToValueAtTime(.001,when+.045);o.connect(g).connect(this.context.destination);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(when);o.stop(when+.05);};
  if(countIn){for(let beat=0;beat<barBeats;beat+=pulse)click(this.origin+beat*beatSeconds,beat===0);this.origin+=barBeats*beatSeconds;}
  const startSeconds=beatToSeconds(startBeat,tempoMap),endSeconds=beatToSeconds(totalBeats,tempoMap);this.cycleSeconds=endSeconds-startSeconds;if(!(this.cycleSeconds>0))return false;
  const events=[...(mode==='notes'?melody.map(n=>({...n,melody:true})):[]),...accompaniment.map(n=>({...n,melody:false}))].flatMap(n=>{const start=Math.max(n.start,startBeat),end=Math.min(n.end,totalBeats);return end>start?[{...n,seconds:beatToSeconds(start,tempoMap)-startSeconds,endSeconds:beatToSeconds(end,tempoMap)-startSeconds,releaseSeconds:n.gateEnd===undefined?undefined:Math.max(0,beatToSeconds(end,tempoMap)-beatToSeconds(Math.max(start,Math.min(n.gateEnd,end)),tempoMap))}]:[];}).sort((a,b)=>a.seconds-b.seconds);
  const scheduled=new Map(),audioCycles=new Set(),clicks=new Set();this.playing=true;
  // Normalize only downward: loud original files should not bury the piano.
  let sourceGain=1;if(sourceBuffer){const data=sourceBuffer.getChannelData(0);let sum=0,count=0;for(let i=0;i<data.length;i+=32){sum+=data[i]*data[i];count++;}sourceGain=Math.min(1,.055/Math.max(.001,Math.sqrt(sum/Math.max(1,count))));}
  const pump=()=>{
   if(!this.playing)return;const now=this.context.currentTime,elapsed=Math.max(0,now-this.origin),cycle=Math.floor(elapsed/this.cycleSeconds);
   if(cycle>=this.stopCycle){this.stop();return;}
   const last=this.loop?Math.floor(Math.max(0,now+.16-this.origin)/this.cycleSeconds):cycle;
   for(const[key,end]of scheduled)if(end<now)scheduled.delete(key);
   for(let c=cycle;c<=last&&c<this.stopCycle;c++){
    const origin=this.origin+c*this.cycleSeconds;
    if(metronome)for(let beat=Math.ceil(startBeat/pulse)*pulse;beat<totalBeats;beat+=pulse){const when=origin+beatToSeconds(beat,tempoMap)-startSeconds,key=c+':'+beat;if(when>=now&&when<now+.16&&!clicks.has(key)){clicks.add(key);click(when,Math.abs(beat%barBeats)<1e-7);}}
    if(mode==='original'&&sourceBuffer&&!audioCycles.has(c)){
     audioCycles.add(c);const delay=Math.max(0,now-origin),bufferOffset=offset+startSeconds+delay;
     if(bufferOffset<sourceBuffer.duration){const s=this.context.createBufferSource(),g=this.context.createGain();s.buffer=sourceBuffer;g.gain.value=sourceGain;s.connect(g).connect(this.melodyBus);s.startTime=origin;this.sources.add(s);s.start(Math.max(now,origin),bufferOffset,Math.min(sourceBuffer.duration-bufferOffset,this.cycleSeconds-delay));s.onended=()=>{this.sources.delete(s);s.disconnect();g.disconnect();};}
    }
    for(let i=0;i<events.length;i++){const n=events[i],key=c+':'+i,when=Math.max(now,origin+n.seconds),end=origin+n.endSeconds;if(end<=now||origin+n.seconds>now+.16||scheduled.has(key))continue;scheduled.set(key,end);if(end-when<.002)continue;if(n.melody)this.tone(n,when,end-when);else this.piano.note(n.pitch,when,end-when,n.velocity,{strict:true,alignAttack:true,...(n.releaseSeconds===undefined?{}:{release:n.releaseSeconds})});}
   }
   const beat=secondsToBeat(startSeconds+elapsed%this.cycleSeconds,tempoMap);onTick(countIn&&now<this.origin?-(this.origin-now)/beatSeconds:beat);
  };
  this.pump=pump;this.timer=setInterval(pump,25);pump();return true;
 }
 stop(){this.generation++;clearInterval(this.timer);this.timer=null;for(const s of [...this.voices,...this.sources])try{s.stop();}catch{}this.voices.clear();this.sources.clear();this.piano?.stop();const was=this.playing;this.playing=false;if(was)this.onStop?.();}
}
