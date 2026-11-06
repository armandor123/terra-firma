/* =========================================================
   Terra Firma — interface (roteamento por hash + telas)
   ========================================================= */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtData = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtNum = n => Number(n).toLocaleString('pt-BR');
const pct = n => `${Math.round(n * 100)}%`;
const app = $('#app');

const STATUS = {
    enviada: 'Enviada', analise: 'Em análise', verificada: 'Verificada',
    rejeitada: 'Rejeitada', escalada: 'Escalada',
};
const LOCAL = { gps: 'GPS do aparelho', manual: 'Informado manualmente', propriedade: 'Local da propriedade', nao_verificada: 'Localização não verificada' };
const DESTINOS = ['Corpo de Bombeiros (193)', 'Defesa Civil (199)', 'Brigada municipal', 'Prevfogo / IBAMA'];
const NIVEL_CLASSE = { 'Baixo': 'r1', 'Moderado': 'r2', 'Alto': 'r3', 'Muito alto': 'r4' };

const chipStatus = s => `<span class="chip st-${s}">${STATUS[s]}</span>`;
const CONTEXTO = {
    inicio:    { nome: 'Início do foco',         ajuda: 'Fumaça ou chama pequena, começando agora' },
    andamento: { nome: 'Incêndio em andamento',  ajuda: 'Fogo alto ou se espalhando' },
    pos:       { nome: 'Pós-incêndio',           ajuda: 'Área queimada, cinzas ou brasas' },
};
const chipContexto = c => CONTEXTO[c] ? `<span class="ctx ctx-${c}">${CONTEXTO[c].nome}</span>` : '';
const miniFoto = o => o.foto
    ? `<img class="mini-foto" src="${esc(o.foto)}" alt="" loading="lazy">`
    : `<span class="mini-foto sem-foto" aria-hidden="true">${o.tipo === 'sos' ? '!' : o.origem === 'satelite' ? '◎' : '◉'}</span>`;
const chipRisco = n => `<span class="chip risco ${NIVEL_CLASSE[n]}">Risco ${n.toLowerCase()}</span>`;
const seloSimulado = (txt = 'Dados simulados') => `<span class="selo-sim">${esc(txt)}</span>`;

function salvarOuAvisar() {
    if (!TF.salvar()) avisar('Não foi possível salvar: armazenamento do navegador cheio ou bloqueado.', 'erro');
}

let timerAviso;
function avisar(texto, tipo = 'ok') {
    const el = $('#aviso');
    el.textContent = texto;
    el.className = `aviso ${tipo}`;
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.hidden = true; }, 3500);
}

/* ---------- Roteamento ---------- */
const ROTAS = {
    'login':        { perfil: null,          titulo: 'Entrar',               tela: telaLogin },
    'trocar-senha': { perfil: '*',           titulo: 'Definir nova senha',   tela: telaTrocarSenha },
    'inicio':       { perfil: 'agricultor',  titulo: 'Início',               tela: telaInicio },
    'foto':         { perfil: 'agricultor',  titulo: 'Registrar foto',       tela: telaFoto },
    'analise':      { perfil: 'agricultor',  titulo: 'Análise do registro',  tela: telaAnalise },
    'ambiente':     { perfil: 'agricultor',  titulo: 'Painel ambiental',     tela: telaAmbiente },
    'sos':          { perfil: 'agricultor',  titulo: 'Emergência',           tela: telaSOS },
    'painel':       { perfil: 'cooperativa', titulo: 'Painel',               tela: telaPainel },
    'agricultores': { perfil: 'cooperativa', titulo: 'Produtores',         tela: telaAgricultores },
    'ocorrencias':  { perfil: 'cooperativa', titulo: 'Ocorrências',          tela: telaOcorrencias },
    'ocorrencia':   { perfil: 'cooperativa', titulo: 'Ocorrência',           tela: telaOcorrencia },
    'alertas':      { perfil: 'cooperativa', titulo: 'Alertas',              tela: telaAlertas },
    'relatorios':   { perfil: 'cooperativa', titulo: 'Relatórios',           tela: telaRelatorios },
    // Guia é público: orientação de emergência não pode depender de login
    'guia':         { perfil: '*',           titulo: 'Guia',                 tela: telaGuia, publica: true },
};

const NAV = {
    agricultor: [['inicio', 'Início', '⌂'], ['foto', 'Foto', '◉'], ['ambiente', 'Ambiente', '◐'],
                 ['guia', 'Guia', '?'], ['sos', 'SOS', '!']],
    cooperativa: [['painel', 'Painel'], ['agricultores', 'Produtores'], ['ocorrencias', 'Ocorrências'],
                  ['alertas', 'Alertas'], ['relatorios', 'Relatórios'], ['guia', 'Guia']],
};

function ir(rota) {
    const alvo = `#/${rota}`;
    if (location.hash === alvo) rotear(); else location.hash = alvo;
}

