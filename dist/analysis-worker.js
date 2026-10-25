import { analyzePCM } from './analysis.js?v=2.0.0-alpha.2';
self.onmessage = ({ data }) => {
  try {
    const result = analyzePCM(data.samples, data.sampleRate, progress => self.postMessage({ progress }));
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error.message }); }
};
