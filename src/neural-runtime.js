// Spotify Basic Pitch (Apache-2.0); all inference stays in the local Web Worker.
import * as tf from '@tensorflow/tfjs';
import {BasicPitch,noteFramesToTime} from '@spotify/basic-pitch';
import {setWasmPaths,setThreadsCount} from '@tensorflow/tfjs-backend-wasm';
export const frameTime=i=>noteFramesToTime([{startFrame:i,durationFrames:1,pitchMidi:60,amplitude:1}])[0].startTimeSeconds;
export async function transcribeFrames(samples,progress){
 setWasmPaths(new URL('./wasm/',import.meta.url).href);setThreadsCount(1);
 if(!await tf.setBackend('wasm'))throw Error('此瀏覽器無法啟動音訊辨識模型，請使用最新版瀏覽器或匯入 MIDI。');
 await tf.ready();progress(.03);
 const bp=new BasicPitch(new URL('./basic-pitch/model.json',import.meta.url).href);await bp.model;progress(.08);
 let input;
 tf.engine().startScope();try{[input]=await bp.prepareData(samples);tf.keep(input);}finally{tf.engine().endScope();}
 const frames=[],onsets=[],limit=Math.floor(samples.length*86/22050);
 try{
  for(let i=0;i<input.shape[0]&&frames.length<limit;i++){
   tf.engine().startScope();try{
    const [f,o]=await bp.evaluateSingleFrame(input,i),left=limit-frames.length;
    frames.push(...(await bp.unwrapOutput(f).array()).slice(0,left));onsets.push(...(await bp.unwrapOutput(o).array()).slice(0,left));
   }finally{tf.engine().endScope();}
   progress(.08+.87*(i+1)/input.shape[0]);
  }
 }finally{input.dispose();(await bp.model).dispose();}
 return {frames,onsets};
}