function rotear() {
    const [nome = '', param] = location.hash.replace(/^#\/?/, '').split('/');
    const u = TF.usuarioAtual();

    if (!u) return ROTAS[nome]?.publica ? mostrar(nome, param, null) : mostrar('login', null, null);
    if (u.trocarSenha && nome !== 'trocar-senha') return ir('trocar-senha');

    const rota = ROTAS[nome];
    const inicial = u.perfil === 'cooperativa' ? 'painel' : 'inicio';
    // Permissão por papel: a rota precisa ser do perfil do usuário logado
    if (!rota || nome === 'login' || (rota.perfil !== '*' && rota.perfil !== u.perfil)) return ir(inicial);
    mostrar(nome, param, u);
}

function mostrar(nome, param, u) {
    const rota = ROTAS[nome];
    document.title = `${rota.titulo} · Terra Firma`;
    montarCabecalho(u, nome);
    app.innerHTML = '';
    rota.tela(param, u);
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
}

function montarCabecalho(u, atual) {
    $('#sessao').hidden = !u;
    $('#sessao-nome').textContent = u ? u.nome : '';
    $('#sessao-papel').textContent = u ? (u.perfil === 'cooperativa' ? u.cooperativa : 'Produtor(a)') : '';

    const nav = $('#nav');
    const itens = u && !u.trocarSenha ? NAV[u.perfil] : [];
    nav.className = u ? `nav nav-${u.perfil}` : 'nav';
    nav.hidden = itens.length === 0;
    document.body.classList.toggle('com-nav-inferior', u?.perfil === 'agricultor' && itens.length > 0);
    nav.innerHTML = itens.map(([r, rotulo, icone]) => `
        <a href="#/${r}" class="${r === atual || (r === 'ocorrencias' && atual === 'ocorrencia') ? 'ativo' : ''} ${r === 'sos' ? 'nav-sos' : ''}"
           ${r === atual ? 'aria-current="page"' : ''}>
            ${icone ? `<span class="nav-icone" aria-hidden="true">${icone}</span>` : ''}${rotulo}
        </a>`).join('');
}

$('#btn-sair').addEventListener('click', () => {
    TF.db.sessao = null;
    salvarOuAvisar();
    $('#aviso').hidden = true;
    ir('login');
});

/* =========================================================
   1. LOGIN
   ========================================================= */
function telaLogin() {
    app.innerHTML = `
    <section class="tela tela-login">
        <div class="login-marca">
            ${LOGO_SVG}
            <h1>Terra Firma</h1>
            <p>Monitoramento e relato de riscos de incêndio para produtores e cooperativas.</p>
        </div>
        <form class="cartao" id="form-login" novalidate>
            <label for="l-usuario">Usuário</label>
            <input id="l-usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required>
            <label for="l-senha">Senha</label>
            <div class="campo-acao">
                <input id="l-senha" type="password" autocomplete="current-password" required>
                <button type="button" class="btn-icone" data-alterna="l-senha" aria-label="Mostrar senha">👁</button>
            </div>
            <p class="erro" id="l-erro" role="alert"></p>
            <button class="btn btn-primario">Entrar</button>
            <p class="nota centro">Esqueceu a senha? Procure sua cooperativa.<br>
               <small>Recuperação de senha está prevista na versão de produção.</small></p>
        </form>
        <a class="cartao link-guia" href="#/guia/emergencia">
            <span class="link-guia-icone" aria-hidden="true">!</span>
            <span><strong>Guia de emergência</strong><small>O que fazer em caso de fogo, sem precisar entrar</small></span>
        </a>
        <details class="cartao demo">
            <summary>Contas de demonstração</summary>
            <ul>
                <li>Cooperativa: <code>cooperativa</code> / <code>coop123</code></li>
                <li>Produtora: <code>ana.souza</code> / <code>demo1234</code></li>
                <li>Produtor: <code>jose.pereira</code> / <code>demo1234</code></li>
            </ul>
            <button type="button" class="btn btn-texto" id="btn-reiniciar">Restaurar dados de demonstração</button>
        </details>
    </section>`;

    ligarMostrarSenha();
    $('#btn-reiniciar').addEventListener('click', () => {
        if (!confirm('Apagar tudo que foi cadastrado neste navegador e voltar aos dados de demonstração?')) return;
        TF.reiniciar();
        avisar('Dados de demonstração restaurados.');
    });
    $('#form-login').addEventListener('submit', e => {
        e.preventDefault();
        const usuario = $('#l-usuario').value.trim().toLowerCase();
        const senha = $('#l-senha').value;
        // Protótipo: em produção quem autentica e define o papel é o back-end
        const u = TF.db.usuarios.find(x => x.usuario === usuario && x.senha === senha);
        if (!u) { $('#l-erro').textContent = 'Usuário ou senha incorretos.'; return; }
        TF.db.sessao = u.id;
        salvarOuAvisar();
        ir(u.perfil === 'cooperativa' ? 'painel' : 'inicio');
    });
}

function ligarMostrarSenha() {
    $$('[data-alterna]').forEach(btn => btn.addEventListener('click', () => {
        const campo = document.getElementById(btn.dataset.alterna);
        const mostrar = campo.type === 'password';
        campo.type = mostrar ? 'text' : 'password';
        btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    }));
}

/* Troca obrigatória da senha provisória no primeiro acesso */
function telaTrocarSenha(_, u) {
    app.innerHTML = `
    <section class="tela estreita">
        <h2>Crie sua senha</h2>
        <p class="sub">Olá, ${esc(u.nome)}. Por segurança, troque a senha provisória que a cooperativa entregou.</p>
        <form class="cartao" id="form-senha" novalidate>
            <label for="s-nova">Nova senha</label>
            <div class="campo-acao">
                <input id="s-nova" type="password" autocomplete="new-password" minlength="8" required>
                <button type="button" class="btn-icone" data-alterna="s-nova" aria-label="Mostrar senha">👁</button>
            </div>
            <p class="nota">Mínimo de 8 caracteres. Evite datas de nascimento e o seu nome.</p>
            <label for="s-conf">Repita a nova senha</label>
            <input id="s-conf" type="password" autocomplete="new-password" required>
            <p class="erro" id="s-erro" role="alert"></p>
            <button class="btn btn-primario">Salvar e continuar</button>
        </form>
    </section>`;
    ligarMostrarSenha();
    $('#form-senha').addEventListener('submit', e => {
        e.preventDefault();
        const nova = $('#s-nova').value, conf = $('#s-conf').value, erro = $('#s-erro');
        if (nova.length < 8) { erro.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
        if (nova.toLowerCase().includes(u.usuario.split('.')[0])) { erro.textContent = 'A senha não pode conter o seu nome de usuário.'; return; }
        if (nova === u.senha) { erro.textContent = 'Escolha uma senha diferente da provisória.'; return; }
        if (nova !== conf) { erro.textContent = 'As duas senhas não são iguais.'; return; }
        u.senha = nova;
        u.trocarSenha = false;
        salvarOuAvisar();
        avisar('Senha atualizada.');
        ir(u.perfil === 'cooperativa' ? 'painel' : 'inicio');
    });
}

/* =========================================================
   2. INÍCIO DO PRODUTOR
   ========================================================= */
function telaInicio(_, u) {
    const p = TF.propriedade(u.propriedadeId);
    const c = TF.condicoes(p);
    const risco = TF.classificarRisco(c);
    const meus = TF.db.ocorrencias.filter(o => o.agricultorId === u.id)
        .sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 4);

    app.innerHTML = `
    <section class="tela">
        <h2>Olá, ${esc(u.nome.split(' ')[0])}</h2>
        <div class="cartao propriedade">
            <div class="linha-entre">
                <div>
                    <h3>${esc(p.nome || 'Minha propriedade')}</h3>
                    <p class="sub sem-margem">${esc(p.municipio)} · ${esc(p.uf)}${p.hectares ? ` · ${fmtNum(p.hectares)} ha` : ''}</p>
                </div>
                ${chipRisco(risco)}
            </div>
            <dl class="mini-dados">
                <div><dt>Temperatura</dt><dd>${c.temperatura} °C</dd></div>
                <div><dt>Umidade</dt><dd>${c.umidade}%</dd></div>
                <div><dt>Focos até 10 km</dt><dd>${c.focos.filter(f => f.distanciaKm <= 10).length}</dd></div>
            </dl>
            <p class="fonte">${seloSimulado()} Atualizado às ${c.observadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div class="acoes-grandes">
            <a class="acao" href="#/foto"><span class="acao-icone" aria-hidden="true">◉</span>Registrar foto<small>Fumaça, fogo ou área queimada</small></a>
            <a class="acao" href="#/ambiente"><span class="acao-icone" aria-hidden="true">◐</span>Painel ambiental<small>Clima, focos e risco</small></a>
            <a class="acao acao-sos" href="#/sos"><span class="acao-icone" aria-hidden="true">!</span>Emergência SOS<small>Bombeiros 193</small></a>
        </div>

        <div class="cartao">
            <h3>Meus últimos registros</h3>
            ${meus.length ? `<ul class="lista">${meus.map(o => `
                <li class="registro">${miniFoto(o)}<div class="registro-info"><strong>${esc(o.tipo === 'sos' ? 'Pedido de ajuda (SOS)' : o.ia?.classe ?? 'Registro')}</strong>
                    <small>${chipContexto(o.contexto)} ${fmtData(o.data)}</small></div>${chipStatus(o.status)}</li>`).join('')}</ul>`
              : '<p class="vazio">Você ainda não enviou registros.</p>'}
        </div>
    </section>`;
}

/* =========================================================
   3. REGISTRO DE FOTO
   ========================================================= */
function telaFoto(_, u) {
    const p = TF.propriedade(u.propriedadeId);
    app.innerHTML = `
    <section class="tela">
        <h2>Registrar foto</h2>
        <p class="sub">Fotografe a fumaça, o fogo ou a área queimada. Mantenha distância segura.</p>
        <form class="cartao" id="form-foto" novalidate>
            <label class="btn btn-secundario btn-foto" for="f-arquivo">◉ Tirar ou escolher foto</label>
            <input id="f-arquivo" type="file" accept="image/*" capture="environment" hidden>
            <img id="f-previa" class="foto-previa" alt="Prévia da foto" hidden>

            <div class="status-local" id="f-local" aria-live="polite">A localização será pedida depois da foto.</div>
            <div id="f-manual" hidden>
                <p class="nota">Sem GPS. Informe as coordenadas ou use o local da propriedade.</p>
                <div class="grade-2">
                    <div><label for="f-lat">Latitude</label><input id="f-lat" inputmode="decimal" placeholder="-15.4601"></div>
                    <div><label for="f-lng">Longitude</label><input id="f-lng" inputmode="decimal" placeholder="-55.7498"></div>
                </div>
                <button type="button" class="btn btn-texto" id="f-usar-prop">Usar o local da propriedade</button>
            </div>

            <fieldset class="ctx-campo">
                <legend>Qual é a situação? *</legend>
                <div class="ctx-opcoes">
                    ${Object.entries(CONTEXTO).map(([k, c]) => `
                    <label><input type="radio" name="f-contexto" value="${k}">
                        <span>${c.nome}<small>${c.ajuda}</small></span></label>`).join('')}
                </div>
            </fieldset>

            <label for="f-desc">O que você está vendo? <span class="opcional">(opcional)</span></label>
            <textarea id="f-desc" rows="3" maxlength="500" placeholder="Ex.: fumaça escura vindo da mata ao norte"></textarea>

            <p class="erro" id="f-erro" role="alert"></p>
            <button class="btn btn-primario" id="f-enviar">Enviar para análise</button>
        </form>
    </section>`;

    let local = { lat: null, lng: null, origem: 'nao_verificada' };
    const status = $('#f-local');

    $('#f-arquivo').addEventListener('change', e => {
        const arq = e.target.files[0];
        if (!arq) return;
        const prev = $('#f-previa');
        prev.src = URL.createObjectURL(arq);
        prev.hidden = false;

        if (!('geolocation' in navigator)) { semGps('GPS indisponível neste aparelho.'); return; }
        status.textContent = 'Obtendo localização…';
        navigator.geolocation.getCurrentPosition(pos => {
            local = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6), origem: 'gps' };
            status.textContent = `Localização registrada: ${local.lat}, ${local.lng} (±${Math.round(pos.coords.accuracy)} m)`;
            status.className = 'status-local ok';
            $('#f-manual').hidden = true;
        }, () => semGps('Permissão de localização negada ou indisponível.'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });

    function semGps(motivo) {
        status.textContent = `${motivo} A localização ficará como não verificada se você não informar.`;
        status.className = 'status-local alerta';
        $('#f-manual').hidden = false;
    }

    $('#f-usar-prop').addEventListener('click', () => {
        $('#f-lat').value = p.lat; $('#f-lng').value = p.lng;
        local.origem = 'propriedade';
    });

    $('#form-foto').addEventListener('submit', async e => {
        e.preventDefault();
        const erro = $('#f-erro');
        const arq = $('#f-arquivo').files[0];
        if (!arq) { erro.textContent = 'Tire ou escolha uma foto primeiro.'; return; }
        const contexto = $('input[name="f-contexto"]:checked')?.value;
        if (!contexto) { erro.textContent = 'Escolha a situação: início do foco, incêndio em andamento ou pós-incêndio.'; return; }

        if (local.origem !== 'gps') {
            const lat = parseFloat($('#f-lat').value.replace(',', '.'));
            const lng = parseFloat($('#f-lng').value.replace(',', '.'));
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) { erro.textContent = 'Coordenadas inválidas.'; return; }
                local = { lat, lng, origem: local.origem === 'propriedade' ? 'propriedade' : 'manual' };
            }
        }
        erro.textContent = '';
        const btn = $('#f-enviar');
        btn.disabled = true;
        btn.textContent = 'Processando a foto…';

        try {
            const { canvas, dataUrl } = await TF.prepararFoto(arq);
            const ia = TF.analisarImagem(canvas);
            const o = {
                id: TF.proximoId('OCO'), tipo: 'foto', origem: 'agricultor',
                agricultorId: u.id, propriedadeId: u.propriedadeId,
                data: new Date().toISOString(), foto: dataUrl,
                lat: local.lat, lng: local.lng, localOrigem: local.origem, contexto,
                descricao: $('#f-desc').value.trim(), ia, status: 'enviada', notas: [], comunicacao: null,
            };
            TF.db.ocorrencias.push(o);
            if (!TF.salvar()) {
                o.foto = null; // tenta de novo sem a imagem
                if (!TF.salvar()) throw new Error('armazenamento cheio');
                avisar('Registro salvo sem a imagem (armazenamento cheio).', 'erro');
            }
            ir(`analise/${o.id}`);
        } catch (err) {
            erro.textContent = `Não foi possível enviar: ${err.message}`;
            btn.disabled = false;
            btn.textContent = 'Enviar para análise';
        }
    });
}

