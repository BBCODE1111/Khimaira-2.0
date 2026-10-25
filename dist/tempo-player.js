export const validTempo=value=>Number.isFinite(Number(value))&&Number(value)>=30&&Number(value)<=260;
export const clampTempo=(value,fallback=92)=>validTempo(value)?Number(value):fallback;

// Musical beats are the source of truth; audio seconds are derived only near playback.
export class BeatPlayer {
 constructor(piano,notes,beats,{bpm=92,loop=false,lead=.04,lookahead=.18}={}){
  this.piano=piano;this.notes=notes;this.beats=beats;this.bpm=clampTempo(bpm);
  this.anchorTime=piano.context.currentTime+lead;this.anchorBeat=0;
  this.lookahead=lookahead;this.scheduled=new Map;this.stopBeat=loop?Infinity:beats;this.stopped=false;
 }
 beatAt(time=this.piano.context.currentTime){return this.anchorBeat+(time-this.anchorTime)*this.bpm/60;}
 timeAt(beat){return this.anchorTime+(beat-this.anchorBeat)*60/this.bpm;}
 setTempo(value){
  if(!validTempo(value)||Number(value)===this.bpm||this.stopped)return;
  const now=this.piano.context.currentTime,beat=this.beatAt(now);
  // Before the first attack, retain the short startup lead instead of scheduling past events.
  this.anchorBeat=Math.max(0,beat);this.anchorTime=beat<0?this.anchorTime:now;this.bpm=Number(value);
  for(const [key,event] of this.scheduled){
   if(event.when>now){event.voice.cancel();this.scheduled.delete(key);}
   else if(event.endBeat>beat){event.voice.retime(this.timeAt(event.endBeat),event.duration*60/this.bpm);}
  }
  this.pump();
 }
 setLoop(enabled){
  const beat=Math.max(0,this.beatAt());this.stopBeat=enabled?Infinity:(Math.floor(beat/this.beats)+1)*this.beats;
  for(const [key,event] of this.scheduled)if(event.startBeat>=this.stopBeat){event.voice.cancel();this.scheduled.delete(key);}
 }
 pump(){
  if(this.stopped||!(this.beats>0))return false;
  const now=this.piano.context.currentTime,beat=this.beatAt(now);
  if(beat>=this.stopBeat)return false;
  for(const [key,event] of this.scheduled)if(event.endBeat<=beat)this.scheduled.delete(key);
  const firstCycle=Math.floor(Math.max(0,beat)/this.beats),lastCycle=Math.floor(Math.max(0,this.beatAt(now+this.lookahead))/this.beats);
  for(let cycle=firstCycle;cycle<=lastCycle;cycle++)for(let i=0;i<this.notes.length;i++){
   const n=this.notes[i],startBeat=cycle*this.beats+n.beat,endBeat=Math.min(cycle*this.beats+n.beat+n.duration,this.stopBeat),key=cycle+':'+i;
   if(startBeat>=this.stopBeat||endBeat<=Math.max(0,beat)||this.scheduled.has(key))continue;
   const when=Math.max(now,this.timeAt(startBeat));if(when>now+this.lookahead)continue;
   // If the browser was suspended, resume a held note; never replay a burst of expired attacks.
   const duration=this.timeAt(endBeat)-when;if(duration<=0)continue;
   const voice=this.piano.note(n.note,when,duration,n.velocity);
   this.scheduled.set(key,{voice,when,startBeat,endBeat,duration:n.duration});
  }
  return true;
 }
 stop({natural=false}={}){this.stopped=true;this.scheduled.clear();if(!natural)this.piano.stop();}
}
