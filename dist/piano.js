const sampleNotes=Array.from({length:17},(_,i)=>36+i*3);
const sampleName=n=>['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'][n%12]+(Math.floor(n/12)-1);
export const releaseSeconds=duration=>Math.min(.12,Math.max(.004,duration*.2));
// Compensate only the measured sample lead-in, never musical performance timing.
export function sampleAttackOffset(buffer){
 const data=buffer?.getChannelData?.(0);if(!data?.length)return 0;
 const limit=Math.min(data.length,Math.ceil(buffer.sampleRate*.08));let peak=0;
 for(let i=0;i<limit;i++)peak=Math.max(peak,Math.abs(data[i]));
 if(peak<1e-6)return 0;
 for(let i=0;i<limit;i++)if(Math.abs(data[i])>=peak*.02)return Math.max(0,(i-4)/buffer.sampleRate);
 return 0;
}
export class Piano {
 constructor(context){this.context=context||new (window.AudioContext||window.webkitAudioContext)();this.buffers=new Map;this.attackOffsets=new Map;this.active=new Set;this.master=this.context.createGain();this.master.gain.value=.68;const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=3;this.mixInput=compressor;this.master.connect(compressor).connect(this.context.destination);this.ready=null;}
 async load(){await this.context.resume();if(!this.ready)this.ready=Promise.all(sampleNotes.map(async note=>{const r=await fetch(new URL('./audio/'+sampleName(note)+'.mp3',import.meta.url));if(!r.ok)throw Error('Piano sample unavailable');const buffer=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(note,buffer);this.attackOffsets.set(note,sampleAttackOffset(buffer));})).catch(e=>{this.ready=null;throw e;});return this.ready;}
 note(note,when,duration,velocity,{strict=false,release:tail,alignAttack=false}={}){
  const ctx=this.context,key=sampleNotes.reduce((a,b)=>Math.abs(b-note)<Math.abs(a-note)?b:a);
  const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
  source.buffer=this.buffers.get(key);source.playbackRate.value=2**((note-key)/12);
  filter.type='lowpass';filter.frequency.value=2800+velocity*8500;
  const amp=.5*velocity**1.5,attack=Math.min(.004,duration*.2);
  const voice={note,when,end:when+duration,ended:false,releaseEnd:when+duration+releaseSeconds(duration)};
  const release=(end,seconds)=>{
   voice.end=end;voice.releaseEnd=strict?end:end+releaseSeconds(seconds);
   if(strict){const release=tail===undefined?Math.min(.05,seconds*.2):Math.min(seconds*.5,Math.max(.008,tail));gain.gain.setValueAtTime(amp,Math.max(when+attack,end-release));gain.gain.linearRampToValueAtTime(0,end);}
   else{gain.gain.setValueAtTime(amp,end);gain.gain.exponentialRampToValueAtTime(.0001,voice.releaseEnd);}
   source.stop(voice.releaseEnd+.005);
  };
  voice.retime=(end,seconds)=>{
   const now=ctx.currentTime;if(voice.ended||end<=now)return;
   // A held sample keeps playing at the same pitch; move only its note-off and damper release.
   gain.gain.cancelScheduledValues(now);
   gain.gain.setValueAtTime(amp*Math.min(1,Math.max(0,(now-when)/attack)),now);
   if(now<when+attack)gain.gain.linearRampToValueAtTime(amp,when+attack);
   release(Math.max(end,when+attack),seconds);
  };
  voice.cancel=()=>{if(voice.ended)return;try{source.stop();}catch{}this.active.delete(voice);};
  voice.damp=(time)=>{
   if(voice.ended)return;if(when>time){voice.cancel();return;}
   gain.gain.cancelScheduledValues(time);
   const current=time<voice.end?amp:amp*(.0001/amp)**Math.min(1,(time-voice.end)/Math.max(.001,voice.releaseEnd-voice.end));
   gain.gain.setValueAtTime(current,time);gain.gain.linearRampToValueAtTime(0,time+.008);source.stop(time+.01);
  };
  // A repeated pitch damps the preceding string instead of stacking fixed release tails.
  for(const old of this.active)if(old.note===note&&old.when<when&&old.releaseEnd>when)old.damp(when);
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(amp,when+attack);
  source.connect(filter).connect(gain).connect(this.master);source.start(when,alignAttack?(this.attackOffsets.get(key)??sampleAttackOffset(source.buffer)):0);release(when+duration,duration);
  this.active.add(voice);source.onended=()=>{voice.ended=true;this.active.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();};
  return voice;
 }
 stop(){const now=this.context.currentTime;this.active.forEach(v=>v.damp(now));this.active.clear();}
}
