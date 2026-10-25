import { encodeMidi, parseMidi } from './midi.js?v=2.0.0-alpha.2';
import { auditHarmony } from './harmony.js?v=2.0.0-alpha.2';

// Check the file the DAW will actually receive, including one-tick minimum durations.
export function encodeAuditedMidi(project) {
  const bytes = encodeMidi(project), decoded = parseMidi(bytes);
  const melody = decoded.tracks.find(t => t.channel === 0)?.notes || [];
  const accompaniment = decoded.tracks.find(t => t.channel === 1)?.notes || [];
  if (auditHarmony(melody, accompaniment).length) {
    throw Error('MIDI 時間取整後出現衝突，已停止匯出。請調整極短音符或換一組和弦後再試。');
  }
  return bytes;
}
