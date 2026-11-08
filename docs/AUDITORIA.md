# Auditoria — Fase 0

Data: 07/11/2026 (America/Sao_Paulo). Repositório: `armandor123/terra-firma`.
Base inspecionada: `1825555f9a714ffab131a3e7796f4223bb753944` (`main`).

**Fase 0 parcialmente executada; bloqueada para aprovação por falta de Docker e PostgreSQL/PostGIS.** Não houve alteração de código de aplicação, testes, migração, dependências ou Compose. A auditoria não implementa IA nem cruzamento ambiental.

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