/* =========================================================
   4. ANÁLISE ASSISTIDA (SIMULADA)
   ========================================================= */
function telaAnalise(id, u) {
    const o = TF.ocorrencia(id);
    if (!o || o.agricultorId !== u.id) return ir('inicio');
    const c = TF.condicoes(TF.propriedade(o.propriedadeId));

    // Pequena espera para comunicar que há um processamento
    app.innerHTML = `<section class="tela"><div class="cartao carregando" role="status">
        <span class="spinner" aria-hidden="true"></span> Analisando a foto…</div></section>`;

    setTimeout(() => {
        const ind = o.ia.indicadores;
        const temIndicio = !o.ia.classe.startsWith('Nenhum');
        app.innerHTML = `
        <section class="tela">
            <h2>Registro enviado</h2>
            <p class="sub">${o.id} · ${fmtData(o.data)} · ${chipContexto(o.contexto)} ${chipStatus(o.status)}</p>

            ${o.contexto === 'andamento' ? `<div class="faixa-aviso perigo"><strong>Incêndio em andamento?</strong>
                Se houver perigo, afaste-se e ligue <a href="tel:193">193</a> agora.</div>` : ''}

            <div class="faixa-aviso">
                <strong>Resultado simulado e preliminar.</strong> Esta análise não confirma incêndio, local exato nem tamanho da área.
                A cooperativa vai revisar o seu registro.
            </div>

            <div class="cartao">
                ${o.foto ? `<img class="foto-previa" src="${o.foto}" alt="Foto enviada">` : ''}
                <h3>${esc(o.ia.classe)} ${seloSimulado('Análise simulada')}</h3>
                <p class="nota">Confiança estimada: <strong>${pct(o.ia.confianca)}</strong></p>
                ${barra('Fogo visível', ind.fogo)}
                ${barra('Fumaça visível', ind.fumaca)}
                ${barra('Vegetação queimada', ind.queimada)}
            </div>

            <div class="cartao">
                <h3>Contexto do local ${seloSimulado()}</h3>
                <dl class="lista-def">
                    <dt>Localização</dt><dd>${LOCAL[o.localOrigem]}${o.lat != null ? ` (${o.lat}, ${o.lng})` : ''}</dd>
                    <dt>Focos de satélite até 10 km</dt><dd>${c.focos.filter(f => f.distanciaKm <= 10).length}</dd>
                    <dt>Tempo agora</dt><dd>${c.temperatura} °C · umidade ${c.umidade}% · vento ${c.vento} km/h ${c.direcao}</dd>
                </dl>
            </div>

            ${temIndicio ? `<a class="btn btn-perigo" href="#/sos">Há perigo agora? Abrir emergência</a>` : ''}
            <a class="btn btn-secundario" href="#/inicio">Voltar ao início</a>
        </section>`;
    }, 900);
}

