import { encodeMidi, parseMidi } from './midi.js?v=2.0.0-alpha.9';
import { auditHarmony } from './harmony.js?v=2.0.0-alpha.9';

export function encodeAuditedMidi(project) {
 const reference=project.melody||[],policy=project.policy||'strict';
 const harmony=project.accompaniment.map(n=>({...n,start:Math.ceil(n.start*960-1e-8)/960,end:Math.floor(n.end*960+1e-8)/960}));
 if(harmony.some(n=>n.end<=n.start))throw Error('Accompaniment note is shorter than one MIDI tick.');
 // Context survives decoding only for a matching exported pitch and start tick.
 const contexts=new Map(harmony.map(n=>[n.pitch+':'+Math.round(n.start*960),n.chord]));
 const context=notes=>notes.map(n=>({...n,chord:contexts.get(n.pitch+':'+Math.round(n.start*960))}));
 const bytes=encodeMidi({...project,accompaniment:harmony}),decoded=parseMidi(bytes);
 const actual=context(decoded.tracks.filter(t=>t.channel===1||t.channel===2).flatMap(t=>t.notes));
 const melody=project.includeMelody===false?reference:decoded.tracks.find(t=>t.channel===0)?.notes||[];
 if(auditHarmony(melody,actual,{policy}).length||auditHarmony(reference,actual,{policy}).length)throw Error('MIDI timing or harmony check failed. Adjust the notes before exporting.');
 return bytes;
}
