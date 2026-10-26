import {transcribeFrames,frameTime} from './vendor/neural-runtime.js?v=2.0.0-alpha.9';
import {decodeMelody,transcriptionResult} from './transcription.js?v=2.0.0-alpha.9';
self.onmessage=async({data})=>{
 try{const {frames,onsets}=await transcribeFrames(data.samples,p=>self.postMessage({progress:p}));const notes=decodeMelody(frames,onsets,{frameTime});const result=transcriptionResult(notes,data.samples.length/22050,data.name);self.postMessage({result});}
 catch(error){self.postMessage({error:'音訊辨識未完成：'+error.message+' 可重新分析或改用旋律 MIDI。'});}
};
