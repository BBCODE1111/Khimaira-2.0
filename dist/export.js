import { encodeMidi, parseMidi } from './midi.js?v=2.0.0-alpha.5';
import { auditHarmony } from './harmony.js?v=2.0.0-alpha.5';

// Check the file the DAW will actually receive, including one-tick minimum durations.
export function encodeAuditedMidi(project) {
  const bytes = encodeMidi({...project,includeMelody:true}), decoded = parseMidi(bytes);
  const melody = decoded.tracks.find(t => t.channel === 0)?.notes || [];
  const accompaniment = decoded.tracks.find(t => t.channel === 1)?.notes || [];
  if (auditHarmony(melody, accompaniment,{policy:project.policy||'strict'}).length) {
    throw Error('MIDI 時間取整後出現衝突，已停止匯出。請調整極短音符或換一組和弦後再試。');
  }
  if(project.includeMelody!==false)return bytes;
  // The reference is no longer in the file: keep exported events INSIDE their
  // original audible bounds so rounding cannot encroach on the untouched source.
  const harmony=project.accompaniment.map(n=>({...n,start:Math.ceil(n.start*960-1e-8)/960,end:Math.floor(n.end*960+1e-8)/960}));
  if(harmony.some(n=>n.end<=n.start))throw Error('伴奏含不足一個 MIDI tick 的音符，請調整極短音符後再匯出。');
  const only=encodeMidi({...project,melody:[],accompaniment:harmony,includeMelody:false});
  const actual=parseMidi(only).tracks.find(t=>t.channel===1)?.notes||[];
  if(auditHarmony(project.melody||[],actual,{policy:project.policy||'strict'}).length)throw Error('伴奏 MIDI 與參考旋律檢查未通過，已停止匯出。');
  return only;
}
