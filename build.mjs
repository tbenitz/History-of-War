import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dist=path.join(root,'dist');
if(!fs.existsSync(path.join(root,'node_modules/phonon-tts/index.js'))) {
  throw new Error('phonon-tts is missing. Run npm install first.');
}
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
for(const filename of ['index.html','styles.css','app.js','book.json','voices.json']) {
  fs.copyFileSync(path.join(root,filename),path.join(dist,filename));
}
fs.copyFileSync(path.join(root,'_headers'),path.join(dist,'_headers'));
fs.mkdirSync(path.join(dist,'vendor'),{recursive:true});
// Keep worker and Wasm files together with index.js: their relative URLs must resolve locally.
const runtimeDir=path.join(dist,'vendor/phonon');
fs.cpSync(path.join(root,'node_modules/phonon-tts'),runtimeDir,{recursive:true,filter:(s)=>!/(?:\\/\\.git\\/|\\/node_modules\\/)/.test(s)});
const required=['index.js','worker.js'];
for(const name of required){
  if(!fs.existsSync(path.join(runtimeDir,name)))throw new Error('Phonon browser runtime is incomplete: vendor/phonon/'+name+' missing from dist');
}
const wasmFiles=[];
function scan(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const target=path.join(dir,entry.name);
    if(entry.isDirectory())scan(target);else if(entry.name.endsWith('.wasm'))wasmFiles.push(target);
  }
}
scan(runtimeDir);
if(!wasmFiles.length)throw new Error('Phonon WebAssembly binaries were not packaged into dist/vendor/phonon.');
fs.writeFileSync(path.join(dist,'.nojekyll'),'');
console.log('Phonon runtime validated: index.js, worker.js and '+wasmFiles.length+' Wasm binaries in dist/vendor/phonon.');
console.log('Built self-contained static site at dist/. The model and selected voices download separately on first use.');
