import { beatToSeconds, secondsToBeat } from './midi.js';

export class MelodyPlayer {
  constructor() { this.context = null; this.voices = new Set(); this.timer = null; this.bufferSource = null; this.playing = false; this.generation = 0; }
  async unlock() {
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    await this.context.resume(); return this.context;
  }
  playTone(event, when, duration, melody) {
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = melody ? 'sine' : 'triangle'; oscillator.frequency.value = 440 * 2 ** ((event.pitch - 69) / 12);
    const level = (event.velocity ?? .7) * (melody ? this.melodyGain : this.harmonyGain) * (melody ? .18 : .075);
    const end = when + duration, attack = Math.min(.008, duration * .2), release = Math.min(.045, duration * .25);
    // Release ends AT note-off, so a tail cannot collide with the next melody note.
    gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(level, when + attack);
    gain.gain.setValueAtTime(level * .72, Math.max(when + attack, end - release)); gain.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(gain).connect(ctx.destination); oscillator.start(when); oscillator.stop(end);
    this.voices.add(oscillator); oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  async play({ melody, accompaniment, tempoMap, totalBeats, sourceBuffer = null, offset = 0, mode = 'notes', melodyGain = .8, harmonyGain = .65, onTick = () => {}, onStop = () => {} }) {
    this.stop(); const generation = this.generation; await this.unlock();
    if (generation !== this.generation) return false;
    this.melodyGain = melodyGain; this.harmonyGain = harmonyGain;
    this.origin = this.context.currentTime + .06;
    this.tempoMap = tempoMap; this.totalBeats = totalBeats; this.onStop = onStop;
    this.events = [...(mode === 'notes' ? melody.map(n => ({ ...n, melody: true })) : []), ...accompaniment.map(n => ({ ...n, melody: false }))]
      .map(n => ({ ...n, seconds: beatToSeconds(n.start, tempoMap), endSeconds: beatToSeconds(n.end, tempoMap) })).sort((a, b) => a.seconds - b.seconds);
    this.index = 0; this.playing = true;
    if (mode === 'original' && sourceBuffer) {
      this.bufferSource = this.context.createBufferSource(); const gain = this.context.createGain();
      gain.gain.value = melodyGain; this.bufferSource.buffer = sourceBuffer;
      this.bufferSource.connect(gain).connect(this.context.destination);
      this.bufferSource.start(this.origin, offset);
      this.bufferSource.onended = () => gain.disconnect();
    }
    const pump = () => {
      if (!this.playing) return;
      const now = this.context.currentTime;
      while (this.index < this.events.length && this.origin + this.events[this.index].seconds < now + .16) {
        const n = this.events[this.index++], when = Math.max(now, this.origin + n.seconds), end = this.origin + n.endSeconds;
        if (end > when + .002) this.playTone(n, when, end - when, n.melody);
      }
      const beat = secondsToBeat(Math.max(0, now - this.origin), tempoMap);
      onTick(beat);
      if (beat >= totalBeats) this.stop();
    };
    this.timer = setInterval(pump, 25); pump(); return true;
  }
  stop() {
    this.generation++;
    clearInterval(this.timer); this.timer = null;
    for (const source of this.voices) { try { source.stop(); } catch {} }
    this.voices.clear();
    if (this.bufferSource) { try { this.bufferSource.stop(); } catch {} this.bufferSource = null; }
    const wasPlaying = this.playing; this.playing = false;
    if (wasPlaying) this.onStop?.();
  }
}
