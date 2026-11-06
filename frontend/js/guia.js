/* =========================================================
   Terra Firma — Guia: instruções de uso, emergência e boas práticas
   ---------------------------------------------------------
   Conteúdo separado da lógica para o time editar os textos.
   Cada item: { titulo, itens: [...] } ou { titulo, texto }.
   Orientações gerais: devem ser revisadas com o Corpo de
   Bombeiros / Defesa Civil local antes do uso em produção.
   ========================================================= */

const GUIA = {
    uso: {
        titulo: 'Como usar',
        icone: '?',
        intro: 'Passo a passo das principais telas do Terra Firma.',
        grupos: [
            {
                nome: 'Para o produtor',
                perfil: 'agricultor',
                secoes: [
                    { titulo: 'Entrar pela primeira vez', itens: [
                        'Use o usuário e a senha provisória que a cooperativa entregou.',
                        'O app vai pedir uma senha nova, com pelo menos 8 caracteres. Não use seu nome nem sua data de nascimento.',
                        'Esqueceu a senha? Peça uma nova para a cooperativa.',
                    ]},
                    { titulo: 'Registrar uma foto', itens: [
                        'Toque em "Registrar foto" e fotografe a fumaça, o fogo ou a área queimada, sempre de longe e em local seguro.',
                        'Quando o app pedir, permita o uso da localização. Isso mostra à cooperativa onde está o problema.',
                        'Sem GPS? Toque em "Usar o local da propriedade" ou digite as coordenadas.',
                        'Escreva o que está vendo (opcional) e toque em "Enviar para análise".',
                        'O resultado da análise é preliminar. A cooperativa confere cada registro.',
                    ]},
                    { titulo: 'Entender o painel ambiental', itens: [
                        'O nível de risco vai de Baixo a Muito alto. Quanto mais seco, quente e com vento, maior o risco.',
                        'Foco de calor é uma detecção de satélite. Não quer dizer que existe incêndio confirmado.',
                        'Veja sempre o horário da informação. Dados com o selo "simulado" são apenas demonstração.',
                    ]},
                    { titulo: 'Pedir ajuda (SOS)', itens: [
                        'Em perigo, ligue 193 (Bombeiros). A ligação é gratuita.',
                        'O botão "Avisar a cooperativa" manda sua localização para ela acompanhar.',
                        'O app não chama o socorro sozinho: a ligação precisa ser feita por você.',
                    ]},
                    { titulo: 'Acompanhar seus registros', itens: [
                        'Na tela de início aparecem seus últimos registros e a situação de cada um:',
                        'Enviada: chegou à cooperativa. Em análise: está sendo conferida. Verificada: confirmada. Rejeitada: não era incêndio. Escalada: autoridades foram avisadas.',
                    ]},
                    { titulo: 'Sinal fraco ou sem internet', itens: [
                        'Se o envio falhar, o app avisa. Tente de novo quando tiver sinal.',
                        'Em emergência, não espere a internet: ligue 193. Ligações de emergência não precisam de crédito.',
                    ]},
                ],
            },
            {
                nome: 'Para a cooperativa',
                perfil: 'cooperativa',
                secoes: [
                    { titulo: 'Cadastrar um produtor', itens: [
                        'Em "Produtores", preencha nome, usuário, município, UF e a localização da propriedade.',
                        'O ID e a senha provisória são gerados automaticamente e aparecem uma única vez. Entregue os dois ao produtor.',
                        'Não peça CPF para o acesso. Colete só o necessário (LGPD).',
                        'Use "Nova senha" se o produtor esquecer a dele.',
                    ]},
                    { titulo: 'Revisar ocorrências', itens: [
                        'Em "Ocorrências", filtre por status e abra cada registro.',
                        'Confira a foto, o local e o contexto ambiental. Se possível, confirme por telefone com o produtor.',
                        'Marque como Em análise, Verificada ou Rejeitada e registre uma nota explicando a decisão.',
                    ]},
                    { titulo: 'Alertas de satélite', itens: [
                        'A aba "Alertas" lista relatos pendentes e focos de calor a até 10 km das propriedades.',
                        'Use "Abrir ocorrência" para colocar um foco de satélite no fluxo de revisão.',
                    ]},
                    { titulo: 'Comunicar as autoridades', itens: [
                        'Na ocorrência, escolha o destino e revise o rascunho que o sistema prepara.',
                        'Envie pelos canais oficiais (telefone, e-mail ou sistema do órgão) e depois toque em "Registrar envio".',
                        'Em risco imediato à vida, ligue 193 antes de qualquer outra coisa.',
                    ]},
                    { titulo: 'Relatórios', itens: [
                        'Escolha o período e use "Imprimir / PDF" para gerar o relatório.',
                        'O relatório separa relatos confirmados, não verificados e detecções de satélite.',
                    ]},
                ],
            },
        ],
    },

    emergencia: {
        titulo: 'Emergência',
        icone: '!',
        intro: 'Orientações gerais de segurança. Siga sempre as instruções do Corpo de Bombeiros e da Defesa Civil.',
        telefones: [
            { numero: '193', nome: 'Corpo de Bombeiros', destaque: true },
            { numero: '199', nome: 'Defesa Civil' },
            { numero: '192', nome: 'SAMU' },
        ],
        ao_ligar: ['Município e nome da propriedade ou comunidade',
                   'Um ponto de referência e o caminho de acesso',
                   'Tamanho aproximado do fogo e para onde está indo',
                   'Se há pessoas, casas ou animais em risco'],
        secoes: [
            { titulo: 'Se você vê fumaça ou fogo', itens: [
                'Mantenha a calma e afaste-se para um local seguro.',
                'Ligue 193 e passe as informações acima.',
                'Avise a família, os vizinhos e a cooperativa (pelo botão "Avisar a cooperativa").',
                'Só tente apagar um foco bem pequeno e no começo, com abafador ou água, e sempre com um caminho de fuga livre atrás de você.',
                'Nunca tente combater um fogo grande sozinho.',
            ]},
            { titulo: 'Se o fogo está chegando perto', itens: [
                'Saia cedo. Não espere o fogo chegar para decidir.',
                'Vá na direção contrária ao vento e à fumaça.',
                'Evite subir morros e encostas: o fogo sobe mais rápido do que desce.',
                'Evite grotas e vales estreitos, onde o fogo e a fumaça se concentram.',
                'Leve documentos, remédios, água e o celular carregado.',
                'Deixe a estrada livre para os bombeiros e outros moradores.',
            ]},
            { titulo: 'Se ficar cercado pelo fogo', itens: [
                'Procure um local sem vegetação: área onde o fogo já passou e não há mais chamas, estrada de terra, terreno arado ou beira de água.',
                'Fique abaixado, onde a fumaça é menor. Cubra nariz e boca com um pano úmido.',
                'Cubra a pele com roupas de algodão ou lã. Tecido sintético pode derreter no corpo.',
                'Em veículo: estacione longe da vegetação, feche os vidros, abaixe-se abaixo da linha das janelas e cubra-se com um cobertor de lã ou algodão.',
            ]},
            { titulo: 'Fumaça e queimaduras', itens: [
                'Fumaça: vá para o ar livre e limpo. Falta de ar, tontura, dor de cabeça forte ou confusão: ligue 192.',
                'Queimadura: resfrie com água corrente em temperatura ambiente por cerca de 20 minutos.',
                'Retire anéis, relógios e roupas apertadas perto da queimadura, se não estiverem grudados na pele.',
                'Não use gelo, pasta de dente, manteiga, óleo ou pó de café. Não estoure bolhas.',
                'Cubra com pano limpo ou filme plástico e procure atendimento. Queimaduras grandes, no rosto, nas mãos ou nas partes íntimas: ligue 192.',
            ]},
            { titulo: 'Animais, casa e equipamentos', itens: [
                'Se der tempo e for seguro, abra porteiras para os animais poderem fugir. Não volte para buscá-los se houver risco.',
                'Afaste-se de fios elétricos caídos e de cercas elétricas. Não jogue água em rede elétrica.',
                'Afaste botijões de gás e combustível do caminho do fogo, se for seguro.',
            ]},
            { titulo: 'Depois do incêndio', itens: [
                'Só volte quando os bombeiros ou a Defesa Civil liberarem a área.',
                'Cuidado com brasas escondidas, tocos queimando por dentro e árvores enfraquecidas que podem cair.',
                'Registre fotos dos danos no app e avise a cooperativa.',
                'Procure atendimento se tiver tosse, falta de ar ou irritação nos olhos que não passa.',
            ]},
        ],
    },

    praticas: {
        titulo: 'Boas práticas',
        icone: '✓',
        intro: 'Prevenir é mais barato e mais seguro do que combater. Pequenas rotinas protegem a propriedade e a vizinhança.',
        secoes: [
            { titulo: 'Aceiros e limpeza', itens: [
                'Mantenha aceiros, que são faixas de terra sem vegetação, em volta de casas, galpões, cercas, pastos e plantações.',
                'Use pelo menos 3 metros de largura, e mais em pasto alto ou área de vento forte. Peça orientação técnica para a sua região.',
                'Faça e limpe os aceiros antes do período seco.',
                'Tire capim seco, galhos e lixo de perto das construções.',
            ]},
            { titulo: 'Uso do fogo na propriedade', itens: [
                'Queimar na roça ou no pasto exige autorização do órgão ambiental do seu estado.',
                'Respeite os períodos de proibição de queimadas definidos pelo governo, principalmente na seca.',
                'Se a queima for autorizada, faça com aceiro pronto, gente suficiente, água e ferramentas por perto. Escolha um horário com menos vento e calor.',
                'Nunca deixe uma queima sozinha, nem por pouco tempo.',
                'Soltar balão é crime ambiental e uma causa comum de incêndio.',
            ]},
            { titulo: 'Alternativas à queima', itens: [
                'Incorpore os restos da colheita ao solo ou deixe como cobertura (plantio direto).',
                'Faça compostagem com folhas, palha e esterco.',
                'Use roçada mecânica ou manual para limpar a área.',
                'A cooperativa e a assistência técnica (ATER) podem orientar sobre o manejo sem fogo.',
            ]},
            { titulo: 'Dias de risco alto', itens: [
                'Regra prática "30-30-30": umidade do ar abaixo de 30%, temperatura acima de 30 °C e vento forte indicam risco muito alto.',
                'Nesses dias, não faça nenhum tipo de queima e redobre a atenção.',
                'Confira o painel ambiental do app todos os dias no período seco.',
            ]},
            { titulo: 'Prepare a propriedade', itens: [
                'Tenha ferramentas à mão: abafadores, enxadas, rastelos, bomba costal e caixas d’água cheias.',
                'Combine com a família um plano: por onde sair, onde se encontrar e quem leva o quê.',
                'Guarde documentos e remédios em um lugar fácil de pegar.',
                'Mantenha o celular carregado e os números de emergência salvos.',
            ]},
            { titulo: 'Combine com vizinhos e a cooperativa', itens: [
                'Troque telefones com os vizinhos e crie um grupo de aviso.',
                'Converse sobre formar uma brigada comunitária e peça treinamento à Defesa Civil, aos bombeiros ou ao Prevfogo.',
                'Avise antes se for fazer uma queima autorizada.',
            ]},
            { titulo: 'Use o Terra Firma a seu favor', itens: [
                'Registre uma foto assim que vir fumaça: quanto mais cedo, mais tempo para agir.',
                'Mantenha o cadastro da propriedade atualizado com a cooperativa.',
                'Ensine o uso do app para outras pessoas da família.',
            ]},
        ],
    },
};

