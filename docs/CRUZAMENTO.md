# Cruzamento de evidências — Fase 3 / contrato backend 2.1.0

## Fluxo implementado

Novos incidentes com coordenadas autorizadas consultam `dados-api /v1/context` **pelas coordenadas do incidente**. Não são substituídas pelo ponto da propriedade. Sem coordenadas, o relato continua aceito, a consulta não ocorre e o snapshot registra `no_location`; a consistência fica `unavailable`.

Após autenticação, validação, autorização e deduplicação, o backend executa visão e consulta ambiental, calcula evidência e grava tudo no mesmo INSERT/transação. `created_at` e `evidence.reference_at` usam o horário UTC de recebimento/processamento inicial pelo servidor, antes das chamadas externas. Não existe horário de captura de foto no contrato atual. A referência não prova quando ou onde a foto foi feita.

A migração nova `002_incident_evidence.sql` adiciona `environment_snapshot` e `evidence_json` JSONB, sem editar a migração 001. O snapshot e a evidência não são recalculados no GET, na revisão ou no replay do UUID. Incidentes históricos mantêm NULL nos dois campos; não se inventam observações passadas. Reinício do backend não perde o snapshot já confirmado no banco.

## Configuração e limites

| Parâmetro | Padrão | Faixa | Uso |
|---|---:|---:|---|
| `EVIDENCE_RADIUS_KM` | 10 km | 1–50 km | Raio esférico em torno da coordenada declarada do incidente |
| `EVIDENCE_WINDOW_HOURS` | 24 h | 1–96 h | Janela retroativa inclusiva `[reference_at - janela, reference_at]` |

O backend solicita `days=ceil(window_hours/24)+1` ao serviço de dados: padrão **2 dias**, máximo 5. Essa consulta diária conservadora evita depender do alinhamento à meia-noite UTC; o backend filtra de novo pela janela exata e exclui horários posteriores à referência. Não garante cobertura completa, disponibilidade, detecção ou passagem de satélite. Valores fora da faixa/não finitos impedem inicialização. Decisões e justificativas em [DECISOES.md](DECISOES.md).

O parâmetro `days` padrão 1 da API de dados independente **não mudou**. A diferença é que o backend envia explicitamente 2 dias para a janela de cruzamento padrão de 24 h. `DATA_MODE` continua selecionando demo/live; `VISION_MODE` é independente.

## Snapshot validado

`environment_snapshot` registra `schema_version=1.0`, `collected_at` (backend), consulta efetiva, envelopes `weather`/`hotspots`, e avisos. Cada envelope preserva origem, `simulated`, status, `observed_at`, `fetched_at`, dados e avisos recebidos quando válidos. Horários de observação precisam de fuso. `fetched_at` pode ser anterior a `collected_at` devido ao cache do serviço de dados; não é substituído por uma hora inventada de observação.

Status do snapshot: `ok` (ambas as fontes ok), `partial` (uma ok), `unavailable` (nenhuma ok) ou `no_location`. Fonte inválida é normalizada para indisponível **individualmente**, preservando a outra válida. HTTP/timeout/JSON/consulta retornada incompatível tornam ambas indisponíveis. O fallback identifica `dados-api / weather|hotspots`; seu `fetched_at` registra a tentativa do backend, `observed_at=null` e `data=null`. Não é apresentado como medição NASA/Open-Meteo. Erros brutos, URLs com chave e credenciais não são persistidos.

O snapshot é normalizado e validado, não um dump bruto de erro upstream. Campo `risk` da API de dados não é usado para o cruzamento nem transformado em índice próprio.

## Evidência e significado de consistency

| Situação | `consistency` | Dados preservados |
|---|---|---|
| Ambas as fontes ok e ao menos um foco no raio/janela | `consistent` | Focos compatíveis e clima |
| Ambas ok, sem foco compatível | `no_nearby_hotspot` | Lista vazia e clima; não rejeita o relato |
| Alguma fonte unavailable/stale, contexto inválido ou sem localização | `unavailable` | Fonte parcial e focos válidos quando disponíveis; nunca significa sem risco |

`consistent` é **compatibilidade espacial/temporal do contexto**, não concordância semântica da imagem com o satélite, confirmação de incêndio, risco ou precisão. A classe visual é preservada em `visual_classification`; `no_signs` com focos compatíveis gera aviso de divergência para revisão, não alteração da análise ou do relato.