function barra(rotulo, valor) {
    return `<div class="barra"><span>${rotulo}</span>
        <div class="barra-trilho" role="img" aria-label="${rotulo}: ${pct(valor)}"><i style="width:${pct(valor)}"></i></div>
        <b>${pct(valor)}</b></div>`;
}

/* =========================================================
   5. PAINEL AMBIENTAL
   ========================================================= */
function telaAmbiente(_, u) {
    const p = TF.propriedade(u.propriedadeId);
    const c = TF.condicoes(p);
    const risco = TF.classificarRisco(c);
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const max = Math.max(...c.historico, 1);

    app.innerHTML = `
    <section class="tela">
        <h2>Painel ambiental</h2>
        <p class="sub">${esc(p.nome)} · ${esc(p.municipio)}/${esc(p.uf)}</p>

        <div class="faixa-aviso neutra">
            ${seloSimulado()} Observação de ${fmtData(c.observadoEm)}. Fontes previstas:
            INPE Queimadas, NASA FIRMS e um provedor meteorológico.
        </div>

        <div class="cartao risco-cartao ${NIVEL_CLASSE[risco]}">
            <p class="rotulo">Risco de incêndio</p>
            <p class="risco-nivel">${risco}</p>
            <p class="nota">${esc(TF.CRITERIO_RISCO)}</p>
        </div>

        <div class="indicadores">
            <div class="ind"><span>Temperatura</span><strong>${c.temperatura} °C</strong></div>
            <div class="ind"><span>Umidade relativa</span><strong>${c.umidade}%</strong></div>
            <div class="ind"><span>Vento</span><strong>${c.vento} km/h <small>${c.direcao}</small></strong></div>
            <div class="ind"><span>Dias sem chuva</span><strong>${c.diasSemChuva}</strong></div>
        </div>

        <div class="cartao">
            <h3>Focos de calor próximos</h3>
            ${c.focos.length ? `<ul class="lista">${c.focos.map(f => `
                <li><div><strong>${String(f.distanciaKm).replace('.', ',')} km da propriedade</strong>
                <small>Satélite ${f.satelite} · há ${f.horasAtras} h</small></div>
                ${f.distanciaKm <= 10 ? '<span class="chip st-analise">Próximo</span>' : ''}</li>`).join('')}</ul>`
              : '<p class="vazio">Nenhum foco detectado num raio de 25 km.</p>'}
            <p class="nota">Foco de calor é uma detecção de temperatura por satélite, não um incêndio confirmado,
               e o número de focos não indica a área queimada.</p>
        </div>

        <div class="cartao">
            <h3>Histórico de focos na região</h3>
            <div class="grafico" role="img" aria-label="Focos por mês: ${c.historico.map((v, i) => `${meses[i]} ${v}`).join(', ')}">
                ${c.historico.map((v, i) => `<div class="coluna"><i style="height:${Math.max(3, (v / max) * 100)}%" title="${v} focos"></i><span>${meses[i]}</span></div>`).join('')}
            </div>
            <p class="nota">Média mensal ilustrativa. O período seco (jul–out) concentra os focos.</p>
        </div>
    </section>`;
}

/* =========================================================
   6. SOS
   ========================================================= */
function telaSOS(_, u) {
    app.innerHTML = `
    <section class="tela">
        <h2>Emergência</h2>
        <a class="btn-sos" href="tel:193">
            <span>Ligar para os Bombeiros</span><strong>193</strong>
        </a>
        <div class="contatos">
            <a class="btn btn-secundario" href="tel:199">Defesa Civil · 199</a>
            <a class="btn btn-secundario" href="tel:192">SAMU · 192</a>
        </div>
        <p class="nota centro">O aplicativo <strong>não</strong> chama o socorro automaticamente. Ligue você mesmo.</p>

        <div class="cartao">
            <h3>Enquanto espera</h3>
            <ol class="orientacoes">
                <li>Afaste pessoas e animais do fogo. Saia na direção contrária ao vento.</li>
                <li>Não tente apagar um fogo grande sozinho.</li>
                <li>Proteja nariz e boca com um pano úmido contra a fumaça.</li>
                <li>Deixe a estrada de acesso livre para os bombeiros.</li>
            </ol>
            <a class="link" href="#/guia/emergencia">Ver o guia de emergência completo →</a>
        </div>

        <div class="cartao">
            <h3>Avisar a cooperativa</h3>
            <p class="nota">Envia um alerta com a sua localização para a cooperativa acompanhar.</p>
            <button class="btn btn-primario" id="btn-avisar">Avisar a cooperativa</button>
        </div>
    </section>`;

    $('#btn-avisar').addEventListener('click', () => {
        const btn = $('#btn-avisar');
        btn.disabled = true;
        btn.textContent = 'Enviando…';
        const criar = (lat = null, lng = null, origem = 'nao_verificada') => {
            TF.db.ocorrencias.push({
                id: TF.proximoId('OCO'), tipo: 'sos', origem: 'agricultor', agricultorId: u.id, propriedadeId: u.propriedadeId,
                data: new Date().toISOString(), foto: null, lat, lng, localOrigem: origem,
                descricao: 'Pedido de ajuda enviado pela tela de emergência.', ia: null,
                status: 'enviada', notas: [], comunicacao: null,
            });
            salvarOuAvisar();
            btn.textContent = 'Cooperativa avisada ✔';
            avisar('A cooperativa recebeu o seu alerta. Se houver perigo, ligue 193.');
        };
        if (!('geolocation' in navigator)) return criar();
        navigator.geolocation.getCurrentPosition(
            pos => criar(+pos.coords.latitude.toFixed(6), +pos.coords.longitude.toFixed(6), 'gps'),
            () => criar(), { timeout: 8000, maximumAge: 60000 });
    });
}

/* =========================================================
   7. PAINEL DA COOPERATIVA
   ========================================================= */
function telaPainel(_, u) {
    const db = TF.db;
    const area = db.propriedades.reduce((s, p) => s + (Number(p.hectares) || 0), 0);
    const pendentes = db.ocorrencias.filter(o => o.status === 'enviada' || o.status === 'analise').length;
    const alertas = TF.alertas();

    app.innerHTML = `
    <section class="tela larga">
        <h2>Painel da cooperativa</h2>
        <p class="sub">${esc(u.cooperativa)}</p>
        <div class="kpis">
            ${kpi('Produtores', TF.agricultores().length)}
            ${kpi('Propriedades monitoradas', db.propriedades.length)}
            ${kpi('Área registrada', `${fmtNum(area)} ha`)}
            ${kpi('Relatos recebidos', db.ocorrencias.length)}
            ${kpi('Aguardando revisão', pendentes, pendentes > 0 ? 'destaque' : '')}
        </div>

        <div class="cartao">
            <div class="linha-entre"><h3>Alertas recentes</h3><a href="#/alertas" class="link">Ver todos (${alertas.length})</a></div>
            ${listaAlertas(alertas.slice(0, 5))}
        </div>

        <div class="atalhos">
            <a class="btn btn-secundario" href="#/agricultores">Cadastrar produtor</a>
            <a class="btn btn-secundario" href="#/ocorrencias">Histórico de ocorrências</a>
            <a class="btn btn-secundario" href="#/relatorios">Relatórios</a>
        </div>
    </section>`;
    ligarAlertas();
}

