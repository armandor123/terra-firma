# Auditoria — histórico e estado entregue nas Fases 4–5

Data: 07/11/2026 (America/Sao_Paulo). Repositório: `armandor123/terra-firma`.
Base inspecionada: `1825555f9a714ffab131a3e7796f4223bb753944` (`main`).

**Registro histórico da Fase 0; bloqueios de banco/startup foram posteriormente resolvidos pelo CI. Consulte a tabela final das Fases 4–5 ao fim deste documento para o estado atual.** Não houve alteração de código de aplicação, testes, migração, dependências ou Compose. A auditoria não implementa IA nem cruzamento ambiental.

## Evidência posterior — 07/11/2026, 21:09 (São Paulo)

[CI 42428442702](https://github.com/armandor123/terra-firma/actions/runs/42428442702) executou `compose.test.yaml` no commit publicado `4eb09cc86ed3101e1335f180fb84a6439270c714`: **24 passed, 1 warning in 6.49s**, nenhum skip, saída 0. Os 13 cenários PostgreSQL antes pendentes passaram com banco real. Veja `VALIDACAO.md` para ambiente e limites. O startup do Compose de desenvolvimento ainda não foi exercitado; esta evidência não aprova integralmente a Fase 0. A tabela abaixo permanece histórica e aponta para a base declarada no início.

## Método e limites

Leitura dos dois READMEs da raiz, de todos os documentos em `docs/`, dos módulos, testes, migração, configurações, exemplos e contratos em `backend/` e `dados-api/`, além de `conftest.py`, `tests_integration.py`, `pytest.ini`, Dockerfiles e Compose. Os contratos JSON foram carregados e comparados com os modelos/apps atuais. Não havia `AGENTS.md` no checkout.

As referências `arquivo:linha` abaixo apontam para a **base inspecionada**, antes das correções documentais. “Confere” significa correspondência entre texto e implementação; não substitui teste de banco ou comprovação em produção. “Não existe” identifica capacidade ainda ausente, mesmo quando o README a apresenta corretamente como proposta. Evidências externas de apresentação, identidade visual, créditos e licenças de imagens não foram fornecidas neste checkout e não foram revalidadas.

## Afirmação do README → evidência no código → status

| Afirmação do README (EN / equivalente PT-BR) | Evidência no código (arquivo:linha) | Status |
|---|---|---|
| Abertura: combate a incêndios “through AI image analysis combined with satellite data” | `README.md:4`; `backend/backend/main.py:292` cria dicionário fixo; não executa modelo. O aviso em `README.md:12` é correto, mas a abertura soa como capacidade existente. | diverge |
| Login por usuário/senha, Argon2, senha inicial obrigatória | `backend/backend/main.py:27`, `:91`, `:130`, `:187`, `:204`; `backend/backend/bootstrap.py:17` | confere |
| Papéis farmer/cooperative e isolamento por cooperativa | `backend/backend/main.py:96`, `:101`, `:108`, `:215`, `:220`, `:302`, `:348`; `backend/backend/migrations/001_initial.sql:3` | confere |
| Tokens opacos, somente hashes persistidos | `backend/backend/main.py:36`, `:149`; `backend/backend/migrations/001_initial.sql:17` | confere |
| Access de 900 s, refresh absoluto de 30 dias com rotação e revogação por reuso | `backend/backend/main.py:149`, `:156`, `:169`, `:177`; expiração absoluta não é estendida | confere |
| Troca de senha revoga todas as sessões; logout revoga a atual | `backend/backend/main.py:187`, `:195`, `:199` | confere |
| Criação/listagem de agricultores e propriedades; sem edição/exclusão | `backend/backend/main.py:204`, `:215`, `:220`, `:231`; contratos OpenAPI correspondem às rotas | confere |
| Propriedades como pontos PostGIS, SRID 4326 e índice GiST | `backend/backend/migrations/001_initial.sql:8`, `:14`, `:16` | confere |
| Proximidade em metros, raio 1–50.000 m, até 200 itens da cooperativa | `backend/backend/main.py:237`–`:247` | confere |
| Upload multipart: metadata JSON + JPEG/PNG, até 3 MB/12 MP; corpo até 4,1 MB | `backend/backend/main.py:39`, `:65`, `:267`; `backend/backend/schemas.py:31` | confere |
| Reencodificação remove EXIF; foto privada fora do banco | `backend/backend/main.py:45`–`:52`, `:317`; `backend/backend/storage.py:13`, `:18`; `backend/tests/test_local.py:10` | confere |
| Localização opcional, coordenadas pareadas, autorização; não verificada | `backend/backend/schemas.py:31`–`:49`; `backend/backend/main.py:121` | confere |
| UUID por agricultor, replay idêntico, conflito 409, concorrência serializada | `backend/backend/main.py:278`–`:299`; `backend/backend/migrations/001_initial.sql:34`–`:35`; testes `backend/tests/test_backend.py:120`, `:152` preparados, não executados | confere |
| Histórico paginado e trilha de revisão | `backend/backend/main.py:302`, `:310`, `:327`; `backend/backend/migrations/001_initial.sql:38` | confere |
| Revisão humana: submitted → under_review → verified/rejected; verified → escalated | `backend/backend/main.py:327`–`:338`; apenas cooperativa autorizada altera status | confere |
| Resumo cumulativo; área cadastrada não é área queimada | `backend/backend/main.py:348`–`:358`; `burned_area_ha=None` | confere |
| SOS e minuta sem envio ou despacho automático | `backend/backend/main.py:340`–`:346`, `:360`–`:363` | confere |
| IA atual simulada/inconclusiva e sem confiança numérica | `backend/backend/main.py:292`–`:299`; `ai_json` recebe `simulated=True`, `classification=inconclusive`, `confidence=None` | confere |
| Identificação real de fogo, fumaça, vegetação seca e queimada | `backend/backend/main.py:292`; nenhum adaptador de visão ou inferência nos módulos inspecionados | não existe |
| Worker Python/Gemini e fila persistente | `compose.yaml:1`–`:49` só define db/migrate/dados/backend; `backend/backend/migrations/001_initial.sql:1`–`:44` não cria tarefas | não existe |
| Cruzamento automático imagem × FIRMS × clima por ocorrência | `backend/backend/main.py:267`–`:300` não consulta dados; `:249`–`:265` consulta ambiente separadamente por propriedade, sem persistência ambiental | não existe |
| Local e horário da foto sustentam correlação temporal | `backend/backend/schemas.py:31`–`:49` não tem `captured_at`; `backend/backend/main.py:298` grava horário de recebimento. Proposta, não capacidade atual. | não existe |
| Serviço ambiental independente, autenticação X-API-Key de pelo menos 24 caracteres | `dados-api/dados/main.py:12`–`:25`, `:31`; `backend/backend/main.py:249`–`:265` autoriza propriedade antes de consultar | confere |
| demo explícito, valores fictícios fixos com referência 01/01/2026 | `dados-api/dados/providers.py:107`–`:115`; `dados-api/dados/main.py:37`; `dados-api/example-context.json:9` | confere |
| live consulta Open-Meteo/FIRMS sem substituir falha por simulação | `dados-api/dados/main.py:39`–`:41`; `dados-api/dados/providers.py:21`, `:40`, `:83` | confere |
| Temperatura, umidade, vento/direção e precipitação; clima antigo marcado stale | `dados-api/dados/providers.py:43`–`:62`; `dados-api/dados/models.py:14` | confere |
| FIRMS VIIRS_SNPP_NRT, UTC, deduplicação, Haversine e raio | `dados-api/dados/providers.py:16`, `:64`–`:81`, `:97`; `dados-api/dados/models.py:21` | confere |
| Janela NASA de 1–5 dias, antimeridiano não suportado | `dados-api/dados/models.py:12`; `dados-api/dados/providers.py:93`–`:97`. Janela é solicitada ao provedor; parser não rejeita data antiga/futura por si só. | confere |
| Falha parcial é envelope unavailable; [] difere de null | `dados-api/dados/providers.py:21`, `:81`, `:99`; `dados-api/dados/main.py:42`; `dados-api/tests/test_data.py:47`, `:65` | confere |
| Envelopes com origem, simulated, horários, status e avisos | `dados-api/dados/models.py:30`–`:44`; `dados-api/dados/providers.py:54`, `:99`, `:109` | confere |
| Cache de cinco minutos/256 consultas, somente ambas as fontes ok | `dados-api/dados/main.py:33`–`:48`; cache por processo e sem persistência | confere |
| Até duas tentativas em falhas transitórias | `dados-api/dados/providers.py:25`–`:38` tenta transporte/429/5xx; sem fallback demo | confere |
| Índice de risco não implementado, campos nulos/validated=false | `dados-api/dados/main.py:42`–`:44` | confere |
| Migração versionada/checksum/lock/transação; sem downgrade | `backend/backend/migrate.py:6`–`:23`; `backend/backend/db.py:13`–`:16` | confere |
| Compose define PostgreSQL 16/PostGIS 3.7, migrador antes do backend e volumes privados | `compose.yaml:3`, `:16`, `:40`–`:49`; definição estática, inicialização não comprovada nesta auditoria | confere |
| OpenAPI backend 2.0.0, dados 1.0.0 e schema de metadata atualizados | `backend/backend/main.py:61`; `dados-api/dados/main.py:20`; comparação estrutural dos três JSONs com geração atual: iguais | confere |
| Cliente Expo de referência, sem telas/builds | `backend/examples/expo-client.ts:1`–`:120`; não há projeto de interface no inventário Git | confere |
| Interface web HTML/CSS/JS proposta | `git ls-files` não contém implementação web; README já a apresenta como proposta | não existe |
| Fila offline, push, polígonos, INPE/MapBiomas, exportações, índice de risco | Nenhuma implementação nas rotas, modelos, migração e provedores lidos; apresentados como pendentes | não existe |
| Link Português aponta para README.pt-BR.md | `README.md:6` aponta para arquivo ausente; Git contém `README.MD pt br` | diverge |
| Resultado histórico: 11 aprovados / 13 ignorados | `docs/VALIDACAO.md:5`; reproduzido nesta auditoria. `resultado-testes.txt:9` contém 24 passed sem proveniência, divergência documental | confere |
| Sem LICENSE | Inventário `git ls-files`; API pública GitHub retorna `license=null` | confere |

## Execução real e bloqueios

Ambiente: Ubuntu 24.04, Python 3.12.14; dependências diretas instaladas em virtualenv isolado conforme os dois `requirements.txt`, sem alterações. FastAPI 0.162.0, pytest 9.2.0, psycopg 3.3.8, Starlette transitivo 1.10.0.

| Comando/verificação | Resultado observado |
|---|---|
| `docker compose up --build` | Falhou antes de iniciar: `docker: command not found` (127). Nenhum container foi construído/iniciado. |
| `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests` | Mesmo bloqueio: Docker ausente (127). Testes PostgreSQL não executados. |
| `python -m pytest -ra -q dados-api/tests backend/tests tests_integration.py` | **11 passed, 13 skipped, 1 warning in 0.98s**, exit 0. Não equivale à aprovação da suíte completa. |
| Comparação dos OpenAPIs e schema de metadata com geração atual | Três correspondências estruturais exatas; não conecta ao banco. |

Não há `psql`, servidor PostgreSQL/PostGIS nem `TEST_DATABASE_URL` provisionados. A instalação alternativa também exigiria um ambiente capaz de executar o servidor como usuário não root; este runtime só mapeia UID 0 e a troca para UID 1000 falhou (`Invalid argument`). Não foi substituído o banco por SQLite, mock ou emulação. Não foi contornada a restrição de identidade do runtime.

Os testes executados foram os sete de `dados-api/tests/test_data.py` e os quatro de `backend/tests/test_local.py`. O aviso observado é `StarletteDeprecationWarning`: uso de HTTPX no TestClient depreciado. Não houve falha nos onze cenários; não foi alterada dependência para esconder o aviso.

Os **13 cenários ignorados** são os 12 testes de `backend/tests/test_backend.py` (fluxo de revisão/foto, senha inicial/revogação, isolamento de propriedades, imagem/localização inválidas, autenticação/falha ambiental, persistência/expiração, PostGIS, idempotência/conflito, rotação/reuso/logout, migração reentrante, upload concorrente e refresh após expiração) e `tests_integration.py:13` (backend consumindo serviço ambiental independente). A fixture em `conftest.py:11`–`:13` informa explicitamente a falta de banco.

O comando lista `tests_integration.py` explicitamente: seu nome não corresponde ao padrão padrão de descoberta `test_*.py`/`*_test.py`. Executar somente `pytest` pode omitir essa integração.

Não foi feita nova chamada real NASA/Open-Meteo, análise por modelo, medição de acurácia, avaliação de imagens ou validação em aparelho. Os testes de provedores usam `httpx.MockTransport`; a integração ambiental usa ASGI/demo. `docs/live-check.json` é evidência histórica, não consulta atual.

## Inconsistências do repositório

| Item | Evidência e impacto | Tratamento nesta fase |
|---|---|---|
| README português | `README.MD pt br` existe; `README.pt-BR.md` não existe na base. Link de idioma quebrado. | Renomear somente documento, preservando texto e sincronizando estado com inglês em commit documental. |
| About desatualizado | API GitHub consultada em 07/11/2026: “Terra-Firma: aplicativo mobile para agricultores e cooperativas registrarem possíveis incêndios e consultarem dados ambientais. Backend em FastAPI, PostgreSQL/PostGIS e integração mobile planejada com React Native/Expo.” O repositório contém APIs e cliente Expo de exemplo; não um aplicativo pronto. Omite foco da proposta e ressalva da IA. | Não alterado remotamente. Sugestão: “MVP de relatos de possíveis incêndios para revisão por cooperativas. FastAPI + PostGIS e conectores FIRMS/Open-Meteo. IA de imagem e cruzamento ainda pendentes.” |
| resultado-testes.txt versionado | Texto reporta `24 passed, 1 warning in 7.98s`; não contém SHA, data ou versões. Diverge da evidência histórica em docs. | Preservado como artefato anterior, sem tratá-lo como prova desta revisão. Recomenda-se substituir por evidência CI vinculada a commit ao executar Compose. |
| Testes na raiz | `tests_integration.py`, `conftest.py`, `pytest.ini`. Fixture global legítima; teste de integração fora das pastas e nome fora da descoberta padrão. | Inventariado; não mover/renomear código na fase de auditoria. Comando completo documentado explicitamente. |
| LICENSE ausente | Sem arquivo de licença e `license=null` na API GitHub. | Não escolher licença em nome dos titulares; registrar pendência. |
| Caminho de migração incorreto em doc | `docs/EXPLICACAO-TECNICA.md` cita `backend/migrations/001_initial.sql`; caminho real relativo à raiz é `backend/backend/migrations/001_initial.sql`. | Corrigido no commit documental, junto ao caminho do runner; a execução já resolve corretamente relativo ao próprio módulo. |
| Documentos de escopo anteriores | Descrevem backend como contingência/mobile, enquanto README mais recente propõe web. | README registra ambas as referências; nenhuma interface completa implementada. Decisão em `DECISOES.md`. |
| Contratos livres no backend | `environment` verifica só presença de weather/hotspots (`main.py:260`–`:263`), não valida `Context`; saídas backend em grande parte não têm response_model. | Limitação para próxima implementação; preservar código na auditoria. |

## Critério para encerrar a Fase 0

1. Em runtime com Docker/Compose, configurar segredos locais e executar `docker compose up --build`; verificar migração e os dois `/health`.
2. Executar exatamente a suíte `compose.test.yaml` acima, com todos os **24 testes executados**, nenhum ignorado por falta de banco e exit code do serviço `tests` igual a zero. Registrar SHA, versões e saída real.
3. Se houver falhas, corrigi-las em commits próprios, repetir verificações afetadas e atualizar READMEs/esta auditoria.

Até isso ocorrer, a fase permanece **bloqueada para aprovação**. A inspeção documental e os onze testes locais não autorizam afirmar que PostgreSQL/PostGIS ou a promessa central já funcionam ponta a ponta. Nenhuma fase de implementação foi iniciada.

## Atualização Fase 4 — 08/11/2026 UTC

A tabela inicial é histórica. Interface antes ausente agora implementada: `web/public/index.html:1`, `web/public/app.js:1`, `web/nginx.conf:1`, `compose.yaml:53`; evidência executável em `web/tests/test_browser.py:1` e `web/tests/client.test.js:1`. Bootstrap sem conta padrão em `backend/backend/bootstrap.py:1`, configuração privada em `scripts/configure.py:1`. [CI 42436624805](https://github.com/armandor123/terra-firma/actions/runs/42436624805): 103 Python/PostGIS, quatro JavaScript, quatro navegador aprovados; stack de desenvolvimento e bootstrap confirmados. Confere para fluxo demo; live com foto real ainda não demonstrado. Sem mudança em contratos HTTP nesta fase.

## Tabela atual — Fases 4–5 (08/11/2026 UTC)

A tabela inicial e seus bloqueios são históricos. Esta tabela substitui o estado das afirmações nos READMEs EN/PT-BR na branch `feat/fase-5-operacao`; main ainda não recebeu merge. Cada linha agrupa afirmações equivalentes nas duas línguas. `confere` significa correspondência com código e limites documentados, não prontidão para produção ou qualidade visual.

| Afirmação do README | Evidência no código (arquivo:linha) | Teste/verificação | Status |
|---|---|---|---|
| MVP web Nginx/FastAPI/PostGIS, sem build frontend | `web/Dockerfile:1`; `web/nginx.conf:16`; `compose.yaml:54` | `web/tests/test_browser.py:89` — jornada na stack completa | confere |
| Login Argon2, troca inicial, revogação e papéis | `backend/backend/main.py:31`, `:100`, `:141`, `:192` | `backend/tests/test_backend.py:56`; jornada de navegador | confere |
| Access 900 s, refresh 30 dias absoluto/rotativo, reuso revoga | `backend/backend/main.py:152`, `:160` | test_refresh_rotation_replay_and_logout / test_refresh_survives_access_expiry em test_backend.py | confere |
| Isolamento por cooperativa/autor e autorização de foto | `backend/backend/main.py:110`, `:117`, `:330` | test_property_registration_and_cooperative_isolation / test_full_incident_review_flow_and_image | confere |
| Criar/listar produtores/propriedades e proximidade por ponto PostGIS | `backend/backend/main.py:209`, `:220`, `:225`, `:236`, `:242`; `backend/backend/migrations/001_initial.sql:8` | test_property_registration_and_cooperative_isolation / test_postgis_distance_and_scope; cadastro no navegador | confere |
| JPEG/PNG até 3 MB/12 MP, corpo 4,1 MB, EXIF removido e foto privada | `backend/backend/main.py:44`, `:74`, `:330`; `backend/backend/storage.py:9` | test_photo_exif_removed_and_format_checked / test_bad_image_and_location_rejected / jornada | confere |
| Localização opcional/autorizada/não verificada; sem substituir ponto; referência de recebimento | `backend/backend/schemas.py:31`; `backend/backend/evidence.py:132`; `backend/backend/main.py:273` | `backend/tests/test_evidence.py:143`; `web/tests/test_browser.py:199` | confere |
| UUID idempotente por agricultor, 409 conflitante, concorrência; tentativa web em memória | `backend/backend/main.py:272`, `:288`; `web/public/app.js:150` | test_idempotent_retry_and_payload_conflict / test_concurrent_duplicate_upload; `web/tests/test_browser.py:176` | confere |
| VisionProvider/simulado/Gemini e saída estruturada: quatro sinais, seis classes, limitações, versões | `backend/backend/vision.py:31`, `:37`, `:67`; `backend/backend/vision_models.py:20`, `:34`, `:41`, `:63` | `backend/tests/test_vision.py:36`, `:71`, `:116`, `:144`, `:182`; persistência em test_backend.py | confere |
| IA não confirma fogo, inconclusivo válido e revisão humana obrigatória; confiança não é acurácia | `backend/backend/vision.py:12`; `backend/backend/vision_models.py:63` | test_provenance_is_server_owned_and_human_review_cannot_be_disabled; nenhuma avaliação rotulada registrada | confere |
| NASA/Open-Meteo, fontes/horários/status/avisos, partial, vazio distinto de unavailable, sem fallback demo | `dados-api/dados/providers.py:21`, `:40`, `:64`, `:107`; `dados-api/dados/models.py:30` | `dados-api/tests/test_data.py:33`, `:47`, `:55`, `:65`, `:68`; `tests/test_integration.py:13` | confere |
| Demo explícito, simulação por fonte/agregado, falha real não vira simulação | `dados-api/dados/main.py:12`, `:37`; `backend/backend/evidence.py:174`; `.env.example:1` | test_demo_contract_auth_and_validation / test_consistency_is_context_compatibility_not_ai_confirmation | confere |
| Snapshot imutável no incidente, histórico nullable, replay/GET não consultam | `backend/backend/main.py:124`, `:301`, `:323`; `backend/backend/migrations/002_incident_evidence.sql:1` | test_incident_environment_snapshot_is_saved_once_and_scoped / test_evidence_migration_preserves_legacy_json_and_null_snapshot | confere |
| Raio 10 km/janela retroativa 24 h; 1–50/1–96, distância/tempo/confiança, clima; sem confirmação | `backend/backend/evidence.py:17`, `:91`, `:174`; `docs/DECISOES.md:1` | `backend/tests/test_evidence.py:46`, `:61`, `:68`, `:114`, `:135`, `:198` | confere |
| Sem GPS/fonte stale/falha: unavailable parcial; vazio não invalida relato | `backend/backend/evidence.py:132`, `:174` | `backend/tests/test_evidence.py:95`, `:127`, `:143`, `:172` | confere |
| Antimeridiano: distância válida, caixa FIRMS indisponível com clima preservado | `backend/backend/evidence.py:167`; `dados-api/dados/providers.py:93` | `backend/tests/test_evidence.py:75`; `tests/test_integration.py:45` | confere |
| Paginação, detalhe, revisão/notas/trilha, escalonamento interno | `backend/backend/main.py:315`, `:323`, `:340`; `web/public/app.js:69`, `:81` | test_full_incident_review_flow_and_image; `web/tests/test_browser.py:89`, `:154` | confere |
| DADOS SIMULADOS para qualquer simulated=true aninhado | `web/public/client.js:1`; `web/public/app.js:14` | `web/tests/client.test.js:1`; jornada de navegador | confere |
| Tokens em memória, refresh único e logout limpa sessão/foto/cadastros/seleções, texto sem HTML | `web/public/client.js:12`; `web/public/app.js:25`, `:81` | quatro testes Node; jornada testa storage vazio, blob privado e texto XSS literal | confere |
| Proxy de mesma origem/CSP/no-store/nosniff, nenhuma chave interna no frontend | `web/nginx.conf:8`, `:12`, `:16`; `web/public/client.js:12`; inventário web/public | Jornada passa pelo Nginx; inspeção de headers/configuração e conteúdo; sem CORS aberto | confere |
| Limites PostgreSQL entre réplicas, 429/Retry-After; replay não conta novo upload | `backend/backend/limits.py:11`; `backend/backend/main.py:89`, `:141`, `:160`, `:295`; `backend/backend/migrations/003_rate_limits.sql:1` | `backend/tests/test_limits.py:20`, `:37`, `:52` — concorrência, expiração, duas apps e replay | confere |
| Limitação: rotas públicas/IP/novos usernames exigem gateway; cache ambiental por processo | `backend/backend/main.py:89`, `:141`, `:160`; `dados-api/dados/main.py:21`, `:45`; `docs/OPERACAO.md:1` | Inspeção de escopo; não alegamos limitador global público nem proteção DDoS | confere |
| Limpeza manual dry-run/apply, 24 h, referências/novos/estranhos/symlinks preservados e lock | `backend/backend/cleanup_photos.py:12`; `backend/backend/main.py:297` | `backend/tests/test_cleanup.py:21`, `:43` | confere |
| Credenciais DML/migrador distintas e provisionamento sem privilégios de DDL/migração | `compose.yaml:19`, `:20`, `:38`; `backend/backend/provision.py:10` | `backend/tests/test_provision.py:22`; stack Chromium inicia com DML | confere |
| Configuração privada sem sobrescrever, Compose + bootstrap usável do zero demo | `scripts/configure.py:8`; `backend/backend/bootstrap.py:1`; `scripts/test_ui.py:16` | `backend/tests/test_web_setup.py:7`; quatro Chromium após bootstrap em stack vazia | confere |
| Contratos backend 2.1.0/dados 1.0.0 e metadata versionados iguais aos gerados | `backend/openapi.json:1`; `dados-api/openapi.json:1`; `backend/incident-metadata.schema.json:1` | `tests/test_contracts.py:11` — três comparações estruturais, sem ignorar diferenças | confere |
| Resumo acumulado/minuta/SOS sem envio externo | `backend/backend/main.py:353`, `:363`, `:375` | `backend/tests/test_backend.py:39`, `:94` | confere |
| Privacidade: checklist/aviso provisório, sem conformidade/retencão automática/portal completo de direitos | `docs/PRIVACIDADE-LGPD.md:1`; `web/public/privacy.html:1`; inventário das rotas | Inspeção de documentos/rotas; decisões do controlador abertas | confere |
| Worker/offline/push/polígonos/INPE/MapBiomas/risco não implementados; Expo só referência | Inventário Git; `compose.yaml:1`; `dados-api/dados/main.py:42`; `backend/examples/expo-client.ts:1` | test_demo_contract_auth_and_validation verifica risco nulo; inspeção, sem inventar teste de recurso ausente | confere |
| Chamadas externas separadas, sem acurácia/fluxo live real completo | `docs/vision-live-check.json:1`; `docs/firms-live-check.json:1`; `docs/VALIDACAO.md:1` | Evidências externas sintética/ponto público anteriores, não E2E persistido | confere |
| README PT nomeado/links, resultado-testes ignorado, testes organizados, CI completo | `README.pt-BR.md:1`; `.gitignore:8`; `pytest.ini:3`; `.github/workflows/tests.yml:1` | Inventário Git e execuções CI abaixo | confere |
| Sem LICENSE adotada; MIT só proposta; kit visual externo ausente e monograma/fontes locais | `docs/DECISOES.md:1`; inventário Git; `web/public/index.html:1`; `web/public/style.css:1` | Inspeção; autoria/licença/atribuição não decididas autonomamente | confere |
| Critério: About remoto coincide com versão web entregue | About público ainda descreve mobile/Expo; sugestão atual salva no README/DECISOES | Página pública consultada em 08/11/2026, sem sessão autenticada; integração sem edição de About | diverge |
| Critério: demonstração live completa com foto real, persistência e revisão da mesma ocorrência | Há adaptadores/snapshot/revisão, mas não há evidência dessa execução real conjunta | Não realizada; não substituída por mocks ou duas consultas separadas | não existe |

### Resultado e limites do aceite

- Fase 4: [CI 42436624805](https://github.com/armandor123/terra-firma/actions/runs/42436624805), SHA f45e67d76cffb8cd99970e5420a60aa440051254: 103 Python/PostGIS aprovados, um aviso, nenhum ignorado (12,45 s); quatro Node e quatro Chromium (7,29 s). Stack completa vazia e bootstrap demonstrados.
- Fase 5: [CI 42437125900](https://github.com/armandor123/terra-firma/actions/runs/42437125900), SHA e69372c0fd33a205164202cbe153f7e6d9b86f51: 109 Python/PostGIS aprovados, um aviso, nenhum ignorado (15,31 s); quatro Node e quatro Chromium (7,83 s), com usuário DML.
- CI ampliado [42437604813](https://github.com/armandor123/terra-firma/actions/runs/42437604813), SHA 13bb5bb2f93a50d3867b70d36f7ff474accf55d0: **112 Python/PostGIS aprovados em 16,02 s, nenhum ignorado, um aviso; quatro Node e quatro Chromium aprovados em 8,04 s**. Inclui três comparações exatas de contratos. Local: 84 aprovados, 28 ignorados (sem PostGIS), um aviso em 1,36 s.
- Nenhuma afirmação atual ficou sem evidência ou limite explícito. **Aceite final integral pendente** de demonstração live completa e atualização autenticada do About. HTTPS/retenção/base legal/contato/backup e preparação de produção não são apresentados como concluídos. Chaves fornecidas não foram versionadas nem colocadas no frontend.

Validação final do ajuste de logout: [CI 42438024608](https://github.com/armandor123/terra-firma/actions/runs/42438024608), SHA `dee128b5ba9e74cd7f26975b0d3630dfb21d3703`: **112 Python/PostGIS aprovados em 18,37 s, nenhum ignorado, um aviso; quatro Node e quatro Chromium aprovados (8,94 s)**. O navegador confirma também limpeza das seleções de propriedades/produtores e senha temporária ao sair. Nenhuma falha pendente de teste. Alteração posterior a esse SHA somente documental.