const ABAS_GUIA = [['uso', GUIA.uso], ['emergencia', GUIA.emergencia], ['boas-praticas', GUIA.praticas]];

function telaGuia(param, u) {
    const ativa = ABAS_GUIA.some(([id]) => id === param) ? param : (u ? 'uso' : 'emergencia');
    const conteudo = ABAS_GUIA.find(([id]) => id === ativa)[1];

    const secao = (s, aberta) => `
        <details class="cartao guia-secao" ${aberta ? 'open' : ''}>
            <summary>${esc(s.titulo)}</summary>
            <ul>${s.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        </details>`;

    let corpo = '';
    if (ativa === 'uso') {
        // O grupo do perfil logado aparece primeiro
        const grupos = [...conteudo.grupos].sort((a, b) => (b.perfil === u?.perfil) - (a.perfil === u?.perfil));
        corpo = grupos.map((g, gi) => `
            <h3 class="guia-grupo">${esc(g.nome)}</h3>
            ${g.secoes.map((s, i) => secao(s, gi === 0 && i === 0)).join('')}`).join('');
    } else if (ativa === 'emergencia') {
        corpo = `
            <div class="guia-telefones">
                ${conteudo.telefones.map(t => `
                    <a class="guia-tel ${t.destaque ? 'destaque' : ''}" href="tel:${t.numero}">
                        <strong>${t.numero}</strong><span>${esc(t.nome)}</span></a>`).join('')}
            </div>
            <div class="cartao guia-ligar">
                <h3>Ao ligar, informe</h3>
                <ol>${conteudo.ao_ligar.map(i => `<li>${esc(i)}</li>`).join('')}</ol>
            </div>
            ${conteudo.secoes.map((s, i) => secao(s, i === 0)).join('')}`;
    } else {
        corpo = conteudo.secoes.map((s, i) => secao(s, i === 0)).join('');
    }

    app.innerHTML = `
    <section class="tela guia">
        ${u ? '' : '<a href="#/login" class="link voltar">← Voltar para entrar</a>'}
        <div class="linha-entre">
            <h2>Guia</h2>
            <button type="button" class="btn btn-mini" id="guia-imprimir">Imprimir</button>
        </div>
        <nav class="guia-abas" aria-label="Seções do guia">
            ${ABAS_GUIA.map(([id, c]) => `
                <a href="#/guia/${id}" class="${id === ativa ? 'ativa' : ''} ${id === 'emergencia' ? 'aba-emergencia' : ''}"
                   ${id === ativa ? 'aria-current="page"' : ''}>
                    <span aria-hidden="true">${c.icone}</span>${c.titulo}</a>`).join('')}
        </nav>
        <p class="sub ${ativa === 'emergencia' ? 'guia-aviso' : ''}">${esc(conteudo.intro)}</p>
        ${corpo}
        <div class="guia-acoes">
            <button type="button" class="btn btn-texto" id="guia-abrir-tudo">Abrir todas as seções</button>
        </div>
    </section>`;

    $('#guia-imprimir').addEventListener('click', () => {
        $$('.guia-secao').forEach(d => { d.open = true; });
        window.print();
    });
    $('#guia-abrir-tudo').addEventListener('click', e => {
        const abrir = $$('.guia-secao').some(d => !d.open);
        $$('.guia-secao').forEach(d => { d.open = abrir; });
        e.target.textContent = abrir ? 'Fechar todas as seções' : 'Abrir todas as seções';
    });
}