const kpi = (rotulo, valor, extra = '') => `<div class="kpi ${extra}"><strong>${valor}</strong><span>${rotulo}</span></div>`;

/* =========================================================
   8. PRODUTORES (cadastro e gestão)
   ========================================================= */
function telaAgricultores(_, coop) {
    app.innerHTML = `
    <section class="tela larga">
        <h2>Produtores</h2>
        <p class="sub">Cadastre o produtor e a propriedade. O ID e a senha provisória são gerados automaticamente.</p>
        <div class="duas-colunas">
            <form class="cartao" id="form-agr" novalidate>
                <h3>Novo cadastro</h3>
                <fieldset>
                    <legend>Produtor</legend>
                    <label for="a-nome">Nome completo *</label>
                    <input id="a-nome" autocomplete="off" required>
                    <label for="a-usuario">Usuário de acesso *</label>
                    <input id="a-usuario" autocapitalize="none" spellcheck="false" required>
                    <label for="a-tel">Telefone <span class="opcional">(opcional)</span></label>
                    <input id="a-tel" type="tel" inputmode="tel" autocomplete="off">
                </fieldset>
                <fieldset>
                    <legend>Propriedade</legend>
                    <label for="a-prop">Nome da propriedade <span class="opcional">(opcional)</span></label>
                    <input id="a-prop">
                    <div class="grade-municipio">
                        <div><label for="a-mun">Município *</label><input id="a-mun" required></div>
                        <div><label for="a-uf">UF *</label>
                            <select id="a-uf" required><option value="">—</option>${UFS.map(x => `<option>${x}</option>`).join('')}</select></div>
                    </div>
                    <div class="grade-2">
                        <div><label for="a-lat">Latitude *</label><input id="a-lat" inputmode="decimal" placeholder="-15.4601" required></div>
                        <div><label for="a-lng">Longitude *</label><input id="a-lng" inputmode="decimal" placeholder="-55.7498" required></div>
                    </div>
                    <button type="button" class="btn btn-texto" id="a-gps">Usar a localização deste aparelho</button>
                    <div class="grade-2">
                        <div><label for="a-ha">Área (ha) <span class="opcional">(opcional)</span></label><input id="a-ha" inputmode="decimal"></div>
                        <div><label for="a-producao">Produção <span class="opcional">(opcional)</span></label><input id="a-producao" placeholder="Ex.: café"></div>
                    </div>
                </fieldset>
                <p class="nota">Não pedimos CPF para o acesso. Coletamos só o necessário para o monitoramento (LGPD).</p>
                <p class="erro" id="a-erro" role="alert"></p>
                <button class="btn btn-primario">Cadastrar</button>
            </form>

            <div>
                <div id="credencial"></div>
                <div class="cartao">
                    <h3>Cadastrados <span class="contador">${TF.agricultores().length}</span></h3>
                    <ul class="lista" id="lista-agr"></ul>
                </div>
            </div>
        </div>
    </section>`;

    renderLista();

    $('#a-nome').addEventListener('blur', () => {
        if ($('#a-usuario').value) return;
        const partes = $('#a-nome').value.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().split(/\s+/).filter(x => x.length > 2);
        if (partes.length) $('#a-usuario').value = [...new Set([partes[0], partes.at(-1)])].join('.');
    });

    $('#a-gps').addEventListener('click', () => {
        if (!('geolocation' in navigator)) return avisar('GPS indisponível neste aparelho.', 'erro');
        navigator.geolocation.getCurrentPosition(pos => {
            $('#a-lat').value = pos.coords.latitude.toFixed(6);
            $('#a-lng').value = pos.coords.longitude.toFixed(6);
        }, () => avisar('Não foi possível obter a localização.', 'erro'), { timeout: 15000 });
    });

    $('#form-agr').addEventListener('submit', e => {
        e.preventDefault();
        const v = id => $(id).value.trim();
        const erro = $('#a-erro');
        const num = id => parseFloat(v(id).replace(',', '.'));
        const usuario = v('#a-usuario').toLowerCase();
        const lat = num('#a-lat'), lng = num('#a-lng'), ha = v('#a-ha') ? num('#a-ha') : null;

        const falha = !v('#a-nome') ? 'Informe o nome do produtor.'
            : !/^[a-z0-9._-]{3,30}$/.test(usuario) ? 'Usuário: 3 a 30 caracteres (letras, números, ponto, hífen ou _).'
            : TF.db.usuarios.some(x => x.usuario === usuario) ? 'Este usuário já existe. Escolha outro.'
            : !v('#a-mun') || !v('#a-uf') ? 'Informe município e UF.'
            : Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ? 'Informe uma latitude e longitude válidas.'
            : ha !== null && (Number.isNaN(ha) || ha <= 0) ? 'A área deve ser um número maior que zero.'
            : '';
        if (falha) { erro.textContent = falha; return; }
        erro.textContent = '';

        const agrId = TF.proximoId('AGR'), prpId = TF.proximoId('PRP'), senha = TF.gerarSenha();
        TF.db.usuarios.push({ id: agrId, usuario, senha, perfil: 'agricultor', nome: v('#a-nome'),
            cooperativa: coop.cooperativa, telefone: v('#a-tel'), propriedadeId: prpId, trocarSenha: true });
        TF.db.propriedades.push({ id: prpId, agricultorId: agrId, nome: v('#a-prop'), municipio: v('#a-mun'), uf: v('#a-uf'),
            lat, lng, hectares: ha, producao: v('#a-producao') });
        salvarOuAvisar();
        e.target.reset();
        mostrarCredencial(v('#a-nome') || usuario, agrId, usuario, senha);
        renderLista();
        $('.contador').textContent = TF.agricultores().length;
    });

    function mostrarCredencial(nome, id, usuario, senha) {
        $('#credencial').innerHTML = `
        <div class="cartao credencial" role="status">
            <h3>Acesso criado · ${esc(id)}</h3>
            <p class="nota">Entregue estes dados ao produtor. A senha só aparece agora e deverá ser trocada no primeiro acesso.</p>
            <dl class="lista-def">
                <dt>Usuário</dt><dd><code>${esc(usuario)}</code></dd>
                <dt>Senha provisória</dt><dd><code>${esc(senha)}</code></dd>
            </dl>
            <div class="linha-botoes">
                <button type="button" class="btn btn-secundario" id="c-copiar">Copiar</button>
                <button type="button" class="btn btn-texto" id="c-fechar">Ocultar</button>
            </div>
        </div>`;
        $('#c-copiar').addEventListener('click', () => copiar(`Terra Firma\nUsuário: ${usuario}\nSenha provisória: ${senha}`));
        $('#c-fechar').addEventListener('click', () => { $('#credencial').innerHTML = ''; });
    }

    function renderLista() {
        const lista = TF.agricultores();
        $('#lista-agr').innerHTML = lista.length ? lista.map(a => {
            const p = TF.propriedade(a.propriedadeId) ?? {};
            const ocs = TF.db.ocorrencias.filter(o => o.agricultorId === a.id);
            const pendentes = ocs.filter(o => o.status === 'enviada' || o.status === 'analise').length;
            return `<li>
                <div><strong>${esc(a.nome)}</strong>
                    <small>${esc(a.id)} · ${esc(a.usuario)}${a.trocarSenha ? ' · aguardando 1º acesso' : ''}</small>
                    <small>${esc(p.nome || 'Propriedade sem nome')} · ${esc(p.municipio)}/${esc(p.uf)}${p.hectares ? ` · ${fmtNum(p.hectares)} ha` : ''}</small>
                    <a class="link link-historico" href="#/ocorrencias/${esc(a.id)}">Histórico: ${ocs.length} ocorrência${ocs.length === 1 ? '' : 's'}${pendentes ? ` · ${pendentes} aguardando revisão` : ''} →</a></div>
                <div class="linha-botoes">
                    <button type="button" class="btn btn-mini" data-senha="${esc(a.id)}">Nova senha</button>
                    <button type="button" class="btn btn-mini perigo" data-remover="${esc(a.id)}">Remover</button>
                </div></li>`;
        }).join('') : '<li class="vazio">Nenhum produtor cadastrado.</li>';
    }

    $('#lista-agr').addEventListener('click', e => {
        const bSenha = e.target.closest('[data-senha]'), bRem = e.target.closest('[data-remover]');
        if (bSenha) {
            const a = TF.usuario(bSenha.dataset.senha);
            if (!confirm(`Gerar uma nova senha provisória para ${a.nome}?`)) return;
            a.senha = TF.gerarSenha();
            a.trocarSenha = true;
            salvarOuAvisar();
            mostrarCredencial(a.nome, a.id, a.usuario, a.senha);
            renderLista();
        }
        if (bRem) {
            const a = TF.usuario(bRem.dataset.remover);
            if (!confirm(`Remover o acesso de ${a.nome}? A propriedade e o histórico de ocorrências serão mantidos.`)) return;
            TF.db.usuarios = TF.db.usuarios.filter(x => x.id !== a.id);
            salvarOuAvisar();
            renderLista();
            $('.contador').textContent = TF.agricultores().length;
        }
    });
}

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR',
             'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