- `nearby_hotspots` guarda ID, coordenadas, distância Haversine **recalculada**, horário, confiança categórica original (`low|nominal|high`), FRP, fonte e `simulated`. `time_difference_seconds = reference_at - observed_at`, entre 0 e a janela configurada, incluindo bordas.
- `nearby_hotspots=[]` significa consulta utilizável sem foco compatível; `null` indica focos indisponíveis/não consultados. Quando só o clima falha, a lista de focos permanece, mas `consistency=unavailable`.
- O snapshot preserva a lista original validada. Focos fora do raio/janela/futuros são contados em `excluded_hotspots_count` e não promovidos a evidência compatível.
- `weather` preserva o envelope meteorológico; `weather_time_difference_seconds` é a diferença **assinada**, referência menos observação. Clima atual não é reconstrução do instante de captura nem medição na propriedade. Clima `stale` impede consistência conclusiva, mas os dados continuam visíveis.
- `simulated=true` na evidência significa que alguma entrada (visão, clima ou focos) é simulada. Os indicadores separados de cada fonte e `visual_simulated` mantêm a origem de cada componente. `simulated=false` com fonte unavailable não cria uma observação real: verificar status e dados nulos.
- `human_review_required=true`, avisos e estado de revisão continuam separados. Nenhum valor de consistency modifica `submitted/under_review/verified/rejected/escalated`.

### Antimeridiano

A regra de distância funciona entre +180 e −180 e é testada também nos polos. O conector FIRMS existente ainda rejeita caixas que atravessam o antimeridiano: nesse caso o snapshot preserva o aviso e o clima eventualmente disponível, e a evidência fica `unavailable`, com focos null. Não foi implementada consulta NASA em duas caixas nem alegado suporte completo a essa região.

## API e versionamento

`GET /v1/incidents/{id}` continua autorizado pelo mesmo acesso de cooperativa/agricultor. A resposta agora tem `response_model=IncidentDetail`, `contract_version=2.1.0`, `environment_snapshot` e `evidence` tipados, junto dos campos anteriores, foto autenticada, IA e revisões. O nome interno `evidence_json` e a chave privada da foto não são expostos. Incidentes anteriores à migração retornam os campos novos como null. Listagem também expõe os campos persistidos, sem novas consultas.

OpenAPI gerado: [`backend/openapi.json`](../backend/openapi.json), `info.version=2.1.0`; dado ambiental continua contrato 1.0.0. A mudança é aditiva, mantém caminhos `/v1` e o metadata de upload. O contrato anterior 2.0.0 permanece no histórico Git da base `c614b6dacafcfbe8aef63c8dd2f1c679f2815eaf`, no mesmo caminho. Essa revisão documenta explicitamente o significado dos campos novos, sem converter registros antigos.

Antes de iniciar o backend atualizado, executar migrações. No Compose: `docker compose up --build -d` (migrador antes do backend). Em execução direta: `python -m backend.migrate`. Configurar o mesmo `DATA_API_KEY` em backend/dados.

## Validação e escopo restante

As regras são testadas sem rede: raio/janela inclusivos, futuro, timezone, distância recalculada/antimeridiano/polos, ausência de localização, falha parcial, stale, simulação, divergência com IA e parâmetros inválidos. Integração usa dados-api ASGI/demo e provedores HTTP controlados; persistência, migração histórica, replay, autorização e retorno tipado são exercitados com PostGIS no CI. Evidências e contagens atuais em [VALIDACAO.md](VALIDACAO.md).

Após fornecimento autorizado da MAP_KEY, uma consulta real via dados-api/EnvironmentClient foi validada em 07/11/2026, 22:29 (São Paulo): FIRMS e Open-Meteo HTTP 200, envelopes ok e simulated=false; lista FIRMS vazia válida. Evidência em [firms-live-check.json](firms-live-check.json). A visão desse teste foi simulada, mantendo o agregado simulated=true; não se gravou ocorrência no banco nem se avaliou associação em campo. Chave usada somente em memória, sem alterar padrões do servidor. O teste real Gemini anterior permanece limitado à imagem sintética documentada. Ainda não há índice de risco, validação de GPS/captura, worker durável, consulta histórica meteorológica ou avaliação de qualidade da detecção. A consulta ambiental é síncrona no envio, com timeout HTTP por operação de 25 s, mantendo transação/lock; falha do processo antes do commit pode repetir chamadas externas em novo envio. Não há garantia de execução externa única.
