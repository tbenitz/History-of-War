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
fs.cpSync(path.join(root,'node_modules/phonon-tts'),path.join(dist,'vendor/phonon'),{recursive:true,filter:(s)=>!/(?:\/\.git\/|\/node_modules\/)/.test(s)});
console.log('Built self-contained static site at dist/. The model and selected voices download separately on first use.');