/* =========================================================
   9. HISTÓRICO DE OCORRÊNCIAS
   ========================================================= */
function telaOcorrencias(agricultorId) {
    const todos = TF.db.ocorrencias;
    const resumo = Object.entries(CONTEXTO).map(([k, c]) =>
        `<button type="button" class="resumo-ctx ctx-${k}" data-ctx="${k}">
            <strong>${todos.filter(o => o.contexto === k).length}</strong><span>${c.nome}</span></button>`).join('');

    app.innerHTML = `
    <section class="tela larga">
        <h2>Histórico de ocorrências</h2>
        <div class="resumo-ctxs">${resumo}</div>
        <div class="filtros filtros-multi">
            <div><label for="o-filtro">Status</label>
                <select id="o-filtro"><option value="">Todos</option>
                    ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
            <div><label for="o-ctx">Situação</label>
                <select id="o-ctx"><option value="">Todas</option>
                    ${Object.entries(CONTEXTO).map(([k, c]) => `<option value="${k}">${c.nome}</option>`).join('')}</select></div>
            <div><label for="o-agr">Produtor</label>
                <select id="o-agr"><option value="">Todos</option>
                    ${TF.agricultores().map(a => `<option value="${esc(a.id)}">${esc(a.nome)}</option>`).join('')}</select></div>
        </div>
        <p class="nota" id="o-total" aria-live="polite"></p>
        <ul class="lista-ocorrencias" id="o-lista"></ul>
    </section>`;

    if (agricultorId) $('#o-agr').value = agricultorId;

    const render = () => {
        const fs = $('#o-filtro').value, fc = $('#o-ctx').value, fa = $('#o-agr').value;
        const lista = todos
            .filter(o => (!fs || o.status === fs) && (!fc || o.contexto === fc) && (!fa || o.agricultorId === fa))
            .sort((a, b) => new Date(b.data) - new Date(a.data));
        $('#o-total').textContent = `${lista.length} de ${todos.length} ocorrências`;
        $$('.resumo-ctx').forEach(b => b.classList.toggle('ativo', b.dataset.ctx === fc));
        $('#o-lista').innerHTML = lista.length ? lista.map(o => {
            const a = TF.usuario(o.agricultorId), p = TF.propriedade(o.propriedadeId);
            return `<li><a href="#/ocorrencia/${o.id}" class="cartao ocorrencia-item">
                ${o.foto ? `<img src="${esc(o.foto)}" alt="" loading="lazy">` : `<div class="sem-foto" aria-hidden="true">${o.tipo === 'sos' ? '!' : o.origem === 'satelite' ? '◎' : '◉'}</div>`}
                <div class="ocorrencia-info">
                    <div class="linha-entre"><strong>${esc(tituloOcorrencia(o))}</strong>${chipStatus(o.status)}</div>
                    <small>${chipContexto(o.contexto)} ${o.id} · ${fmtData(o.data)}</small>
                    <small>${esc(a?.nome ?? 'Usuário removido')} · ${esc(p?.nome || p?.municipio || '')}</small>
                    ${o.descricao ? `<small class="descricao">“${esc(o.descricao)}”</small>` : ''}
                </div></a></li>`;
        }).join('') : '<li class="vazio">Nenhuma ocorrência com estes filtros.</li>';
    };
    ['#o-filtro', '#o-ctx', '#o-agr'].forEach(id => $(id).addEventListener('change', render));
    $$('.resumo-ctx').forEach(b => b.addEventListener('click', () => {
        $('#o-ctx').value = $('#o-ctx').value === b.dataset.ctx ? '' : b.dataset.ctx;
        render();
    }));
    render();
}

function tituloOcorrencia(o) {
    if (o.tipo === 'sos') return 'Pedido de ajuda (SOS)';
    if (o.origem === 'satelite') return 'Foco de calor por satélite';
    return `${o.ia.classe} · ${pct(o.ia.confianca)}`;
}

