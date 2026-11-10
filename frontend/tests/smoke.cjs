const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROMIUM_PATH,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']
 });const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
 let sent=false,uploaded=false,revision=false;
 await page.route('**/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  let data={};
  if(path==='/v1/auth/login') {data={access_token:'a',refresh_token:'r'};sent=true;}
  else if(path==='/v1/me') data={id:'farmer',name:'Ana <script>',role:'farmer',must_change:false};
  else if(path==='/v1/properties') data=[{id:'p1',name:'Sítio Boa Esperança',municipality:'Campinas',state:'SP',latitude:-22,longitude:-47,area_ha:10}];
  else if(path==='/v1/incidents' && req.method()==='POST') {assert.match(req.postData(),/client_request_id/);assert.match(req.postData(),/Content-Type: image\/(jpeg|png)/);uploaded=true;data={id:'i1'};}
  else if(path==='/v1/incidents/i1/photo') return route.fulfill({contentType:'image/png',body:photo});
  else if(path==='/v1/incidents/i1') data={id:'i1',description:'Possível fumaça',created_at:'2026-11-06T12:00:00Z',status:'submitted',photo_url:'/v1/incidents/i1/photo',ai:{status:'unavailable',classification:'inconclusive',warning:'GEMINI_API_KEY não configurada.'},reviews:[]};
  else if(path==='/v1/incidents') data=[];
  else if(path==='/v1/auth/logout') return route.fulfill({status:204});
  else if(path==='/v1/properties/p1/environment') data={weather:{source:'Open-Meteo',simulated:false,status:'unavailable',data:null,warnings:['Indisponível']},hotspots:{source:'NASA FIRMS',simulated:true,status:'ok',data:[],warnings:['Demonstração']}};
  else throw new Error('Unexpected request '+path);
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://localhost:8088');
 await page.locator('#username').fill('ana');await page.locator('#password').fill('initial-pass');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('heading',{name:'Olá, Ana <script>'}).waitFor();assert(sent);
 await page.goto('http://localhost:8088/#/foto');
 await page.getByRole('heading',{name:'Novo relato'}).waitFor();
 assert.equal(await page.locator('input[type=file]').count(),0);
 await page.getByRole('button',{name:'Abrir câmera'}).click();
 await page.getByRole('button',{name:'Tirar foto',exact:true}).click();
 await page.locator('#captured-photo').waitFor({state:'visible'});
 await page.locator('#description').fill('Possível fumaça');
 await page.getByRole('button',{name:'Enviar relato'}).click();
 await page.getByRole('heading',{name:'Análise do registro',exact:true}).waitFor();assert(uploaded);
 await page.getByText('GEMINI_API_KEY não configurada.',{exact:true}).waitFor();
 await page.goto('http://localhost:8088/#/ambiente');await page.getByRole('button',{name:'Consultar fontes'}).click();await page.getByText('SIMULADO',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:'/tmp/terra-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Sair',exact:true}).click();await page.locator('#username').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS browser: login, XSS escape, upload multipart, result, source labels, mobile width, logout');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
