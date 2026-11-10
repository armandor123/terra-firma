/* Interface integrada. O protótipo original está em demo.html. */
'use strict';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = v => v ? new Date(v).toLocaleString('pt-BR') : 'Não informado';
const statusNames = {submitted:'Enviada',under_review:'Em análise humana',verified:'Verificada',rejected:'Rejeitada',escalated:'Escalada internamente'};
const aiNames = {pending:'Na fila',processing:'Processando',completed:'Concluída',failed:'Falha',unavailable:'Indisponível',simulated:'Simulada'};
const classes = {possible_fire:'Possível fogo',possible_smoke:'Possível fumaça',possible_burned_area:'Possível área queimada',no_visible_signs:'Sem indícios visuais claros',inconclusive:'Inconclusiva'};
let tokens = null;
try { tokens = JSON.parse(sessionStorage.getItem('tf.session')); } catch { /* invalid session */ }
const locationNames = {
    photo_exif:'GPS da foto',
    gps:'GPS do aparelho',
    manual:'Coordenadas informadas',
    property_reference_not_photo_location:'Referência da propriedade'
};
let closeCamera = null;
let me = null, properties = [], page = 0, poll = null, photoURL = null, generation = 0, refreshPromise = null;
function saveTokens(t) { tokens=t; if(t) sessionStorage.setItem('tf.session',JSON.stringify(t)); else sessionStorage.removeItem('tf.session'); }
async function request(path, options={}, retry=true) {
    const headers = {...options.headers};
    if(tokens) headers.Authorization = `Bearer ${tokens.access_token}`;
    if(options.body && !(options.body instanceof FormData)) headers['Content-Type']='application/json';
    let r;
    try { r=await fetch(path,{...options,headers}); }
    catch { throw new Error('Sem conexão com o servidor. Confira a rede e tente novamente.'); }
    if(r.status===401 && tokens && retry && !path.startsWith('/v1/auth/')) {
        if(!refreshPromise) refreshPromise=(async()=>{
            try {
                const x=await fetch('/v1/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:tokens.refresh_token})});
                if(!x.ok) throw new Error('Sessão expirada. Entre novamente.');
                saveTokens(await x.json());
            } catch(e) { saveTokens(null); me=null; throw e; }
        })().finally(()=>{refreshPromise=null;});
        await refreshPromise;
        return request(path,options,false);
    }
    if(!r.ok) {
        const data=await r.json().catch(()=>({}));
        throw new Error(typeof data.detail==='string' ? data.detail : `Não foi possível concluir (${r.status}). Confira os campos.`);
    }
    if(options.blob) return r.blob();
    return r.status===204 ? null : r.json();
}
const post=(path,body)=>request(path,{method:'POST',body:JSON.stringify(body)});
function notice(text) { $('#aviso').textContent=text; $('#aviso').hidden=false; }
function go(path) { if(location.hash===`#/${path}`) route(); else location.hash=`#/${path}`; }
function view(title, html, narrow=false) {
    $('#app').innerHTML=`<section class="tela ${narrow?'estreita':''}"><h1>${esc(title)}</h1>${html}</section>`;
    document.title=`${title} · Terra Firma`;
}
function field(name,label,type='text',extra='',id=name) { return `<label for="${id}">${label}</label><input id="${id}" name="${name}" type="${type}" ${extra}>`; }
function formAction(id,fn) {
    $(id).onsubmit=async e=>{
        e.preventDefault(); const button=e.target.querySelector('button[type=submit]');
        if(button.disabled) return; button.disabled=true; $('#aviso').hidden=true;
        try { await fn(new FormData(e.target)); } catch(err) { notice(err.message); }
        finally { button.disabled=false; }
    };
}
const submit=label=>`<button type="submit" class="btn btn-primario">${label}</button>`;
const options=items=>items.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.municipality)}</option>`).join('');
function header() {
    $('#sessao').hidden=!me; $('#sessao-nome').textContent=me?.name||'';
    $('#sessao-papel').textContent=me?.role==='cooperative'?'Cooperativa':'Produtor(a)';
    const links=[['inicio','Início'],['ocorrencias','Ocorrências'],['ambiente','Ambiente']];
    if(me?.role==='farmer') links.push(['foto','Registrar foto']);
    if(me?.role==='cooperative') links.push(['produtores','Produtores'],['relatorios','Relatórios']);
    links.push(['sos','SOS']);
    $('#nav').hidden=!me || me.must_change;
    $('#nav').innerHTML=links.map(([p,t])=>`<a href="#/${p}">${t}</a>`).join('');
}
$('#btn-sair').onclick=async()=>{ try { await post('/v1/auth/logout',{}); } catch(e) { notice(e.message); } saveTokens(null); me=null; go('login'); };
async function route() {
    const current=++generation;
    clearTimeout(poll);
    closeCamera?.();
    closeCamera = null;
    if(photoURL) { URL.revokeObjectURL(photoURL); photoURL=null; }
    const [name='',id='']=location.hash.replace(/^#\/?/,'').split('/');
    try {
        if(name==='sos') { header(); return view('Emergência',`<div class="cartao"><h2>Em perigo, ligue 193</h2><p>Afaste-se do fogo. O aplicativo não aciona equipes nem envia pedidos de socorro.</p><a class="btn btn-primario" href="tel:193">Ligar para os Bombeiros</a><p><a href="#/inicio">Voltar</a></p></div>`); }
        if(tokens && !me) me=await request('/v1/me');
        if(current!==generation) return;
        header();
        if(!me) return login();
        if(me.must_change) return password();
        properties=await request('/v1/properties');
        if(current!==generation) return;
        if(name==='foto' && me.role==='farmer') return upload();
        if(name==='produtores' && me.role==='cooperative') return await producers();
        if(name==='relatorios' && me.role==='cooperative') return await reports();
        if(name==='ambiente') return await environment();
        if(name==='ocorrencia' && id) return await detail(id,current);
        if(name==='ocorrencias') return await incidents(current);
        return home();
    } catch(e) { if(current!==generation) return; if(!tokens) { me=null; header(); login(); } else view('Não foi possível carregar','<p>Tente novamente.</p><button class="btn" id="reload">Atualizar</button>'); if($('#reload')) $('#reload').onclick=route; notice(e.message); }
}
function login() {
    view('Terra Firma',`<p class="sub">Monitoramento e relato de incêndios para produtores e cooperativas.</p><form id="login" class="cartao">
      ${field('username','Usuário','text','required autocomplete="username"')}${field('password','Senha','password','required autocomplete="current-password"')}${submit('Entrar')}</form>
      <p><a href="#/sos">Emergência: ligue 193</a></p><p class="nota">Use a conta criada pela cooperativa. <a href="demo.html">Abrir protótipo com dados fictícios</a></p>`,true);
    formAction('#login',async f=>{saveTokens(await post('/v1/auth/login',Object.fromEntries(f)));me=null;await route();});
}
function password() {
    view('Definir nova senha',`<form id="password-form" class="cartao">${field('old_password','Senha temporária / atual','password','required autocomplete="current-password"')}${field('new_password','Nova senha (mínimo 12 caracteres)','password','required minlength="12" maxlength="128" autocomplete="new-password"')}${field('confirm','Repita a nova senha','password','required autocomplete="new-password"')}${submit('Alterar senha')}</form>`,true);
    formAction('#password-form',async f=>{ if(f.get('new_password')!==f.get('confirm')) throw new Error('As senhas não conferem.'); await post('/v1/auth/password',{old_password:f.get('old_password'),new_password:f.get('new_password')});saveTokens(null);me=null;await route();notice('Senha alterada. Entre com a nova senha.');});
}
function home() {
    view(`Olá, ${me.name}`,`<div class="cartao"><h2>Terra Firma conectado</h2><p>Envie fotos, acompanhe a análise e consulte as fontes ambientais.</p><p>A IA é uma triagem experimental. Toda ocorrência exige avaliação humana.</p><a class="btn btn-primario" href="#/${me.role==='farmer'?'foto':'ocorrencias'}">${me.role==='farmer'?'Registrar foto':'Revisar ocorrências'}</a></div><h2>Propriedades</h2>${properties.length?properties.map(p=>`<div class="cartao"><strong>${esc(p.name)}</strong><p>${esc(p.municipality)} / ${esc(p.state)} · ${esc(p.area_ha??'Não informada')} ha cadastrados</p><p>${esc(p.latitude)}, ${esc(p.longitude)}</p></div>`).join(''):'<p>Nenhuma propriedade cadastrada. Solicite o cadastro à cooperativa.</p>'}`);
}
async function producers() {
    const current=generation;
    const farmers=await request('/v1/farmers');
    if(current!==generation) return;
    view('Produtores e propriedades',`<div class="grid-2"><form class="cartao" id="farmer-form"><h2>Cadastrar produtor</h2>${field('name','Nome','text','required minlength="2" maxlength="120"')}${field('username','Usuário (letras, números, ponto, traço)','text','required pattern="[a-zA-Z0-9_.\\-]{3,80}"')}${submit('Criar produtor')}<p id="credentials" class="nota"></p></form>
      <form class="cartao" id="property-form"><h2>Cadastrar propriedade</h2><label for="farmer_id">Produtor</label><select id="farmer_id" name="farmer_id" required>${options(farmers)}</select>${field('name','Nome da propriedade','text','required maxlength="120"','property-name')}${field('municipality','Município','text','required minlength="2"')}${field('state','UF','text','required pattern="[A-Z]{2}" maxlength="2"')}${field('latitude','Latitude','number','required min="-90" max="90" step="any"')}${field('longitude','Longitude','number','required min="-180" max="180" step="any"')}${field('area_ha','Área cadastrada (ha)','number','min="0" step="any"')}${submit('Salvar propriedade')}</form></div><h2>Produtores cadastrados</h2>${farmers.map(f=>`<p>${esc(f.name)} — ${esc(f.username)}</p>`).join('')}`);
    formAction('#farmer-form',async f=>{const r=await post('/v1/farmers',Object.fromEntries(f));$('#credentials').textContent=`Usuário: ${r.username} · Senha temporária: ${r.temporary_password}. Anote agora e entregue ao produtor; será trocada no primeiro acesso.`;const list=await request('/v1/farmers');$('#farmer_id').innerHTML=options(list);});
    formAction('#property-form',async f=>{const b=Object.fromEntries(f); b.latitude=Number(b.latitude); b.longitude=Number(b.longitude);b.area_ha=b.area_ha===''?null:Number(b.area_ha); await post('/v1/properties',b); notice('Propriedade salva.');});
}
async function capturePhoto(video, stream) {
    if(window.ImageCapture) {
        try {
            const camera = new ImageCapture(stream.getVideoTracks()[0]);
            // Keep the camera's original bytes, including any GPS metadata.
            const photo = await camera.takePhoto({imageWidth:video.videoWidth,imageHeight:video.videoHeight});
            if(['image/jpeg','image/png'].includes(photo.type)) return photo;
        } catch { /* Some devices only support the video stream. */ }
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

function upload() {
    if(!properties.length) return view('Novo relato','<p>Cadastre uma propriedade com a cooperativa antes do envio.</p>');
    view('Novo relato',`<form id="upload" class="cartao"><label for="property_id">Propriedade</label><select name="property_id" id="property_id">${options(properties)}</select>
      <p>Foto</p>
      <button class="btn" type="button" id="open-camera">Abrir câmera</button>
      <video id="camera-video" class="foto-relato" aria-label="Prévia da câmera" autoplay playsinline muted hidden></video>
      <button class="btn" type="button" id="take-photo" hidden disabled>Tirar foto</button>
      <button class="btn" type="button" id="close-camera" hidden>Fechar câmera</button>
      <img id="captured-photo" class="foto-relato" alt="Foto capturada para o relato" hidden>
      <label for="description">O que você observou?</label><textarea name="description" id="description" maxlength="2000"></textarea>
      <button class="btn" type="button" id="gps">Permitir localização</button>
      <p id="gps-status" role="status">Localização do aparelho ainda não obtida.</p>
      <p class="nota">Ao enviar, o GPS da foto, quando disponível, é usado para consultar focos de calor por satélite e o clima do local. A localização do aparelho só é usada se a foto não tiver GPS.</p>
      ${submit('Enviar relato')}</form>`,true);
    const current = generation;
    const form = $('#upload');
    const video = $('#camera-video');
    video.muted = true;
    const preview = $('#captured-photo');
    const openButton = $('#open-camera');
    const takeButton = $('#take-photo');
    const closeButton = $('#close-camera');
    const gpsButton = $('#gps');
    const gpsStatus = $('#gps-status');
    let gps = null, photo = null, retryPayload = null, stream = null, cameraSession = 0;

    closeCamera = () => {
        cameraSession++;
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        video.hidden = closeButton.hidden = takeButton.hidden = true;
        takeButton.disabled = true;
        openButton.hidden = openButton.disabled = false;
        preview.hidden = !photo;
    };
    closeButton.onclick = closeCamera;
    video.onloadeddata = () => { if(stream) takeButton.disabled = false; };
    openButton.onclick = async () => {
        if(!navigator.mediaDevices?.getUserMedia) return notice('Câmera indisponível. Abra o Terra Firma por HTTPS ou localhost em um navegador compatível.');
        const session = ++cameraSession;
        openButton.disabled = true;
        $('#aviso').hidden = true;
        try {
            const camera = await navigator.mediaDevices.getUserMedia({
                audio:false, video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}}
            });
            if(session !== cameraSession) {
                camera.getTracks().forEach(track => track.stop());
                return;
            }
            stream = camera;
            video.srcObject = stream;
            video.hidden = closeButton.hidden = takeButton.hidden = false;
            preview.hidden = openButton.hidden = true;
        } catch {
            if(session !== cameraSession) return;
            openButton.disabled = false;
            notice('Não foi possível abrir a câmera. Confira a permissão do navegador e tente novamente.');
        }
    };
    takeButton.onclick = async () => {
        const session = cameraSession;
        takeButton.disabled = true;
        try {
            const captured = await capturePhoto(video, stream);
            if(session !== cameraSession) return;
            if(!captured || !captured.size || captured.size > 3000000) throw new Error();
            if(photoURL) URL.revokeObjectURL(photoURL);
            photoURL = URL.createObjectURL(captured);
            photo = captured;
            retryPayload = null;
            preview.src = photoURL;
            openButton.textContent = 'Tirar outra foto';
            closeCamera();
        } catch {
            if(session !== cameraSession) return;
            takeButton.disabled = false;
            notice('Não foi possível salvar a captura. Tente tirar a foto novamente.');
        }
    };

    gpsButton.onclick = () => {
        if(!navigator.geolocation) return notice('Localização indisponível neste navegador.');
        gpsButton.disabled = true;
        gpsStatus.textContent = 'Buscando a localização do aparelho…';
        navigator.geolocation.getCurrentPosition(({coords}) => {
            if(current !== generation) return;
            gps = {latitude:coords.latitude,longitude:coords.longitude};
            retryPayload = null;
            gpsStatus.textContent = 'Localização do aparelho disponível como alternativa.';
            gpsButton.disabled = false;
        }, () => {
            if(current !== generation) return;
            gpsStatus.textContent = gps ? 'A atualização falhou. A localização anterior continua disponível.' : 'Localização do aparelho indisponível. Você pode enviar o relato assim.';
            gpsButton.disabled = false;
        }, {enableHighAccuracy:true,timeout:12000});
    };
    form.addEventListener('input', () => { retryPayload = null; });
    formAction('#upload', async f => {
        if(stream || openButton.disabled) throw new Error('Termine a captura ou feche a câmera antes de enviar.');
        if(!photo) throw new Error('Tire uma foto para enviar o relato.');
        if(!retryPayload) {
            const metadata = {
                property_id:f.get('property_id'), description:f.get('description'),
                location_source:gps?'gps':'unavailable', location_authorized:!!gps,
                ...gps, client_request_id:crypto.randomUUID()
            };
            retryPayload = new FormData();
            retryPayload.set('metadata', JSON.stringify(metadata));
            retryPayload.set('photo', photo, photo.type === 'image/png' ? 'foto.png' : 'foto.jpg');
        }
        const r = await request('/v1/incidents',{method:'POST',body:retryPayload});
        if(current === generation) go(`ocorrencia/${r.id}`);
    });
}
async function incidents(current) {
    const rows=await request(`/v1/incidents?limit=20&offset=${page*20}`);if(current!==generation) return;
    view('Ocorrências',rows.map(o=>`<a class="cartao" style="display:block" href="#/ocorrencia/${esc(o.id)}"><strong>${esc(statusNames[o.status])}</strong><p>${esc(o.description||'Sem relato')}</p><small>${esc(date(o.created_at))} · IA: ${esc(aiNames[o.ai?.status]||o.ai?.status)}</small></a>`).join('')+`<p>${rows.length?'':'Nenhuma ocorrência nesta página.'}</p><button class="btn" id="prev" ${page===0?'disabled':''}>Anterior</button> <button class="btn" id="next" ${rows.length<20?'disabled':''}>Próxima</button>`);
    $('#prev').onclick=()=>{page--;route();};$('#next').onclick=()=>{page++;route();};
}
function evidence(ai) {
    const c=ai.crossing;
    return `<div class="cartao"><h2>Análise da foto</h2><p><strong>${esc(aiNames[ai.status]||ai.status)}</strong> · ${esc(classes[ai.classification]||'Aguardando resultado')}</p>${ai.simulated?'<p>RESULTADO SIMULADO</p>':''}<p>${esc(ai.explanation)}</p><p class="nota">${esc(ai.warning)}</p>${ai.model?`<small>${esc(ai.provider)} / ${esc(ai.model)} · ${esc(date(ai.analyzed_at))}</small>`:''}</div>${c?`<div class="cartao"><h2>Cruzamento de evidências</h2><p>${esc(c.summary)}</p><p>Referência: ${esc(locationNames[c.location_source] || c.location_source)} · ${esc(c.latitude)}, ${esc(c.longitude)}</p><p>Consulta: ${esc(date(c.reference_time))}</p>${c.weather?`<p>Clima: ${esc(c.weather.temperature_c)} °C · umidade ${esc(c.weather.humidity_pct)}% · vento ${esc(c.weather.wind_kmh)} km/h · precipitação ${esc(c.weather.precipitation_mm)} mm</p>`:'<p>Sem meteorologia real recente para correlação.</p>'}<ul>${(c.nearby_hotspots||[]).map(h=>`<li>${esc(h.distance_km)} km · ${esc(date(h.observed_at))}</li>`).join('')}</ul><ul>${c.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul><details><summary>Fontes e dados utilizados</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify(ai.environment_snapshot,null,2))}</pre></details></div>`:''}`;
}
async function detail(id,current) {
    const o=await request(`/v1/incidents/${encodeURIComponent(id)}`);if(current!==generation) return;
    const transitions={submitted:['under_review'],under_review:['verified','rejected'],verified:['escalated']};
    view('Análise do registro',`<div class="cartao"><p><strong>${esc(statusNames[o.status])}</strong> · ${esc(date(o.created_at))}</p><p>${esc(o.description)}</p><img id="incident-photo" alt="Foto enviada pelo produtor" style="max-width:100%;max-height:480px"><p id="photo-error"></p></div>${evidence(o.ai||{})}<p>Esta tela não envia notificações a autoridades.</p>
      ${['failed','unavailable','simulated'].includes(o.ai?.status)?'<button class="btn" id="retry">Tentar análise novamente</button>':''}
      ${me.role==='cooperative'?`<div class="cartao"><h2>Revisão humana</h2>${transitions[o.status]?`<form id="review"><label for="review-status">Novo estado</label><select name="status" id="review-status">${transitions[o.status].map(s=>`<option value="${s}">${statusNames[s]}</option>`).join('')}</select><label for="notes">Justificativa</label><textarea id="notes" name="notes" required minlength="5" maxlength="2000"></textarea>${submit('Registrar revisão')}</form>`:'<p>Revisão encerrada.</p>'}<button class="btn" id="draft">Preparar minuta</button><p id="draft-text"></p></div>`:''}
      <h2>Histórico de revisão</h2>${(o.reviews||[]).map(r=>`<div class="cartao"><strong>${esc(statusNames[r.new_status])}</strong> · ${esc(date(r.created_at))}<p>${esc(r.notes)}</p></div>`).join('')}`);
    if($('#retry')) $('#retry').onclick=async()=>{try { await post(`/v1/incidents/${id}/analyze`,{});route(); }catch(e){notice(e.message);} };
    if($('#review')) formAction('#review',async f=>{await request(`/v1/incidents/${id}/review`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(f))});route();});
    if($('#draft')) $('#draft').onclick=async()=>{try {$('#draft-text').textContent=(await request(`/v1/incidents/${id}/notification-draft`)).text;}catch(e){notice(e.message);} };
    try { const blob=await request(o.photo_url,{blob:true});if(current===generation){photoURL=URL.createObjectURL(blob);$('#incident-photo').src=photoURL;} }catch(e){if(current===generation)$('#photo-error').textContent=e.message;}
    if(current===generation && ['pending','processing'].includes(o.ai?.status)) { const check=()=>{ if(current!==generation) return; if(document.activeElement?.closest('#review')) poll=setTimeout(check,5000); else route(); }; poll=setTimeout(check,5000); }
}
async function environment() {
    const current=generation;
    view('Painel ambiental',`<div class="cartao"><label for="env-prop">Propriedade</label><select id="env-prop">${options(properties)}</select><button class="btn" id="env-load">Consultar fontes</button></div><div id="env-result"></div>`);
    $('#env-load').onclick=async()=>{
        if(!$('#env-prop').value) return;$('#env-load').disabled=true;
        try {
            const c=await request(`/v1/properties/${$('#env-prop').value}/environment`);
            if(current!==generation) return;
            $('#env-result').innerHTML=['weather','hotspots'].map(k=>{const e=c[k];return `<div class="cartao"><h2>${k==='weather'?'Meteorologia':'Focos de calor'}</h2><p>${esc(e.source)} · <strong>${e.simulated?'SIMULADO':esc(e.status)}</strong></p><p>Observação: ${esc(date(e.observed_at))} · Consulta: ${esc(date(e.fetched_at))}</p><pre style="white-space:pre-wrap">${esc(JSON.stringify(e.data,null,2))}</pre>${e.warnings.map(w=>`<p class="nota">${esc(w)}</p>`).join('')}</div>`;}).join('')+'<p>Focos de calor não confirmam incêndio. Não há índice validado de risco ou previsão de propagação.</p>';
        }catch(e){notice(e.message);}finally{if($('#env-load'))$('#env-load').disabled=false;}
    };
}
async function reports() {
    const current=generation;
    const r=await request('/v1/reports/summary');
    if(current!==generation) return;
    view('Relatórios',`<div class="cartao"><p>Produtores: ${r.farmers} · Propriedades: ${r.properties}</p><p>Ocorrências: ${r.incidents} · Aguardando revisão: ${r.awaiting_review}</p><p>Área cadastrada: ${esc(r.registered_area_ha)} ha</p><ul>${Object.entries(r.by_status).map(([s,n])=>`<li>${esc(statusNames[s])}: ${n}</li>`).join('')}</ul><p>${esc(r.note)}</p></div>`);
}
const LOGO_SVG = `<svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path d="M7 28h34M10 34h28M15 40h18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M24 9c4 4 5 8 2 12-1-2-3-3-4-3 1 3 0 5-2 6-2-4 0-10 4-15z" fill="currentColor"/>
</svg>`;

/* ---------- Início ---------- */
$('#marca-logo').innerHTML = LOGO_SVG;
window.addEventListener('hashchange',route);
window.addEventListener('pagehide', () => closeCamera?.());
route();