/* Detalhe e revisão de uma ocorrência */
function telaOcorrencia(id, coop) {
    const o = TF.ocorrencia(id);
    if (!o) return ir('ocorrencias');
    const a = TF.usuario(o.agricultorId), p = TF.propriedade(o.propriedadeId);
    const c = TF.condicoes(p);

    app.innerHTML = `
    <section class="tela larga">
        <a href="#/ocorrencias" class="link voltar">← Histórico</a>
        <div class="linha-entre"><h2>${o.id}</h2>${chipStatus(o.status)}</div>
        <p class="sub">${chipContexto(o.contexto)} ${esc(tituloOcorrencia(o))} · ${fmtData(o.data)}</p>

        <div class="duas-colunas">
            <div>
                <div class="cartao">
                    ${o.foto ? `<img class="foto-previa" src="${o.foto}" alt="Foto enviada pelo produtor">` : '<p class="vazio">Sem foto anexada.</p>'}
                    ${o.descricao ? `<blockquote>${esc(o.descricao)}</blockquote>` : ''}
                    <dl class="lista-def">
                        <dt>Produtor</dt><dd>${esc(a?.nome ?? 'Usuário removido')}${a?.telefone ? ` · ${esc(a.telefone)}` : ''}</dd>
                        <dt>Propriedade</dt><dd>${esc(p.nome || '—')} · ${esc(p.municipio)}/${esc(p.uf)}</dd>
                        <dt>Localização</dt><dd>${LOCAL[o.localOrigem]}${o.lat != null ? ` · ${o.lat}, ${o.lng}` : ''}</dd>
                    </dl>
                </div>
                ${o.ia ? `<div class="cartao">
                    <h3>Análise da imagem ${seloSimulado('Simulada')}</h3>
                    ${barra('Fogo visível', o.ia.indicadores.fogo)}
                    ${barra('Fumaça visível', o.ia.indicadores.fumaca)}
                    ${barra('Vegetação queimada', o.ia.indicadores.queimada)}
                    <p class="nota">A análise de imagem não confirma local, tamanho ou extensão do incêndio.</p>
                </div>` : ''}
                <div class="cartao">
                    <h3>Contexto ambiental ${seloSimulado()}</h3>
                    <dl class="lista-def">
                        <dt>Risco</dt><dd>${chipRisco(TF.classificarRisco(c))}</dd>
                        <dt>Tempo</dt><dd>${c.temperatura} °C · ${c.umidade}% · vento ${c.vento} km/h ${c.direcao}</dd>
                        <dt>Focos até 10 km</dt><dd>${c.focos.filter(f => f.distanciaKm <= 10).length}</dd>
                    </dl>
                </div>
            </div>

            <div>
                <div class="cartao">
                    <h3>Revisão</h3>
                    <div class="linha-botoes quebra">
                        <button type="button" class="btn btn-mini" data-status="analise">Em análise</button>
                        <button type="button" class="btn btn-mini" data-status="verificada">Verificar</button>
                        <button type="button" class="btn btn-mini perigo" data-status="rejeitada">Rejeitar</button>
                    </div>
                    <label for="r-nota">Nota de revisão</label>
                    <textarea id="r-nota" rows="3" placeholder="Ex.: confirmado por telefone com o produtor"></textarea>
                    <button type="button" class="btn btn-secundario" id="r-salvar">Adicionar nota</button>
                    <ul class="notas">${o.notas.map(n => `<li><small>${fmtData(n.data)} · ${esc(n.autor)}</small>${esc(n.texto)}</li>`).join('')}</ul>
                </div>

                <div class="cartao">
                    <h3>Comunicação às autoridades</h3>
                    ${o.comunicacao ? `
                        <p class="nota">Registrada em ${fmtData(o.comunicacao.data)} para <strong>${esc(o.comunicacao.destino)}</strong>.</p>
                        <pre class="rascunho">${esc(o.comunicacao.texto)}</pre>` : `
                        <p class="nota">O sistema prepara um rascunho. O envio é feito pela cooperativa pelos canais oficiais.</p>
                        <label for="r-destino">Destino</label>
                        <select id="r-destino">${DESTINOS.map(d => `<option>${d}</option>`).join('')}</select>
                        <label for="r-texto">Rascunho</label>
                        <textarea id="r-texto" rows="9">${esc(rascunho(o, a, p, c, coop))}</textarea>
                        <div class="linha-botoes">
                            <button type="button" class="btn btn-secundario" id="r-copiar">Copiar texto</button>
                            <button type="button" class="btn btn-primario" id="r-registrar">Registrar envio</button>
                        </div>`}
                </div>
            </div>
        </div>
    </section>`;

    $$('[data-status]').forEach(b => b.addEventListener('click', () => {
        o.status = b.dataset.status;
        o.notas.push({ data: new Date().toISOString(), autor: coop.nome, texto: `Status alterado para "${STATUS[o.status]}".` });
        salvarOuAvisar();
        avisar(`Ocorrência marcada como ${STATUS[o.status].toLowerCase()}.`);
        telaOcorrencia(id, coop);
    }));
    $('#r-salvar').addEventListener('click', () => {
        const texto = $('#r-nota').value.trim();
        if (!texto) return;
        o.notas.push({ data: new Date().toISOString(), autor: coop.nome, texto });
        salvarOuAvisar();
        telaOcorrencia(id, coop);
    });
    if (!o.comunicacao) {
        $('#r-copiar').addEventListener('click', () => copiar($('#r-texto').value));
        $('#r-registrar').addEventListener('click', () => {
            if (!confirm('Confirma que esta comunicação foi enviada pelos canais oficiais?')) return;
            o.comunicacao = { data: new Date().toISOString(), destino: $('#r-destino').value, texto: $('#r-texto').value };
            o.status = 'escalada';
            o.notas.push({ data: o.comunicacao.data, autor: coop.nome, texto: `Comunicação registrada: ${o.comunicacao.destino}.` });
            salvarOuAvisar();
            avisar('Comunicação registrada.');
            telaOcorrencia(id, coop);
        });
    }
}

function rascunho(o, a, p, c, coop) {
    return [
        `Assunto: Possível ocorrência de incêndio — ${p.municipio}/${p.uf}`,
        '',
        `A ${coop.cooperativa} informa um relato recebido em ${fmtData(o.data)} (ref. ${o.id}).`,
        '',
        `Local: ${p.nome || 'propriedade rural'}, ${p.municipio}/${p.uf}`,
        o.lat != null ? `Coordenadas: ${o.lat}, ${o.lng} (${LOCAL[o.localOrigem].toLowerCase()})`
                      : `Coordenadas da propriedade: ${p.lat}, ${p.lng} (local do relato não verificado)`,
        CONTEXTO[o.contexto] ? `Situação informada: ${CONTEXTO[o.contexto].nome}` : null,
        `Relato: ${o.descricao || tituloOcorrencia(o)}`,
        `Condições (estimativa): ${c.temperatura} °C, umidade ${c.umidade}%, vento ${c.vento} km/h ${c.direcao}.`,
        '',
        'Observação: informação preliminar, ainda não confirmada em campo.',
        `Contato: ${coop.nome} — ${coop.cooperativa}`,
    ].filter(linha => linha !== null).join('\n');
}

function copiar(texto) {
    navigator.clipboard?.writeText(texto)
        .then(() => avisar('Texto copiado.'))
        .catch(() => avisar('Não foi possível copiar. Selecione o texto manualmente.', 'erro'));
}

/* =========================================================
   10. ALERTAS
   ========================================================= */
function telaAlertas() {
    const alertas = TF.alertas();
    app.innerHTML = `
    <section class="tela larga">
        <h2>Alertas para revisão</h2>
        <p class="sub">Relatos de produtores pendentes e focos de satélite a até 10 km das propriedades.</p>
        <div class="faixa-aviso neutra">${seloSimulado('Focos simulados')} Um foco de calor não é um incêndio confirmado.
            Avalie as evidências antes de comunicar as autoridades.</div>
        <div class="cartao">${listaAlertas(alertas)}</div>
    </section>`;
    ligarAlertas();
}

