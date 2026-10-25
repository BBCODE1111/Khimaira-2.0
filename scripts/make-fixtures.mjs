import fs from 'node:fs';
import { demoMelody } from '../dist/harmony.js';
import { encodeMidi } from '../dist/midi.js';
const folder = new URL('../dist/examples/', import.meta.url); fs.mkdirSync(folder, { recursive: true });
const melody = demoMelody(), bpm = 108, sr = 22050, seconds = 32 * 60 / bpm;
fs.writeFileSync(new URL('melody-108.mid', folder), encodeMidi({ melody, tempoMap: [{ beat: 0, bpm }] }));
const pcm = new Float32Array(Math.ceil(seconds * sr));
for (const n of melody) {
  const start = n.start * 60 / bpm, duration = (n.end - n.start) * 60 / bpm, frequency = 440 * 2 ** ((n.pitch - 69) / 12);
  for (let i = Math.floor(start * sr); i < Math.min(pcm.length, (start + duration) * sr); i++) {
    const t = i / sr - start, envelope = Math.min(1, t / .008, (duration - t) / .02);
    pcm[i] += .28 * envelope * (Math.sin(2 * Math.PI * frequency * t) + .25 * Math.sin(4 * Math.PI * frequency * t) + .08 * Math.sin(6 * Math.PI * frequency * t));
  }
}
const wav = Buffer.alloc(44 + pcm.length * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
pcm.forEach((sample, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 2));
fs.writeFileSync(new URL('melody-108.wav', folder), wav);
console.log('Wrote original 108 BPM MIDI and harmonic-rich mono WAV fixtures.');
