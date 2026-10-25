import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),root=name=>path.dirname(require.resolve(name+'/package.json'));
await mkdir('dist/vendor/basic-pitch',{recursive:true});await mkdir('dist/vendor/wasm',{recursive:true});
for(const file of ['model.json','group1-shard1of1.bin'])await copyFile(path.join(root('@spotify/basic-pitch'),'model',file),'dist/vendor/basic-pitch/'+file);
for(const file of ['tfjs-backend-wasm.wasm','tfjs-backend-wasm-simd.wasm','tfjs-backend-wasm-threaded-simd.wasm'])await copyFile(path.join(root('@tensorflow/tfjs-backend-wasm'),'dist',file),'dist/vendor/wasm/'+file);
await build({entryPoints:['src/neural-runtime.js'],outfile:'dist/vendor/neural-runtime.js',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'external'});
