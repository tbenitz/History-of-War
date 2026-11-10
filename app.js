/* The Living Archive — static reading site, original source intact.
 * Phonon runs on-device: phonon-tts is copied locally by npm run build.
 * No speech data is sent to a cloud TTS endpoint.
 */
const $ = (id) => document.getElementById(id);
const BASE = 'https://huggingface.co/gradium/phonon-voices/resolve/main/';
const STORE = 'living-archive-war-weapons-v1';
const LANG_NAMES = {'en-us':'American English','en-gb':'British English','fr-fr':'French','de-de':'German','es-es':'Spanish (Spain)','es-mx':'Spanish (Mexico)','pt-br':'Portuguese (Brazil)','characters':'English character'};
const ROMAN = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
const TIMELINE = [
  ['400,000 years ago','Schöningen spears','Schöningen'],
  ['~13,000 years ago','Jebel Sahaba','Jebel Sahaba'],
  ['1044','Chinese gunpowder','Wujing Zongyao'],
  ['1288','The hand cannon','Heilongjiang'],
  ['1415','Battle of Agincourt','Agincourt'],
  ['1453','Fall of Constantinople','Constantinople'],
  ['1545','The Mary Rose','Mary Rose'],
  ['1849','Minié bullet','Minié'],
  ['1884','The Maxim gun','Maxim'],
  ['1916','Battle of Verdun','Verdun'],
  ['1945','The nuclear age','Trinity'],
  ['1991','Precision warfare','Desert Storm'],
  ['2020','Drone warfare','Nagorno-Karabakh']
];
const IMAGE_RULES = [
  [/schöningen|schoeningen/i,'Schöningen wooden spears archaeology'],
  [/jebel sahaba/i,'Jebel Sahaba burial archaeology'],
  [/longbow|archer|archery|agincourt/i,'English medieval longbow archers'],
  [/mary rose/i,'Mary Rose ship Tudor'],
  [/flint|stone tool|hand axe|paleolithic|prehistoric/i,'Paleolithic stone tools archaeology'],
  [/jericho/i,'ancient Jericho archaeological walls'],
  [/chariot|hittite/i,'Ancient Egyptian war chariot'],
  [/phalanx|hoplite|marathon/i,'Ancient Greek hoplite armour'],
  [/roman legion|roman soldier|legionary/i,'Roman legionary armour'],
  [/scythian|mongol|steppe|horse archers/i,'Mongol horseback archery'],
  [/trebuchet|siege engine/i,'Medieval trebuchet'],
  [/medieval castle|fortification|bastion/i,'medieval castle fortress'],
  [/constantinople|ottoman/i,'Ottoman siege of Constantinople 1453'],
  [/gunpowder|wujing|fire lance/i,'Chinese early gunpowder fire lance'],
  [/hand cannon|heilongjiang/i,'medieval hand cannon'],
  [/matchlock|flintlock|musket/i,'historic flintlock musket'],
  [/min[ié]e|springfield model 1861|enfield/i,'American Civil War Enfield rifle'],
  [/american civil war|fredericksburg|gettysburg/i,'American Civil War soldiers battlefield'],
  [/maxim gun|machine gun/i,'Maxim machine gun historical photograph'],
  [/french 75|canon de 75/i,'French 75mm field gun 1897'],
  [/verdun|western front|trench warfare/i,'Battle of Verdun 1916 trenches'],
  [/first world war|world war i/i,'First World War soldiers trenches'],
  [/t-34|soviet tank|panzer|armored warfare/i,'T-34 tank second world war'],
  [/second world war|world war ii/i,'World War II historical photograph'],
  [/aircraft carrier|battleship|u-boat|submarine/i,'World War II naval ships'],
  [/trinity test|atomic bomb|plutonium|nuclear weapon/i,'Trinity test 1945'],
  [/cold war|missile|icbm/i,'Cold War missile silo'],
  [/desert storm|gulf war/i,'Operation Desert Storm 1991'],
  [/bayraktar|nagorno.karabakh|unmanned|drone/i,'Bayraktar TB2 military drone'],
  [/radar/i,'World War II radar station'],
  [/crossbow/i,'medieval crossbow museum'],
  [/bronze sword|bronze age/i,'Bronze Age sword archaeology'],
  [/sword|steel armour/i,'historical medieval swords museum'],
  [/spear/i,'prehistoric spear archaeological museum'],
];
let book, voices=[], chapters=[], currentChapter=0, units=[], activeUnit=0;
let state = {active:0,progress:{},voice:'Reuben',device:'auto',speed:1,font:16,autoImages:true};
let player = {mode:'idle',session:0,context:null,controller:null,stream:null,model:null,loading:null};
let imageCache = new Map(), activeImageQuery='', imageEpoch=0, currentImage=null, lastImageAt=-1;
let previewAudio = null, toastTimer=null;
function notify(message){ const e=$('toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3500);}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){console.warn('Saving is unavailable',e);}}
function hydrate(){try{const prior=JSON.parse(localStorage.getItem(STORE)||'{}');state={...state,...prior,progress:prior.progress&&typeof prior.progress==='object'?prior.progress:{}};}catch(e){console.warn('Could not read previous progress',e)}}
function cleanSpeech(s){return s.replace(/\*([^*]+)\*/g,'$1').replace(/\[(\d+)\]/g,'').replace(/\s+/g,' ').trim();}
function paragraphSentences(text){
  const sentences = (typeof Intl.Segmenter !== 'undefined') ? [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(x=>x.segment) : text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)||[text];
  const result=[]; let group='';
  function emit(){if(group.trim()){result.push(group);group='';}}
  for(const sentence of sentences){
    if(group.length+sentence.length > 290 && group.length>=90) emit();
    if(sentence.length>360){
      emit();let current='';
      for(const word of sentence.split(/(?<=\s)/)){
        if(current.length+word.length>260&&current.length>0){result.push(current);current='';}current+=word;
      }
      if(current)result.push(current);
    } else group+=sentence;
  }
  emit();return result;
}
function chapterUnits(chapter){
  const out=[];chapter.paragraphs.forEach((text,pi)=>{
    const speech=paragraphSentences(text);speech.forEach((segment,si)=>out.push({text:segment,para:pi,at:si,first:si===0}));
  });return out;
}
function progressFor(c){return state.progress[c.id]||{unit:0,total:0,done:false};}
function record(){
  const ch=chapters[currentChapter];if(!ch)return;
  const old=progressFor(ch);
  state.progress[ch.id]={unit:Math.min(activeUnit,units.length),total:units.length,done:old.done||activeUnit>=units.length,updated:Date.now()};
  state.active=currentChapter;save();updateProgressUI();
}
function updateProgressUI(){
  if(!book)return;
  let fraction=0,complete=0;
  for(const c of chapters){const p=progressFor(c);if(p.done){complete++;fraction+=1;}else if(p.total)fraction+=Math.min(1,p.unit/p.total);}
  const totalPct=Math.round(fraction/chapters.length*100);
  $('overallPercent').textContent=totalPct+'%';$('overallFill').style.width=totalPct+'%';$('completedCount').textContent=complete+' / '+chapters.length;
  $('journeyLabel').textContent=complete===chapters.length?'Book completed':fraction?'Keep the story going':'Ready to begin';
  $('heroContinueText').textContent=fraction?'Continue listening':'Begin listening';
  const chap=chapters[currentChapter];const p=progressFor(chap);
  $('markIcon').textContent=p.done?'✓':'○';$('markText').textContent=p.done?'Completed':'Mark finished';
  const percentage=units.length?Math.round(Math.min(1,activeUnit/units.length)*100):0;
  $('progressScrub').value=Math.round(Math.min(1,activeUnit/Math.max(1,units.length))*1000);
  $('elapsed').textContent=percentage+'%';
  const remainingWords= Math.max(0, Math.round(chap.words * (1-percentage/100)));
  $('remaining').textContent=remainingWords?'~'+Math.ceil(remainingWords/145)+' min left':'Done';
}
function renderParts(){
  const q=$('partFilter').value.trim().toLowerCase();const el=$('chapterList');el.replaceChildren();
  for(let i=0;i<chapters.length;i++){
    const c=chapters[i];if(q&&!(`part ${c.id} ${c.id} ${c.preview}`.toLowerCase().includes(q)))continue;
    const p=progressFor(c),b=document.createElement('button');b.className='part-button'+(i===currentChapter?' active':'');b.type='button';
    const num=document.createElement('span');num.className='part-num';num.textContent=String(c.id).padStart(2,'0');
    const name=document.createElement('span');name.className='part-name';name.textContent=`Part ${c.id}`;
    const status=document.createElement('span');status.className='part-status'+(p.done?' finished':'');
    status.textContent=p.done?'✓':p.unit&&p.total?Math.round(p.unit/p.total*100)+'%':'○';
    b.append(num,name,status);b.addEventListener('click',()=>{openChapter(i);$('sidebar').classList.remove('open');$('readingWrap').scrollIntoView({behavior:'smooth'});});el.appendChild(b);
  }
  if(!el.children.length){const p=document.createElement('p');p.className='loading-list';p.textContent='No matching parts. Try the manuscript search above.';el.appendChild(p)}
}
function buildReader(chapter){
  const doc=$('manuscript');doc.replaceChildren();
  const groups=new Map();for(let i=0;i<units.length;i++){const u=units[i];if(!groups.has(u.para))groups.set(u.para,[]);groups.get(u.para).push([i,u]);}
  for(const group of groups.values()){
    const p=document.createElement('p');for(const [i,u] of group){const span=document.createElement('span');span.className='segment';span.dataset.unit=i;span.textContent=u.text.replace(/\*([^*]+)\*/g,'$1');span.title='Start listening here';span.addEventListener('click',()=>seekUnit(i,true));p.appendChild(span)}doc.appendChild(p);
  }
  highlightUnit(false);
}
function highlightUnit(scroll){
  const current=$('manuscript').querySelector('.segment.current');if(current){current.classList.remove('current');current.removeAttribute('aria-current')}
  const target=$('manuscript').querySelector(`[data-unit="${activeUnit}"]`);
  if(target){target.classList.add('current');target.setAttribute('aria-current','true');if(scroll&&activeUnit%4===0)target.scrollIntoView({block:'center',behavior:'smooth'});}
}
async function openChapter(index,{keepPlayer=false,unit=null,para=null}={}){
  if(!keepPlayer)stopAudio();currentChapter=Math.max(0,Math.min(chapters.length-1,index));const chapter=chapters[currentChapter];units=chapterUnits(chapter);
  if(para!==null){const found=units.findIndex(u=>u.para===para);activeUnit=Math.max(0,found)}
  else if(unit!==null) activeUnit=Math.max(0,Math.min(units.length-1,unit));
  else activeUnit=Math.max(0,Math.min(units.length-1,progressFor(chapter).unit||0));
  $('chapterNumber').textContent='PART '+String(chapter.id).padStart(2,'0');
  $('chapterHeading').textContent='Part '+(ROMAN[chapter.id]||String(chapter.id).padStart(2,'0'));
  $('chapterSubtitle').textContent=chapter.preview.length>140?chapter.preview.slice(0,140)+'…':chapter.preview;
  $('chapterMinutes').textContent=chapter.words.toLocaleString()+' words · ~'+Math.ceil(chapter.words/145)+' min';
  $('playerChapter').textContent=`Part ${chapter.id} — The History of War & Weapons`;
  $('playerSubtitle').textContent=`Passage ${activeUnit+1} of ${units.length}`;
  buildReader(chapter);renderParts();record();updateImageForUnit(true);
}
function setUnit(i,scroll=false){activeUnit=Math.max(0,Math.min(i,units.length));highlightUnit(scroll);record();$('playerSubtitle').textContent=`Passage ${Math.min(units.length,activeUnit+1)} of ${units.length}`;if(scroll&&activeUnit>0)updateImageForUnit(false);}
function seekUnit(i,restart){const was=player.mode==='playing';stopAudio();setUnit(i,true);if(was&&restart)startAudio();else notify('Listening position saved at this passage.');}
function setAudioState(mode,detail){player.mode=mode;$('playGlyph').textContent=mode==='playing'?'Ⅱ':'▶';$('playPause').setAttribute('aria-label',mode==='playing'?'Pause':'Play');
  $('readingStatus').textContent=detail||({idle:'Select a sentence to listen from there',playing:'Narrating the highlighted passage',paused:'Paused — resume whenever you like',loading:'Loading Phonon speech engine…',error:'Narration unavailable; you can still read the text'}[mode]);
}
function stopAudio(){
  player.session++;player.controller?.abort();try{player.stream?.cancel?.()}catch{}
  player.controller=null;player.stream=null;
  const ctx=player.context;player.context=null;
  if(ctx&&ctx.state!=='closed')ctx.close().catch(()=>{});
  setAudioState('idle');
}
function setEngineState(stateName,label,detail){$('engineStatus').textContent=label;$('engineDetail').textContent=detail||'';$('engineLamp').className=stateName;}
async function ensureModel(){
  if(player.model)return player.model;
  if(player.loading)return player.loading;
  player.loading=(async()=>{
    setEngineState('','Loading Phonon…','Downloading on-device speech assets; first play needs internet and storage.');
    let m;
    try{m=await import('./vendor/phonon/index.js')}catch(e){throw new Error('The Phonon package is not bundled. Use the GitHub Pages deployment workflow, or run npm install and npm run build before hosting. '+e.message)}
    let lastReport=0;
    const loaded=await m.PhononTTS.load({lang:'en',quant:'q8',device:state.device,cache:true,
      onProgress:({file,loaded,total,cached})=>{
        const now=Date.now();if(now-lastReport<200)return;lastReport=now;
        const desc=cached?'From browser cache':total?Math.round(100*loaded/total)+'%':'Downloading…';
        setEngineState('','Loading Phonon…',`${file||'Model'} · ${desc}`);
      }});
    player.model=loaded;
    setEngineState('ready',`Ready · ${loaded.device==='webgpu'?'WebGPU':'CPU'}`,`${loaded.threads||1} thread(s) · 24 kHz on-device speech. ${loaded.deviceReason||''}`);
    return loaded;
  })();
  try{return await player.loading}catch(e){setEngineState('error','Could not load speech engine',e.message);throw e}finally{player.loading=null}
}
async function startAudio(){
  if(!book)return;
  const voice = voices.find(v=>v.name===state.voice);
  // Any official embedding can be tried with the English checkpoint; language-mismatched results are experimental.
  stopAudio();const session=player.session;setAudioState('loading');
  try{
    // Construct and unlock audio inside the user gesture, before waiting for a model download.
    player.context=new (window.AudioContext||window.webkitAudioContext)();
    await player.context.resume();
    if(session!==player.session)return;
    const model=await ensureModel();if(session!==player.session)return;
    if(voice){const available=Array.isArray(model.voices)?model.voices:Object.keys(model.voices||{});if(!available.includes(voice.name))await model.addVoice(voice.name,BASE+voice.file);}if(session!==player.session)return;
    setAudioState('playing');await narrateLoop(session,model);
  }catch(e){if(session!==player.session)return;console.error(e);setAudioState('error');notify('Speech failed: '+(e.message||String(e)));}
}
async function narrateLoop(session,model){
  while(session===player.session){
    if(activeUnit>=units.length){
      const previous=chapters[currentChapter];state.progress[previous.id]={unit:units.length,total:units.length,done:true,updated:Date.now()};save();
      if(currentChapter===chapters.length-1){setAudioState('idle','You have reached the end of the manuscript.');notify('You finished the book.');renderParts();updateProgressUI();return;}
      await openChapter(currentChapter+1,{keepPlayer:true,unit:0});if(session!==player.session)return;
    }
    const text=cleanSpeech(units[activeUnit]?.text||'');if(!text){setUnit(activeUnit+1);continue;}
    setUnit(activeUnit,true);
    const controller=new AbortController();player.controller=controller;
    const stream=model.stream(text,{voice:state.voice==='Reuben'?undefined:state.voice,signal:controller.signal});player.stream=stream;
    const ctx=player.context;if(!ctx||session!==player.session)return;
    let audioEnd=ctx.currentTime+0.05,lastDone=null,scheduled=0;
    try{
      for await(const pcm of stream){
        if(session!==player.session||controller.signal.aborted)return;
        if(!pcm?.length)continue;
        const buf=ctx.createBuffer(1,pcm.length,model.sampleRate);
        buf.copyToChannel(pcm,0);
        const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=Number(state.speed)||1;src.connect(ctx.destination);
        audioEnd=Math.max(audioEnd,ctx.currentTime+0.035);
        let endResolve;lastDone=new Promise(resolve=>endResolve=resolve);
        src.onended=endResolve;
        src.start(audioEnd);audioEnd+=buf.duration/(Number(state.speed)||1);scheduled++;
      }
      await stream.done;
      if(lastDone){await Promise.race([lastDone,new Promise(resolve=>controller.signal.addEventListener('abort',resolve,{once:true}))]);}
      if(session!==player.session||controller.signal.aborted)return;
      if(!scheduled)throw new Error('The engine returned no audio for this passage.');
      setUnit(activeUnit+1);
    }catch(e){if(session!==player.session||controller.signal.aborted)return;throw e}
    finally{if(player.stream===stream)player.stream=null;}
  }
}
async function toggleAudio(){
  if(player.mode==='playing'){
    try{await player.context?.suspend();}catch{}
    setAudioState('paused');return;
  }
  if(player.mode==='paused'){
    try{await player.context?.resume();setAudioState('playing');}catch(e){notify('Could not resume audio: '+e.message)}return;
  }
  if(player.mode==='loading')return;
  startAudio();
}
async function changeDevice(value){if(state.device===value)return;state.device=value;save();stopAudio();if(player.model){player.model.dispose();player.model=null;}setEngineState('','Not loaded yet','The model will reload with '+value+' processing next time you press Play.');notify('Processing set to '+value+'. Press Play to reload.');}
function voiceLabel(v){return v.gender==='character'?'Character':`${LANG_NAMES[v.locale]||v.locale} · ${v.gender}`;}
function renderVoices(){
  const q=$('voiceSearch').value.trim().toLocaleLowerCase(),l=$('voiceLanguage').value;
  const filtered=voices.filter(v=>(l==='all'||l===v.lang||l===v.locale)&&(!q||`${v.name} ${v.locale} ${v.gender} ${voiceLabel(v)}`.toLocaleLowerCase().includes(q)));
  const items=$('voiceResults');items.replaceChildren();
  // Checkpoint voice is included in the model, in addition to the separate catalog of 102.
  if((l==='all'||l==='en'||l==='en-us')&&(!q||'reuben default built-in english'.includes(q))){
    const b=voiceRow({name:'Reuben',gender:'male',locale:'en-us',lang:'en'},true);items.appendChild(b);
  }
  for(const v of filtered)items.appendChild(voiceRow(v,false));
  if(!items.childElementCount){const p=document.createElement('p');p.textContent='No voices match your filters.';items.appendChild(p);}
  $('voiceCount').textContent=`${voices.length} official catalog voices + Reuben (built into the checkpoint)`;
}
function voiceRow(v,builtIn){
  const item=document.createElement('div');item.className='voice-item'+(v.name===state.voice?' selected':'');
  const avatar=document.createElement('span');avatar.className='voice-avatar';avatar.textContent=v.gender==='character'?'✦':v.gender==='female'?'♀':'♂';
  const info=document.createElement('div');info.className='voice-info';const name=document.createElement('strong');name.textContent=v.name;const meta=document.createElement('small');meta.textContent=(builtIn?'Built-in · ': '')+voiceLabel(v);info.append(name,meta);
  const preview=document.createElement('button');preview.className='voice-preview';preview.type='button';preview.textContent='▶';preview.title=builtIn?'Sample the default voice by starting a short narration':'Play the official voice sample';preview.addEventListener('click',()=>previewVoice(v,builtIn));
  const select=document.createElement('button');select.className='voice-select';select.type='button';select.textContent=v.name===state.voice?'✓ Selected':'Use';select.addEventListener('click',()=>selectVoice(v.name));
  item.append(avatar,info,preview,select);return item;
}
function previewVoice(v,builtIn){
  if(previewAudio){previewAudio.pause();previewAudio=null;}
  if(builtIn){notify('Reuben is the model default. Select Reuben and play any passage to hear it.');return;}
  if(!v.sample){notify('An official preview sample is not available for this newly listed voice.');return;}
  previewAudio=new Audio(BASE+v.sample);previewAudio.play().catch(e=>notify('Sample unavailable: '+e.message));
}
function selectVoice(name){
  const voice=voices.find(v=>v.name===name);
  const hadPlaying=player.mode==='playing';state.voice=name;save();
  $('voiceNameTop').textContent=name;$('playerVoiceName').textContent=name+' ⌄';$('narratorName').textContent=name;
  renderVoices();$('voiceDialog').close();if(previewAudio){previewAudio.pause();previewAudio=null;}
  if(hadPlaying)startAudio();else notify(voice&&voice.lang!=='en'?`${name} selected. With the English checkpoint, this voice is experimental and pronunciation may be unreliable.`:'Narrator changed to '+name);
}
async function refreshCatalog(){
  $('refreshCatalog').disabled=true;
  try{
    const r=await fetch(BASE+'voices.jsonl',{cache:'no-cache'});if(!r.ok)throw Error(`Catalog returned ${r.status}`);
    const lines=(await r.text()).split(/\r?\n/).filter(Boolean);let added=0;
    const names=new Set(voices.map(v=>v.name.toLowerCase()));
    for(const line of lines){let data;try{data=JSON.parse(line)}catch{continue}
      const name=data.name||data.voice_name, id=data.voice_id||data.id||data.voiceId;
      const filename=data.filename||data.file||'voices/'+id+'.safetensors';
      if(!name||!id||names.has(name.toLowerCase()))continue;
      const lang=String(data.language||data.lang||'en').slice(0,2).toLowerCase();
      voices.push({name,id,lang,locale:data.locale||lang,gender:data.gender||'',file:filename,sample:''});names.add(name.toLowerCase());added++;
    }
    renderVoices();notify(added?`${added} new catalog voices added to this session.`:`Catalog checked. ${voices.length} voices available.`);
  }catch(e){notify('Could not refresh catalog; all 102 bundled voices are still available.');}
  finally{$('refreshCatalog').disabled=false;}
}
function findPassage(term){
  const needle=term.toLocaleLowerCase();for(let ci=0;ci<chapters.length;ci++)for(let pi=0;pi<chapters[ci].paragraphs.length;pi++)if(chapters[ci].paragraphs[pi].toLocaleLowerCase().includes(needle))return {chapter:ci,para:pi};return null;
}
function goToTerm(term){const hit=findPassage(term);if(!hit){notify('Passage not found. Try a manuscript search.');return;}openChapter(hit.chapter,{para:hit.para});$('readingWrap').scrollIntoView({behavior:'smooth'});}
function buildTimeline(){for(const [date,label,query] of TIMELINE){const b=document.createElement('button');b.className='timeline-stop';const d=document.createElement('strong');d.textContent=date;const t=document.createElement('span');t.textContent=label;b.append(d,t);b.title='Jump to the passage about '+label;b.addEventListener('click',()=>goToTerm(query));$('timeline').appendChild(b)}}
function renderSearch(){
  const q=$('globalSearch').value.trim();const el=$('searchResults');el.replaceChildren();
  if(q.length<3){const p=document.createElement('p');p.textContent='Type at least 3 characters to search all 60 parts.';el.append(p);return;}
  const n=q.toLocaleLowerCase(),hits=[];
  for(let ci=0;ci<chapters.length&&hits.length<70;ci++)for(let pi=0;pi<chapters[ci].paragraphs.length&&hits.length<70;pi++){
    const para=chapters[ci].paragraphs[pi],where=para.toLocaleLowerCase().indexOf(n);
    if(where>=0)hits.push({ci,pi,where,para});
  }
  if(!hits.length){const p=document.createElement('p');p.textContent='No matching passages found.';el.appendChild(p);return;}
  for(const hit of hits){const b=document.createElement('button');b.className='result-button';const heading=document.createElement('strong');heading.textContent='Part '+chapters[hit.ci].id;const snippet=document.createElement('span');
    const start=Math.max(0,hit.where-88),end=Math.min(hit.para.length,hit.where+q.length+130);const a=hit.para.slice(start,hit.where),term=hit.para.slice(hit.where,hit.where+q.length),z=hit.para.slice(hit.where+q.length,end);
    snippet.append(document.createTextNode((start?'…':'')+a));const mark=document.createElement('mark');mark.textContent=term;snippet.append(mark,document.createTextNode(z+(end<hit.para.length?'…':'')));b.append(heading,snippet);
    b.addEventListener('click',()=>{$('searchDialog').close();openChapter(hit.ci,{para:hit.pi});$('readingWrap').scrollIntoView({behavior:'smooth'});});el.appendChild(b);
  }
  if(hits.length===70){const p=document.createElement('p');p.textContent='Showing the first 70 results. Refine your search for more specific passages.';el.appendChild(p)}
}
function subjectForPara(ch,para){
  const a=ch.paragraphs[Math.max(0,para)]||'';
  for(const [pattern,topic] of IMAGE_RULES)if(pattern.test(a))return topic;
  for(let n=1;n<4;n++)for(const text of [ch.paragraphs[para+n],ch.paragraphs[para-n]])if(text)for(const [pattern,topic] of IMAGE_RULES)if(pattern.test(text))return topic;
  return null;
}
function setNoImage(heading,desc){
  $('pictureFrame').replaceChildren();const c=document.createElement('div');c.className='empty-illustration';const image=document.createElement('div');image.className='illustration-circle';image.textContent='✺';const s=document.createElement('span');s.textContent='THE ARCHIVE';c.append(image,s);$('pictureFrame').append(c);
  $('imageTitle').textContent=heading;$('imageDesc').textContent=desc;$('imageAttribution').textContent='Wikimedia Commons ↗';$('imageAttribution').href='https://commons.wikimedia.org';
}
function stripHtml(s){return new DOMParser().parseFromString(String(s||''),'text/html').body.textContent||'';}
function updateImageForUnit(force){
  if(!state.autoImages||document.body.classList.contains('hide-images'))return;
  const unit=units[Math.min(activeUnit,units.length-1)];if(!unit)return;
  const para=unit.para;if(!force && (para===lastImageAt||Math.abs(para-lastImageAt)<4))return;
  const topic=subjectForPara(chapters[currentChapter],para);if(!topic)return;
  if(topic===activeImageQuery&&!force)return;
  lastImageAt=para;activeImageQuery=topic;lookupCommons(topic,force);
}
async function lookupCommons(topic,force=false){
  const epoch=++imageEpoch;const cached=!force&&imageCache.get(topic);
  if(cached){showCommons(cached,topic,epoch);return;}
  $('imageTitle').textContent='Searching historical archives…';$('imageDesc').textContent='Looking for imagery related to '+topic+'.';
  try{
    const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:topic,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'920',format:'json',origin:'*'});
    const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params);
    if(!response.ok)throw Error(`Commons ${response.status}`);const data=await response.json();
    const pages=Object.values(data.query?.pages||{}).sort((a,b)=>(a.index||99)-(b.index||99));
    const matched=pages.filter(p=>p.imageinfo?.[0]?.thumburl&&p.imageinfo[0].width>=480&&p.imageinfo[0].height>=270&&/\.(?:jpg|jpeg|png|webp)$/i.test(p.title));
    if(!matched.length)throw Error('No suitable photos returned');
    const selected=matched[0];imageCache.set(topic,selected);showCommons(selected,topic,epoch);
  }catch(e){if(epoch!==imageEpoch)return;setNoImage('No matching image found','The image service could not find a suitable licensed image for this passage. The narration and reading continue normally.');console.warn('Wikimedia request',e)}
}
function showCommons(page,topic,epoch){if(epoch!==imageEpoch)return;const info=page.imageinfo[0];const img=document.createElement('img');img.src=info.thumburl;img.alt=`Historical image from Wikimedia Commons: ${page.title.slice(5)}`;img.loading='lazy';img.onerror=()=>{if(epoch===imageEpoch)setNoImage('Image could not be loaded','The Wikimedia image URL is unavailable right now.');};$('pictureFrame').replaceChildren(img);
  $('imageTitle').textContent=page.title.replace(/^File:/,'').replace(/\.[^.]+$/,'').replace(/_/g,' ');
  const meta=info.extmetadata||{},artist=stripHtml(meta.Artist?.value||meta.Credit?.value||''),license=stripHtml(meta.LicenseShortName?.value||'license details at source');
  $('imageDesc').textContent=`Topic: ${topic}. ${artist?'Credit: '+artist.slice(0,80)+'. ':''}${license}.`;
  $('imageAttribution').href=info.descriptionurl||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,'_'))}`;
  $('imageAttribution').textContent='View original image, creator and license ↗';currentImage=page;
}
function setupListeners(){
  $('heroContinue').addEventListener('click',()=>{toggleAudio();$('readingWrap').scrollIntoView({behavior:'smooth',block:'start'})});
  $('heroExplore').addEventListener('click',()=>{$('readingWrap').scrollIntoView({behavior:'smooth'})});
  $('openSearch').addEventListener('click',()=>{$('searchDialog').showModal();$('globalSearch').focus()});
  $('globalSearch').addEventListener('input',()=>renderSearch());
  $('partFilter').addEventListener('input',renderParts);
  $('playPause').addEventListener('click',toggleAudio);
  $('rewind').addEventListener('click',()=>seekUnit(Math.max(0,activeUnit-1),true));
  $('forward').addEventListener('click',()=>seekUnit(Math.min(units.length-1,activeUnit+1),true));
  $('progressScrub').addEventListener('change',e=>seekUnit(Math.min(units.length-1,Math.round(Number(e.target.value)/1000*Math.max(0,units.length-1))),true));
  $('deviceSelect').addEventListener('change',e=>changeDevice(e.target.value));
  $('speedSelect').addEventListener('change',e=>{state.speed=Number(e.target.value);save();notify('Speed set to '+state.speed+'×. Adjusting playback rate also changes pitch slightly.');});
  for(const b of ['openVoices','changeNarrator','playerVoice'])$(b).addEventListener('click',()=>{$('voiceDialog').showModal();renderVoices();});
  $('voiceSearch').addEventListener('input',renderVoices);$('voiceLanguage').addEventListener('change',renderVoices);$('refreshCatalog').addEventListener('click',refreshCatalog);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  $('smallerText').addEventListener('click',()=>{state.font=Math.max(13,(state.font||16)-1);document.documentElement.style.setProperty('--body-size',state.font+'px');save();});
  $('largerText').addEventListener('click',()=>{state.font=Math.min(23,(state.font||16)+1);document.documentElement.style.setProperty('--body-size',state.font+'px');save();});
  $('textOnly').addEventListener('click',()=>{document.body.classList.toggle('hide-images');notify(document.body.classList.contains('hide-images')?'Image panel hidden':'Image panel shown');updateImageForUnit(true)});
  $('autoImages').addEventListener('change',e=>{state.autoImages=e.target.checked;save();if(e.target.checked)updateImageForUnit(true)});
  $('refreshImage').addEventListener('click',()=>{const unit=units[Math.min(activeUnit,units.length-1)];if(!unit)return;const topic=subjectForPara(chapters[currentChapter],unit.para);if(topic)lookupCommons(topic,true);else notify('This passage does not have a specific image keyword.');});
  $('markCompleted').addEventListener('click',()=>{const c=chapters[currentChapter],p=progressFor(c);state.progress[c.id]={...p,total:units.length,unit:p.done?activeUnit:units.length,done:!p.done,updated:Date.now()};save();renderParts();updateProgressUI();notify(progressFor(c).done?'Part marked as complete.':'Completion mark removed.');});
  $('prevPart').addEventListener('click',()=>{openChapter(Math.max(0,currentChapter-1));$('readingWrap').scrollIntoView({behavior:'smooth'})});
  $('nextPart').addEventListener('click',()=>{openChapter(Math.min(chapters.length-1,currentChapter+1));$('readingWrap').scrollIntoView({behavior:'smooth'})});
  $('menuToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('sidebar').classList.remove('open')}if(e.code==='Space'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'&&!e.target.closest('dialog')&&!e.target.closest('button')){e.preventDefault();toggleAudio()}});
  window.addEventListener('pagehide',save);
}
async function main(){
  hydrate();setupListeners();buildTimeline();
  $('deviceSelect').value=['auto','cpu','webgpu'].includes(state.device)?state.device:'auto';
  $('speedSelect').value=String(state.speed||1);document.documentElement.style.setProperty('--body-size',(state.font||16)+'px');
  $('autoImages').checked=state.autoImages!==false;
  try{
    const [br,vr]=await Promise.all([fetch('./book.json'),fetch('./voices.json')]);
    if(!br.ok||!vr.ok)throw Error('Manuscript or voice catalog was not found. Host the entire directory through GitHub Pages, not just index.html.');
    [book,{voices}]=await Promise.all([br.json(),vr.json()]);chapters=book.chapters;
    if(chapters.length!==60||voices.length!==102)console.warn('Unexpected content counts',chapters.length,voices.length);
    $('topStats').textContent=`${chapters.length} parts · ${Math.round(chapters.reduce((n,c)=>n+c.words,0)/1000)}k words`;
    $('voiceNameTop').textContent=state.voice;$('playerVoiceName').textContent=state.voice+' ⌄';$('narratorName').textContent=state.voice;
    renderVoices();await openChapter(Math.max(0,Math.min(chapters.length-1,Number(state.active)||0)));
  }catch(e){console.error(e);$('manuscript').textContent='Could not load the site: '+e.message;setEngineState('error','Site files missing',e.message);notify(e.message);}
}
main();
