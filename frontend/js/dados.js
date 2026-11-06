/* =========================================================
   Terra Firma — camada de dados do protótipo
   ---------------------------------------------------------
   Tudo fica no localStorage DESTE navegador, apenas para a
   demonstração do hackathon. Em produção: API com senha em
   hash, papéis verificados no back-end, HTTPS e LGPD.
   Dados ambientais e análise de imagem são SIMULADOS.
   ========================================================= */

const TF = (() => {
    const CHAVE = 'terrafirma.v3'; // v2: exemplos com fotos e contexto do fogo
    let db = null;

    /* ---------- Persistência ---------- */
    function carregar() {
        try { db = JSON.parse(localStorage.getItem(CHAVE)); } catch { db = null; }
        if (!db || !Array.isArray(db.usuarios)) { db = semear(); salvar(); }
        return db;
    }
    function salvar() {
        try { localStorage.setItem(CHAVE, JSON.stringify(db)); return true; }
        catch { return false; } // cota cheia ou modo privado
    }
    function reiniciar() {
        try { localStorage.removeItem(CHAVE); } catch { /* ignora */ }
        carregar();
    }

    function proximoId(prefixo) {
        db.seq[prefixo] = (db.seq[prefixo] || 0) + 1;
        return `${prefixo}-${String(db.seq[prefixo]).padStart(4, '0')}`;
    }

    /* Senha provisória: sem caracteres ambíguos (0/O, 1/l/I) */
    function gerarSenha(tamanho = 10) {
        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const v = crypto.getRandomValues(new Uint32Array(tamanho));
        return Array.from(v, n => chars[n % chars.length]).join('');
    }

    /* ---------- Dados de demonstração ---------- */
    function semear() {
        const agora = Date.now();
        const h = 3600000, dia = 24 * h;
        const quando = ms => new Date(agora - ms).toISOString();
        const COOP = 'Cooperativa Agrícola Vale Verde';
        const nota = (ms, texto, autor = 'Cooperativa') => ({ data: quando(ms), autor, texto });
        const ia = (classe, fogo, fumaca, queimada) => ({
            classe, confianca: Math.max(fogo, fumaca, queimada), indicadores: { fogo, fumaca, queimada } });

        // Ocorrência de exemplo. Fotos em img/ocorrencias/ (recortes do kit de identidade visual)
        const oc = (id, agr, prp, ms, o) => ({
            id, tipo: 'foto', origem: 'agricultor', agricultorId: agr, propriedadeId: prp, data: quando(ms),
            foto: o.foto ? `img/ocorrencias/${o.foto}.jpg` : null, lat: o.lat ?? null, lng: o.lng ?? null,
            localOrigem: o.local ?? 'gps', contexto: o.contexto, descricao: o.descricao, ia: o.ia,
            status: o.status, notas: o.notas ?? [], comunicacao: o.comunicacao ?? null,
        });

        return {
            seq: { AGR: 3, PRP: 3, OCO: 8 },
            sessao: null,
            focosRevisados: [],
            usuarios: [
                { id: 'COOP-0001', usuario: 'cooperativa', senha: 'coop123', perfil: 'cooperativa',
                  nome: 'Representante da Cooperativa', cooperativa: COOP, trocarSenha: false },
                { id: 'AGR-0001', usuario: 'ana.souza', senha: 'demo1234', perfil: 'agricultor',
                  nome: 'Ana Souza', cooperativa: COOP, telefone: '(65) 99999-0001', propriedadeId: 'PRP-0001', trocarSenha: false },
                { id: 'AGR-0002', usuario: 'jose.pereira', senha: 'demo1234', perfil: 'agricultor',
                  nome: 'José Pereira', cooperativa: COOP, telefone: '(62) 99999-0002', propriedadeId: 'PRP-0002', trocarSenha: false },
                { id: 'AGR-0003', usuario: 'raimundo.costa', senha: 'demo1234', perfil: 'agricultor',
                  nome: 'Raimundo Costa', cooperativa: COOP, telefone: '', propriedadeId: 'PRP-0003', trocarSenha: false },
            ],
            propriedades: [
                { id: 'PRP-0001', agricultorId: 'AGR-0001', nome: 'Sítio Boa Esperança', municipio: 'Chapada dos Guimarães',
                  uf: 'MT', lat: -15.4601, lng: -55.7498, hectares: 42, producao: 'Soja e milho' },
                { id: 'PRP-0002', agricultorId: 'AGR-0002', nome: 'Fazenda Três Lagoas', municipio: 'Alto Paraíso de Goiás',
                  uf: 'GO', lat: -14.1326, lng: -47.5104, hectares: 18, producao: 'Gado leiteiro' },
                { id: 'PRP-0003', agricultorId: 'AGR-0003', nome: 'Sítio Açaizal', municipio: 'Igarapé-Miri',
                  uf: 'PA', lat: -1.9753, lng: -48.9596, hectares: 8, producao: 'Açaí e mandioca' },
            ],
            ocorrencias: [
                // Fotos reais do Cerrado (Wikimedia Commons, Agência Brasil, CC BY / CC BY-SA).
                // Créditos completos em identidade-visual/fotos/creditos.md

                // ---- Pós-incêndio ----
                oc('OCO-0001', 'AGR-0001', 'PRP-0001', 12 * dia, {
                    contexto: 'pos', foto: 'pos-rescaldo-fumaca', lat: -15.4588, lng: -55.7521, status: 'verificada',
                    descricao: 'O fogo passou de madrugada e queimou o pasto da divisa. Ainda sai fumaça do chão.',
                    ia: ia('Possível área queimada', 0.08, 0.31, 0.79),
                    notas: [nota(12 * dia - 2 * h, 'Produtora confirmou por telefone: cerca de 3 ha de pasto queimados, sem feridos.'),
                            nota(11 * dia, 'Orientado rescaldo com enxada e água onde ainda sai fumaça.')] }),
                oc('OCO-0002', 'AGR-0002', 'PRP-0002', 2 * dia, {
                    contexto: 'pos', foto: 'pos-cerrado-queimado', local: 'propriedade', lat: -14.1326, lng: -47.5104, status: 'analise',
                    descricao: 'Amanheceu tudo preto no cerrado atrás do curral. Não vi o fogo, só a área queimada.',
                    ia: ia('Possível área queimada', 0.03, 0.05, 0.71),
                    notas: [nota(2 * dia - 3 * h, 'Aguardando retorno do produtor para saber a extensão da área.')] }),
                oc('OCO-0007', 'AGR-0003', 'PRP-0003', 90 * 60000, {
                    contexto: 'pos', foto: 'pos-arara-cinzas', local: 'nao_verificada', status: 'enviada',
                    descricao: 'Depois do fogo ficou tudo cinza perto da roça. Tem arara procurando comida no meio das cinzas.',
                    ia: ia('Possível área queimada', 0.02, 0.06, 0.68) }),

                // ---- Incêndio em andamento ----
                oc('OCO-0003', 'AGR-0002', 'PRP-0002', 6 * dia, {
                    contexto: 'andamento', foto: 'andamento-frente-fumaca', lat: -14.1290, lng: -47.5150, status: 'escalada',
                    descricao: 'Frente de fogo grande com muita fumaça, vindo com o vento para o lado da lavoura.',
                    ia: ia('Possível fogo', 0.71, 0.83, 0.20),
                    notas: [nota(6 * dia - 20 * 60000, 'Confirmado com dois vizinhos. Foco também detectado por satélite.'),
                            nota(6 * dia - 30 * 60000, 'Comunicação registrada: Corpo de Bombeiros (193).')],
                    comunicacao: { data: quando(6 * dia - 30 * 60000), destino: 'Corpo de Bombeiros (193)',
                                   texto: 'Frente de fogo em área de cerrado próxima à Fazenda Três Lagoas, Alto Paraíso de Goiás/GO. '
                                        + 'Coordenadas -14.1290, -47.5150. Vento em direção à lavoura. Sem pessoas em risco no momento.' } }),
                oc('OCO-0004', 'AGR-0001', 'PRP-0001', 7 * h, {
                    contexto: 'andamento', foto: 'andamento-chamas-cerrado', lat: -15.4622, lng: -55.7470, status: 'analise',
                    descricao: 'Fogo alto no capim seco perto da estrada, subindo nas árvores. Já liguei 193.',
                    ia: ia('Possível fogo', 0.93, 0.47, 0.24),
                    notas: [nota(6 * h, 'Produtora informou que ligou 193. Acompanhando.')] }),

                // ---- Início do foco ----
                oc('OCO-0005', 'AGR-0003', 'PRP-0003', 4 * dia, {
                    contexto: 'inicio', foto: 'inicio-fogo-baixo-estrada', lat: -1.9741, lng: -48.9610, status: 'verificada',
                    descricao: 'Fogo baixo começando no capim da beira do ramal. Apagamos com abafador antes de entrar no mato.',
                    ia: ia('Possível fumaça', 0.22, 0.64, 0.35),
                    notas: [nota(4 * dia - 3 * h, 'Confirmado. Foco controlado pelo próprio produtor. Orientado a manter aceiro.')] }),
                oc('OCO-0006', 'AGR-0002', 'PRP-0002', 3 * h, {
                    contexto: 'inicio', foto: 'inicio-coluna-fumaca', local: 'manual', lat: -14.1350, lng: -47.5080, status: 'enviada',
                    descricao: 'Coluna de fumaça subindo atrás da serra, do lado do pasto do vizinho. Ainda não vejo chama.',
                    ia: ia('Possível fumaça', 0.01, 0.72, 0.03) }),

                // ---- Pedido de ajuda ----
                { ...oc('OCO-0008', 'AGR-0001', 'PRP-0001', 35 * 60000, {
                    contexto: 'andamento', lat: -15.4575, lng: -55.7530, status: 'enviada', ia: null,
                    descricao: 'Pedido de ajuda enviado pela tela de emergência.' }), tipo: 'sos' },
            ],
        };
    }

    /* ---------- Consultas ---------- */
    const usuarioAtual = () => db.usuarios.find(u => u.id === db.sessao) ?? null;
    const usuario = id => db.usuarios.find(u => u.id === id);
    const propriedade = id => db.propriedades.find(p => p.id === id);
    const agricultores = () => db.usuarios.filter(u => u.perfil === 'agricultor');
    const ocorrencia = id => db.ocorrencias.find(o => o.id === id);

    /* ---------- Simulação ambiental (determinística por propriedade e hora) ---------- */
    function rng(semente) {
        let h = 2166136261;
        for (const c of semente) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
        return () => {
            h += 0x6D2B79F5;
            let t = h;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function condicoes(prop) {
        const obs = new Date();
        obs.setMinutes(0, 0, 0);
        const r = rng(prop.id + obs.toISOString());
        const satelites = ['AQUA', 'TERRA', 'NOAA-20', 'SNPP'];
        const nFocos = Math.floor(r() * 4);
        const focos = Array.from({ length: nFocos }, (_, i) => ({
            id: `${prop.id}-${obs.toISOString().slice(0, 13)}-${i}`,
            distanciaKm: +(0.8 + r() * 24).toFixed(1),
            satelite: satelites[Math.floor(r() * satelites.length)],
            horasAtras: 1 + Math.floor(r() * 20),
        })).sort((a, b) => a.distanciaKm - b.distanciaKm);

        // Histórico mensal de focos: sazonalidade da seca (jul–out)
        const rh = rng(prop.id + 'historico');
        const sazonal = [2, 2, 3, 3, 5, 9, 18, 30, 34, 22, 8, 3];
        const historico = sazonal.map(base => Math.round(base * (0.6 + rh() * 0.8)));

        return {
            temperatura: +(24 + r() * 14).toFixed(1),
            umidade: Math.round(12 + r() * 48),
            vento: Math.round(3 + r() * 27),
            direcao: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.floor(r() * 8)],
            diasSemChuva: Math.floor(r() * 40),
            focos,
            historico,
            observadoEm: obs,
            simulado: true,
        };
    }

    /**
     * Classifica o risco de incêndio a partir das condições.
     * Deve retornar um dos níveis: 'Baixo' | 'Moderado' | 'Alto' | 'Muito alto'.
     * A tela mostra o nível e o texto de CRITERIO_RISCO como critério documentado.
     */
    function classificarRisco(c) {
        // TODO(human): definir o critério de risco (umidade, temperatura, vento, dias sem chuva, focos próximos)
        if (c.umidade < 20) return 'Muito alto';
        if (c.umidade < 30) return 'Alto';
        if (c.umidade < 45) return 'Moderado';
        return 'Baixo';
    }
    const CRITERIO_RISCO = 'Critério ilustrativo baseado apenas na umidade relativa do ar (<20% muito alto; <30% alto; <45% moderado).';

    /* ---------- Análise de imagem SIMULADA (heurística de cores, não é IA) ---------- */
    function analisarImagem(canvas) {
        const pequeno = document.createElement('canvas');
        pequeno.width = 64; pequeno.height = 64;
        const ctx = pequeno.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(canvas, 0, 0, 64, 64);
        const px = ctx.getImageData(0, 0, 64, 64).data;
        let fogo = 0, fumaca = 0, queimada = 0;
        const total = px.length / 4;
        for (let i = 0; i < px.length; i += 4) {
            const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
            const max = Math.max(r, g, b), min = Math.min(r, g, b), media = (r + g + b) / 3;
            if (r > 170 && r > g * 1.15 && g > 60 && b < 110) fogo++;           // laranja/amarelo quente
            else if (max - min < 22 && media > 110 && media < 225) fumaca++;  // cinza claro pouco saturado
            else if (media < 45) queimada++;                                  // muito escuro (cinzas)
        }
        const ind = {
            fogo: Math.min(1, (fogo / total) * 4),
            fumaca: Math.min(1, (fumaca / total) * 2),
            queimada: Math.min(1, (queimada / total) * 2.5),
        };
        const [chave, valor] = Object.entries(ind).sort((a, b) => b[1] - a[1])[0];
        const nomes = { fogo: 'Possível fogo', fumaca: 'Possível fumaça', queimada: 'Possível área queimada' };
        const classe = valor < 0.25 ? 'Nenhum indício visual claro' : nomes[chave];
        // Limite de 95%: uma heurística nunca deve exibir certeza total
        const r2 = n => Math.round(Math.min(n, 0.95) * 100) / 100;
        return { classe, confianca: r2(valor < 0.25 ? 1 - valor : valor),
                 indicadores: { fogo: r2(ind.fogo), fumaca: r2(ind.fumaca), queimada: r2(ind.queimada) } };
    }

    /* Reduz a foto para caber no localStorage (~40 KB) */
    function prepararFoto(arquivo) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(arquivo);
            img.onload = () => {
                const escala = Math.min(1, 640 / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * escala);
                c.height = Math.round(img.height * escala);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                resolve({ canvas: c, dataUrl: c.toDataURL('image/jpeg', 0.6) });
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
            img.src = url;
        });
    }

    /* ---------- Alertas para a cooperativa ---------- */
    function alertas() {
        const lista = [];
        for (const o of db.ocorrencias) {
            if (o.status === 'enviada' || o.status === 'analise') {
                lista.push({ tipo: 'relato', data: o.data, ocorrencia: o,
                             propriedade: propriedade(o.propriedadeId), agricultor: usuario(o.agricultorId) });
            }
        }
        for (const p of db.propriedades) {
            for (const f of condicoes(p).focos) {
                if (f.distanciaKm <= 10 && !db.focosRevisados.includes(f.id)) {
                    lista.push({ tipo: 'satelite', data: new Date(Date.now() - f.horasAtras * 3600000).toISOString(),
                                 foco: f, propriedade: p, agricultor: usuario(p.agricultorId) });
                }
            }
        }
        return lista.sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    return {
        get db() { return db; }, carregar, salvar, reiniciar, proximoId, gerarSenha,
        usuarioAtual, usuario, propriedade, agricultores, ocorrencia,
        condicoes, classificarRisco, CRITERIO_RISCO, analisarImagem, prepararFoto, alertas,
    };
})();