function listaAlertas(alertas) {
    if (!alertas.length) return '<p class="vazio">Nenhum alerta pendente.</p>';
    return `<ul class="lista">${alertas.map(al => {
        const p = al.propriedade, a = al.agricultor;
        const onde = `${esc(p.nome || 'Propriedade')} · ${esc(p.municipio)}/${esc(p.uf)}`;
        if (al.tipo === 'relato') {
            const o = al.ocorrencia;
            return `<li class="alerta">
                <div>${o.origem === 'satelite' ? '<span class="tag tag-sat">Satélite · em análise</span>'
                       : `<span class="tag">${o.tipo === 'sos' ? 'Pedido de ajuda' : 'Relato do produtor'}</span>`}
                    <strong>${esc(tituloOcorrencia(o))}</strong>
                    <small>${chipContexto(o.contexto)} ${onde} · ${esc(a?.nome ?? '')} · ${fmtData(o.data)}</small></div>
                <a class="btn btn-mini" href="#/ocorrencia/${o.id}">Revisar</a></li>`;
        }
        const f = al.foco;
        return `<li class="alerta">
            <div><span class="tag tag-sat">Satélite ${f.satelite}</span>
                <strong>Foco de calor a ${String(f.distanciaKm).replace('.', ',')} km</strong>
                <small>${onde} · há ${f.horasAtras} h</small></div>
            <button type="button" class="btn btn-mini" data-foco="${esc(f.id)}" data-prop="${esc(p.id)}">Abrir ocorrência</button></li>`;
    }).join('')}</ul>`;
}

/* Um foco de satélite vira ocorrência "em análise" para entrar no fluxo de revisão */
function ligarAlertas() {
    $$('[data-foco]').forEach(b => b.addEventListener('click', () => {
        const p = TF.propriedade(b.dataset.prop);
        const f = TF.condicoes(p).focos.find(x => x.id === b.dataset.foco);
        const o = {
            id: TF.proximoId('OCO'), tipo: 'satelite', origem: 'satelite', agricultorId: p.agricultorId, propriedadeId: p.id,
            data: new Date().toISOString(), foto: null, lat: p.lat, lng: p.lng, localOrigem: 'propriedade',
            descricao: f ? `Foco detectado pelo satélite ${f.satelite} a ${f.distanciaKm} km da propriedade, há ${f.horasAtras} h.` : 'Foco de satélite.',
            ia: null, status: 'analise', notas: [], comunicacao: null,
        };
        TF.db.ocorrencias.push(o);
        TF.db.focosRevisados.push(b.dataset.foco);
        salvarOuAvisar();
        ir(`ocorrencia/${o.id}`);
    }));
}

/* =========================================================
   11. RELATÓRIOS
   ========================================================= */
function telaRelatorios(_, coop) {
    app.innerHTML = `
    <section class="tela larga">
        <div class="linha-entre"><h2>Relatórios</h2>
            <button type="button" class="btn btn-mini" id="rel-imprimir">Imprimir / PDF</button></div>
        <div class="filtros">
            <label for="rel-periodo">Período</label>
            <select id="rel-periodo">
                <option value="7">Últimos 7 dias</option>
                <option value="30" selected>Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="0">Todo o período</option>
            </select>
        </div>
        <div id="rel-corpo"></div>
    </section>`;

    const render = () => {
        const dias = Number($('#rel-periodo').value);
        const desde = dias ? Date.now() - dias * 86400000 : 0;
        const lista = TF.db.ocorrencias.filter(o => new Date(o.data).getTime() >= desde);
        const conta = s => lista.filter(o => o.status === s).length;
        const area = TF.db.propriedades.reduce((s, p) => s + (Number(p.hectares) || 0), 0);
        const comFocos = TF.db.propriedades.filter(p => TF.condicoes(p).focos.some(f => f.distanciaKm <= 10)).length;
        const comunicacoes = lista.filter(o => o.comunicacao);

        // Últimos 6 meses
        const meses = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
            return { chave: d.toISOString().slice(0, 7), rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }) };
        });
        const porMes = meses.map(m => TF.db.ocorrencias.filter(o => o.data.slice(0, 7) === m.chave).length);
        const max = Math.max(...porMes, 1);

        $('#rel-corpo').innerHTML = `
        <p class="sub">${esc(coop.cooperativa)} · gerado em ${fmtData(new Date())}</p>
        <div class="kpis">
            ${kpi('Relatos no período', lista.length)}
            ${kpi('Área monitorada', `${fmtNum(area)} ha`)}
            ${kpi('Propriedades com foco ≤ 10 km', comFocos)}
            ${kpi('Comunicações às autoridades', comunicacoes.length)}
        </div>
        <div class="duas-colunas">
            <div class="cartao">
                <h3>Situação dos relatos</h3>
                <table class="tabela">
                    <thead><tr><th>Categoria</th><th>Qtd.</th></tr></thead>
                    <tbody>
                        <tr><td>Confirmados pela cooperativa (verificados + escalados)</td><td>${conta('verificada') + conta('escalada')}</td></tr>
                        <tr><td>Não verificados (enviados + em análise)</td><td>${conta('enviada') + conta('analise')}</td></tr>
                        <tr><td>Rejeitados</td><td>${conta('rejeitada')}</td></tr>
                        <tr><td>Originados de foco de satélite</td><td>${lista.filter(o => o.origem === 'satelite').length}</td></tr>
                        <tr><td>Pedidos de ajuda (SOS)</td><td>${lista.filter(o => o.tipo === 'sos').length}</td></tr>
                        ${Object.entries(CONTEXTO).map(([k, c]) =>
                            `<tr><td>Situação: ${c.nome}</td><td>${lista.filter(o => o.contexto === k).length}</td></tr>`).join('')}
                    </tbody>
                </table>
                <p class="nota">Relatos não verificados e detecções de satélite não são incêndios confirmados.</p>
            </div>
            <div class="cartao">
                <h3>Relatos por mês</h3>
                <div class="grafico" role="img" aria-label="Relatos por mês: ${meses.map((m, i) => `${m.rotulo} ${porMes[i]}`).join(', ')}">
                    ${porMes.map((v, i) => `<div class="coluna"><b>${v}</b><i style="height:${Math.max(3, (v / max) * 100)}%"></i><span>${meses[i].rotulo}</span></div>`).join('')}
                </div>
            </div>
        </div>
        <div class="cartao">
            <h3>Registro de comunicações</h3>
            ${comunicacoes.length ? `<table class="tabela">
                <thead><tr><th>Data</th><th>Ocorrência</th><th>Destino</th></tr></thead>
                <tbody>${comunicacoes.map(o => `<tr><td>${fmtData(o.comunicacao.data)}</td><td><a href="#/ocorrencia/${o.id}">${o.id}</a></td><td>${esc(o.comunicacao.destino)}</td></tr>`).join('')}</tbody>
            </table>` : '<p class="vazio">Nenhuma comunicação registrada no período.</p>'}
        </div>`;
    };
    $('#rel-periodo').addEventListener('change', render);
    $('#rel-imprimir').addEventListener('click', () => window.print());
    render();
}

/* ---------- Logo (marca genérica: horizonte sobre a terra) ---------- */
const LOGO_SVG = `<svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <path d="M7 28h34M10 34h28M15 40h18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M24 9c4 4 5 8 2 12-1-2-3-3-4-3 1 3 0 5-2 6-2-4 0-10 4-15z" fill="currentColor"/>
</svg>`;

/* ---------- Início ---------- */
TF.carregar();
$('#marca-logo').innerHTML = LOGO_SVG;
window.addEventListener('hashchange', rotear);
rotear();
