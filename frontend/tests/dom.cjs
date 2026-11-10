const {JSDOM}=require('jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only'});
const w=dom.window,doc=w.document;let role='farmer',must=false,uploaded=false,revision=false;
const errors=[];w.addEventListener('unhandledrejection',e=>errors.push(e.reason));
const prop={id:'p1',name:'Sítio',municipality:'Campinas',state:'SP',area_ha:10,latitude:-22,longitude:-47};
w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
let stopped=0;
const track={stop:()=>stopped++};
const originalPhoto=new w.Blob(['original camera bytes'],{type:'image/jpeg'});
Object.defineProperty(w.navigator,'mediaDevices',{value:{
 getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})
}});
Object.defineProperty(w.navigator,'geolocation',{value:{
 getCurrentPosition:success=>success({coords:{latitude:-23.5,longitude:-46.25}})
}});
w.ImageCapture=class { async takePhoto(){return originalPhoto;} };
w.fetch=async(path,opts={})=>{
 let data={},status=200;
 if(path==='/v1/auth/login') data={access_token:'token',refresh_token:'refresh'};
 else if(path==='/v1/me') data={id:'u1',name:'Ana <img onerror=alert(1)>',role,must_change:must};
 else if(path==='/v1/auth/password') must=false;
 else if(path==='/v1/properties') data=[prop];
 else if(path==='/v1/farmers') data=opts.method==='POST'?{username:'novo',temporary_password:'temporary'}:[{id:'u2',name:'José'}];
 else if(path==='/v1/incidents' && opts.method==='POST') {assert(opts.body instanceof w.FormData);const b=JSON.parse(opts.body.get('metadata'));assert(b.client_request_id);assert.equal(b.location_source,'gps');assert.equal(b.latitude,-23.5);
  assert.equal(b.longitude,-46.25);assert.equal(b.location_authorized,true);assert.equal(opts.body.get('photo').size,originalPhoto.size);uploaded=true;data={id:'i1'};}
 else if(path==='/v1/incidents/i1/photo') return {ok:true,blob:async()=>new w.Blob(['image'])};
 else if(path==='/v1/incidents/i1') data={id:'i1',description:'Fumaça',status:revision?'under_review':'submitted',photo_url:'/v1/incidents/i1/photo',ai:{status:'unavailable',warning:'Sem chave Gemini'},reviews:[]};
 else if(path==='/v1/incidents/i1/review') {assert.equal(JSON.parse(opts.body).status,'under_review');revision=true;}
 else if(path==='/v1/incidents/i1/notification-draft') data={text:'Minuta não enviada'};
 else if(path==='/v1/incidents?limit=20&offset=0') data=[];
 else if(path==='/v1/auth/logout') status=204;
 else if(path==='/v1/properties/p1/environment') data={weather:{source:'Open-Meteo',simulated:false,status:'unavailable',data:null,warnings:['indisponível']},hotspots:{source:'NASA FIRMS',simulated:true,status:'ok',data:[],warnings:['demo']}};
 else if(path==='/v1/reports/summary') data={farmers:1,properties:1,incidents:1,awaiting_review:1,registered_area_ha:10,by_status:{submitted:1}};
 else throw new Error('unexpected '+path);
 return {ok:true,status,json:async()=>data};
};
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('wait failed '+fn);};
const submit=id=>doc.querySelector(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
(async()=>{
 w.eval(fs.readFileSync(root+'/js/live.js','utf8'));
 doc.querySelector('#username').value='ana';doc.querySelector('#password').value='secret';submit('#login');
 await wait(()=>doc.querySelector('h1').textContent.startsWith('Olá'));
 assert(!doc.querySelector('h1 img')); // untrusted name escaped
 w.location.hash='#/foto';await wait(()=>doc.querySelector('#upload'));
 assert.equal(doc.querySelector('h1').textContent,'Novo relato');
 assert.equal(doc.querySelector('#upload input[type=file]'),null);
 submit('#upload');await wait(()=>doc.querySelector('#aviso').textContent.includes('Tire uma foto'));
 doc.querySelector('#gps').click();
 doc.querySelector('#open-camera').click();
 await wait(()=>!doc.querySelector('#camera-video').hidden);
 doc.querySelector('#camera-video').dispatchEvent(new w.Event('loadeddata'));
 doc.querySelector('#take-photo').click();
 await wait(()=>!doc.querySelector('#captured-photo').hidden);
 assert.equal(stopped,1);
 doc.querySelector('#description').value='Fumaça';submit('#upload');
 await wait(()=>doc.querySelector('h1').textContent==='Análise do registro');assert(uploaded);
 assert(doc.querySelector('#app').textContent.includes('Sem chave Gemini'));
 w.location.hash='#/ambiente';await wait(()=>doc.querySelector('#env-load'));doc.querySelector('#env-load').click();
 await wait(()=>doc.querySelector('#env-result').textContent.includes('SIMULADO'));
 doc.querySelector('#btn-sair').click();await wait(()=>doc.querySelector('#login'));
 role='cooperative';must=true;doc.querySelector('#username').value='coop';doc.querySelector('#password').value='secret';submit('#login');
 await wait(()=>doc.querySelector('#password-form'));doc.querySelector('#old_password').value='old';doc.querySelector('#new_password').value='new-password-123';doc.querySelector('#confirm').value='new-password-123';submit('#password-form');
 await wait(()=>doc.querySelector('#login'));doc.querySelector('#username').value='coop';doc.querySelector('#password').value='new-password-123';submit('#login');
 await wait(()=>doc.querySelector('h1').textContent.startsWith('Olá'));
 w.location.hash='#/produtores';await wait(()=>doc.querySelector('#farmer-form'));
 doc.querySelector('#farmer-form [name=name]').value='Novo';doc.querySelector('#farmer-form [name=username]').value='novo';submit('#farmer-form');
 await wait(()=>doc.querySelector('#credentials').textContent.includes('temporary'));
 w.location.hash='#/ocorrencia/i1';await wait(()=>doc.querySelector('#review'));doc.querySelector('#notes').value='Revisão teste';submit('#review');await wait(()=>revision && !doc.querySelector('#review-status option[value=under_review]'));
 await wait(()=>doc.querySelector('#draft'));doc.querySelector('#draft').click();await wait(()=>doc.querySelector('#draft-text').textContent.includes('Minuta'));
 assert.deepEqual(errors,[]);console.log('PASS DOM: login, XSS, upload, result, environment, logout, password, registration, review, draft');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exit(1);});
