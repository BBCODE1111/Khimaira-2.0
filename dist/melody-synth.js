export const synthPresets={
 warm:{label:'Warm lead',partials:[0,1,.3,.12,.06,.025],attack:.018,decay:.11,sustain:.76,release:.065,cutoff:2600,level:.14},
 keys:{label:'Soft keys',partials:[0,1,.26,.3,.08,.08,.03],attack:.006,decay:.22,sustain:.36,release:.075,cutoff:3400,level:.16},
 sine:{label:'Pure sine',partials:[0,1],attack:.008,decay:.04,sustain:.72,release:.045,cutoff:6000,level:.10}
};
// Harmonic, band-limited oscillator with a shaped filter/envelope; no detuned voices obscure pitch.
export function synthEnvelope(duration,preset='warm'){
 const p=synthPresets[preset]||synthPresets.warm,attack=Math.min(p.attack,duration*.15),release=Math.min(p.release,duration*.25),decay=Math.min(p.decay,Math.max(0,duration-attack-release));
 return {...p,attack,decay,release};
}
export function playMelodyTone(context,bus,voices,note,when,duration,preset='warm'){
 const p=synthEnvelope(duration,preset),osc=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
 const real=new Float32Array(p.partials.length),imag=new Float32Array(p.partials);
 osc.setPeriodicWave(context.createPeriodicWave(real,imag));osc.frequency.value=440*2**((note.pitch-69)/12);
 filter.type='lowpass';filter.Q.value=.5;filter.frequency.setValueAtTime(p.cutoff*1.4,when);filter.frequency.exponentialRampToValueAtTime(p.cutoff,when+Math.min(.15,duration));
 const level=p.level*(note.velocity??.7)**1.15,end=when+duration;
 gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+p.attack);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,level*p.sustain),when+p.attack+p.decay);gain.gain.setValueAtTime(level*p.sustain,end-p.release);gain.gain.linearRampToValueAtTime(0,end);
 osc.connect(filter).connect(gain).connect(bus);osc.start(when);osc.stop(end+.003);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();filter.disconnect();gain.disconnect();};
 return osc;
}
