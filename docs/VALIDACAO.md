# Validação — versão 2, PostgreSQL/mobile

## Verificação ambiental externa — 07/11/2026, 22:29 (São Paulo)

O usuário forneceu e autorizou a MAP_KEY, com instrução de não publicá-la. Ela foi usada apenas em memória; não foi gravada em .env, logs, CI ou commits. Código testado: `4852395ebcd9cf875572e2b0181f2e7907fcdd54`. Dados-api foi instanciado em modo live e acessado pelo EnvironmentClient através de ASGI local; as duas consultas externas usaram transporte HTTP real, sem MockTransport.

| Fonte | Resultado observado |
|---|---|
| NASA FIRMS / VIIRS_SNPP_NRT | HTTP 200, CSV com cabeçalho esperado, status ok, simulated=false, lista vazia válida |
| Open-Meteo | HTTP 200, status ok, simulated=false, referência meteorológica 08/11/2026 01:15 UTC |

Consulta de demonstração: latitude −22,9 / longitude −47,06, raio 10 km, 2 dias solicitados ao provedor; regra de evidência retroativa de 24 h. Snapshot normalizado com status ok, evidência no_nearby_hotspot, revisão humana obrigatória. Duração observada da captura: 9,165 s, uma execução; não é benchmark geral. A lista vazia não garante ausência de fogo. Não havia foco positivo nesse retorno para testar associação de uma observação real.

A visão foi deliberadamente simulada (sem foto/modelo externo nessa execução); assim `evidence.simulated=true` sinaliza uma entrada simulada, enquanto weather/hotspots preservam simulated=false. A verificação comprova conectividade, autenticação/CSV, normalização e regras sobre uma consulta real vazia. **Não comprova detecção em campo, associação positiva, integração Gemini + FIRMS + foto real no mesmo incidente ou persistência real de ponta a ponta.** Persistência continua validada pelo CI com fontes controladas.

Evidência sanitizada em [firms-live-check.json](firms-live-check.json), sem chave nem URLs que a contenham. Os padrões DATA_MODE/VISION_MODE do servidor não foram alterados; o modo live foi aplicado apenas ao processo de verificação. Para operação contínua, configurar os segredos no servidor fora do Git.

## Fase 3 — regras, snapshot e contrato 2.1.0

Base publicada da Fase 2: `c614b6dacafcfbe8aef63c8dd2f1c679f2815eaf`; itens pedidos conferidos, [CI 65 testes aprovado](https://github.com/armandor123/terra-firma/actions/runs/42431574627) e chamada Gemini sintética registrada. Não representa avaliação de detecção em campo.

Local: `python -m pytest -ra -q` → **80 passed, 22 skipped, 1 warning in 1.16s**. Docker permanece indisponível localmente. Os 22 cenários de banco foram depois executados no CI, conforme evidência abaixo. O OpenAPI foi regenerado dos apps em 2.1.0, com detalhe tipado; migração 001 preservada e nova 002 adicionada.

Cobertura adicional: regras de janela/raio exatos e inclusivos, futuro, timezone, simulação por fonte, divergência IA/contexto, vazio diferente de indisponível, clima stale e falhas parciais, coordenadas/antimeridiano/polos, parâmetros inválidos e query incompatível; persistência de snapshot e origem, replay sem nova consulta, isolamento, upgrade de registro histórico e detalhe versionado. Integração ASGI com dados-api/demo e HTTP controlado (incluindo clima preservado quando FIRMS recusa a caixa no antimeridiano).

Resultado remoto confirmado em 07/11/2026, 22:12 (São Paulo): [CI 42433174536](https://github.com/armandor123/terra-firma/actions/runs/42433174536), [job/logs](https://github.com/armandor123/terra-firma/actions/runs/42433174536/job/128586311344), commit `48c9e5536dc153e0c894bad75442cfca1d6f82d2`, branch `feat/fase-3-evidencias`: **102 passed, 1 warning in 15.14s**, nenhum ignorado, saída 0 e limpeza bem-sucedida. Inclui migração/upgrade histórico, persistência/retorno e regras de correlação em PostgreSQL/PostGIS real; o aviso remanescente é de depreciação TestClient/HTTPX.

Na execução técnica inicial da Fase 3 não houve nova chamada real NASA/Open-Meteo/Gemini; a consulta ambiental externa posterior está registrada no início deste documento; testes técnicos não medem acurácia de imagem ou de associação espacial/temporal. Startup do Compose de desenvolvimento permanece uma verificação separada da suíte de testes.

## Verificação externa Gemini — 07/11/2026, 21:47 (São Paulo)

Após autorização e fornecimento da chave pelo usuário, foram feitas consultas de metadados e duas tentativas explícitas de geração, sem salvar a credencial no código, arquivos de configuração, CI ou commits. A listagem de modelos retornou HTTP 200. GeminiProvider foi executado sem alterar o código, usando transporte HTTP real (não MockTransport), na revisão `6af2197905b16bab8ba03fe2665872c3d24ce1b9`.

| Tentativa | Modelo solicitado | Resultado observado |
|---|---|---|
| 1 | gemini-2.5-flash | HTTP 404 NOT_FOUND; adaptador retornou unavailable/inconclusive, simulated=false |
| 2 | gemini-3.8-flash | Metadados HTTP 200 com generateContent listado; geração HTTP 200, finishReason=STOP; completed, simulated=false, classificação inconclusive; 11,121 s nesta única chamada |

A entrada era uma imagem sintética uniforme 256×256 RGB (40,100,50), criada em memória, reencodificada pelo clean_image em JPEG sem EXIF (1.653 bytes). Não era foto de floresta, vegetação seca ou fogo. Os quatro sinais retornaram uncertain/confidence=null, image_assessable=false e limitação other. A versão de modelo devolvida pela API foi gemini-3.8-flash e a versão do prompt terra-firma-vision-v1; a revisão humana continuou obrigatória. JSON integral sanitizado, hash da imagem e limites em [vision-live-check.json](vision-live-check.json).

Isso comprova execução externa e aceitação do contrato para um exemplo sintético. **Não comprova detecção de incêndio, acurácia, calibração, desempenho geral, custo ou persistência de uma ocorrência real de ponta a ponta.** Persistência/autorização continuam cobertas pelo CI com transporte controlado; ainda falta combinar foto real autorizada, chamada externa e registro no banco na mesma execução. A troca manual de modelo entre tentativas não adiciona retry/fallback ao código. O padrão VISION_MODE=simulated não foi alterado.

## Fase 2 — visão: implementação e CI confirmado

Base: branch publicada `chore/fase-1`, SHA `a796bb5c6155352a8fd821dc998c05be85386b55`. Antes de continuar, conferidos os itens da Fase 1: README PT-BR/links corretos, log fora do índice e ignorado, integração em `tests/`, configuração CI com PostGIS e execução final bem-sucedida, licença apenas proposta e About apenas sugerido. [CI final da Fase 1](https://github.com/armandor123/terra-firma/actions/runs/42428636894): 24 aprovados, 1 aviso em 8,38 s, nenhum ignorado. A `main` continua sem merge.

Os itens 1 e 2 da Fase 2 implementam interface/adaptadores, schema e chamada síncrona no upload. Sem alterar migrações aplicadas ou regras de autenticação/revisão. Schema JSON de visão gerado a partir do Pydantic. `VISION_MODE` independente de `DATA_MODE`; CI força modo simulado e adaptações Gemini são testadas com HTTP controlado.

- `python -m pytest -q backend/tests/test_vision.py`: **38 passed in 0.22s**.
- `python -m pytest -ra -q`: **49 passed, 16 skipped, 1 warning in 1.15s** (sem banco local).
- `python -m pytest --collect-only -q`: **65 tests collected in 0.38s**.
- Cenários de banco adicionais: duas variações de persistência de visão (sucesso/falha), autorização antes da chamada, JPEG sem EXIF no corpo enviado, reenvio/conflito sem outra chamada, isolamento, revisão/minuta e concorrência com uma chamada de visão.
- Validação: quatro sinais e seis classes; confiança estrita/finita/limitada e nula em incerteza; falta de evidência, campos extras e classificações contraditórias; metadados de origem/versionamento controlados pelo servidor; HTTP, transporte, bloqueio, truncamento, JSON e versão ausente; nenhum erro externo vira simulação ou `no_signs`.

Resultado remoto confirmado em 07/11/2026, 21:30 (São Paulo): **65 passed, 1 warning in 10.57s**, nenhum teste ignorado, container `tests` com saída 0. [CI 42429976440](https://github.com/armandor123/terra-firma/actions/runs/42429976440), [job/logs](https://github.com/armandor123/terra-firma/actions/runs/42429976440/job/128576578842), commit `01ae50dab2e1649a0317bc1069e12b6558c3c6ec`, branch `feat/fase-2-visao`. Runner inicia PostgreSQL 16.15 e extensões PostGIS usando `compose.test.yaml`; a etapa de limpeza também passou. Os 16 cenários de banco pendentes localmente foram executados. O aviso é de depreciação TestClient/HTTPX, já existente.

Publicados três commits lógicos (contrato/adaptadores, integração, documentação), preservando `main`. Árvores Git publicadas foram comparadas com as locais; os SHAs de commits mudaram por publicação via API, sem mudar conteúdo. Alteração documental posterior registra este resultado sem alterar o código testado.

**Não executado na verificação inicial:** chamada real Gemini, inferência em foto autorizada, avaliação independente de qualidade, medição de acurácia/latência/custo do fornecedor, adversarial real ou cruzamento ambiental. Naquele momento não havia chave/modelo; a evidência externa posterior está registrada no início deste documento. Os 38 testes do adaptador/contrato não são 38 avaliações de fotos. Código/configuração disponível não equivale a integração externa comprovada.

## Execução remota confirmada — 07/11/2026, 21:09 (São Paulo)

- Branch publicada: `chore/fase-1`; `main` não foi alterada.
- Commit testado: `4eb09cc86ed3101e1335f180fb84a6439270c714` (árvore idêntica à entrega local `0aa066b`). Os SHAs dos commits publicados diferem porque foram criados pela API GitHub; as árvores foram comparadas antes da publicação.
- Workflow: `Tests with PostGIS`, evento push, [execução 42428442702](https://github.com/armandor123/terra-firma/actions/runs/42428442702), [job/logs](https://github.com/armandor123/terra-firma/actions/runs/42428442702/job/128571741094).
- Ambiente observado: runner Ubuntu 24.04.5, imagem de testes baseada em Python 3.12; PostgreSQL **16.15** iniciado nos logs, com extensões PostGIS carregadas pela imagem configurada `postgis/postgis:16-3.7`.
- Comando: `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests`.
- Resultado: **24 passed, 1 warning in 6.49s**, nenhum teste ignorado, container `tests` encerrado com código 0; etapa de testes e limpeza concluídas com sucesso.
- O aviso remanescente é `StarletteDeprecationWarning` do TestClient/HTTPX. Não houve falha que exigisse correção de código.

Os 13 cenários anteriormente ignorados foram executados: inclui migração/reexecução, PostGIS, isolamento, revisão, fotos, idempotência e concorrência, sessões/refresh e integração backend ↔ dados. A limitação local de Docker foi superada para **a suíte de banco** por execução remota real.

O workflow não inicia o Compose de desenvolvimento, não cria o usuário de bootstrap nem verifica as APIs em processos separados com `/health`. A exigência de startup do ambiente de desenvolvimento da Fase 0 continua pendente. Não houve chamada real a NASA/Open-Meteo ou modelo de imagem: os provedores permanecem controlados nos testes e a IA de aplicação continua simulada. Nenhuma acurácia de IA foi medida.

As seções seguintes preservam o histórico anterior à publicação; suas pendências devem ser lidas em conjunto com esta evidência mais recente.

## Fase 1 — 07/11/2026

Mudanças partem de `189311d` (Fase 0). A integração agora está em `tests/test_integration.py`; `pytest.ini` declara `backend/tests`, `dados-api/tests` e `tests` como diretórios de descoberta. O Dockerfile de testes utiliza o mesmo comando padrão do pytest. `conftest.py` permanece na raiz como configuração compartilhada, não como teste solto.

- `python -m pytest --collect-only -q`: **24 tests collected in 0.34s**, incluindo a integração; exit 0.
- `python -m pytest -ra -q`: **11 passed, 13 skipped, 1 warning in 0.96s**; exit 0. Skips por ausência de `TEST_DATABASE_URL`; aviso de depreciação TestClient/HTTPX.
- `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests`: falhou com `docker: command not found` (127). Nenhum banco/container iniciado.
- YAML do workflow/Compose inspecionado por parser; conferidos gatilhos, permissões, comando da suíte, URL PostgreSQL, imagem PostGIS e dependência do healthcheck. `git diff --check` e links relativos dos READMEs conferidos.

O workflow `.github/workflows/tests.yml` está configurado para executar a suíte completa com PostGIS em push/PR/manual, mostrar logs em falha e limpar containers sempre. Na verificação local inicial não houve execução remota do Actions ou push. A execução remota posterior está registrada no início deste documento. About e licença continuam sem alteração.

`resultado-testes.txt` deixou de ser versionado e passou a ser ignorado. Referências a esse arquivo e aos caminhos antigos nas seções históricas abaixo e em `AUDITORIA.md` descrevem a revisão auditada, não a estrutura atual.

## Fase 0 — 07/11/2026

Base auditada: `1825555f9a714ffab131a3e7796f4223bb753944`. Execução em Ubuntu 24.04 / Python 3.12.14, dependências dos dois requirements instaladas em virtualenv isolado.

Comando: `python -m pytest -ra -q dados-api/tests backend/tests tests_integration.py`.

**Resultado real: 11 passed, 13 skipped, 1 warning in 0.98s; exit 0.** Os 13 cenários de banco foram ignorados por falta de `TEST_DATABASE_URL`. O aviso é de depreciação do TestClient/HTTPX. Nenhum teste executado falhou; os testes ignorados continuam sem resultado.

`docker compose up --build` e `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests` foram tentados e falharam com `docker: command not found`. Nenhum container ou banco foi iniciado. **Fase 0 bloqueada para aprovação; não avançar sem ambiente completo e suíte PostgreSQL/PostGIS.**

Os dois OpenAPIs e `backend/incident-metadata.schema.json` correspondem estruturalmente à geração atual dos apps/modelo, sem conexão ao banco. Nenhuma chamada nova a NASA, Open-Meteo ou IA foi executada. `resultado-testes.txt` contém uma saída anterior de 24 aprovados sem proveniência de commit/ambiente, insuficiente para aprovar esta fase. Evidências detalhadas e inconsistências: [AUDITORIA.md](AUDITORIA.md).

## Resultado histórico — versão 2 anterior à auditoria

**11 testes passaram e 13 testes dependentes de PostgreSQL foram ignorados explicitamente.** Não existe comprovação de execução real do PostgreSQL/PostGIS nesta versão. Não foi possível iniciar esse serviço no ambiente, e Docker não estava disponível.

Os 14 testes aprovados na primeira entrega pertenciam ao backend SQLite anterior e **não comprovam** o backend PostgreSQL atual.

Comando local executado na raiz:

```bash
python -m pytest -q dados-api/tests backend/tests tests_integration.py
```

### 11 cenários executados

- 7 testes do serviço de dados: autenticação/validação, modo demo, normalização de provedores, deduplicação/distância/UTC, falha parcial sem simulação silenciosa, dado antigo, resultado vazio e retry.
- 4 testes locais do backend: reencodificação/remoção de EXIF e limites de imagem; armazenamento privado e bloqueio de travessia de diretório; UUID e autorização de localização; exigência de URL PostgreSQL e contrato OpenAPI multipart/refresh.

### 13 cenários preparados, não executados

- Registro/revisão de ocorrência e foto autorizada.
- Senha temporária e revogação.
- Criação e isolamento de propriedades.
- Foto/localização inválidas.
- Autenticação e falha do serviço ambiental.
- Persistência/expiração de sessões.
- PostGIS: distância, SRID e isolamento.
- Deduplicação e conflito de conteúdo.
- Refresh, reuso e logout.
- Reexecução de migração.
- Uploads simultâneos do mesmo UUID.
- Refresh após expiração do access token.
- Integração backend ↔ serviço de dados.

Para executá-los com banco real isolado:

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
docker compose -f compose.test.yaml down
```

Alternativamente, configure `TEST_DATABASE_URL` para banco exclusivo de testes e rode pytest. Cada cenário usa schema aleatório, removido ao terminar. Sem essa variável, aparece `skipped`; não interpretar como aprovado.

## Outras verificações

- Código Python compilado sem erros de sintaxe.
- OpenAPI atualizado gerado diretamente dos apps, sem conectar ao banco.
- Schema separado de metadata gerado a partir do modelo Pydantic.
- ZIP verificado e sem bancos, credenciais reais ou caches.
- O aviso de depreciação HTTPX/TestClient da biblioteca permanece; não causou falha dos cenários executados.

## Evidência externa anterior preservada

`live-check.json` é a consulta real ao Open-Meteo feita na primeira versão, com referência 05/11/2026 23:45 UTC (20:45 São Paulo), `simulated=false`, status ok, para coordenadas fictícias de demonstração. Não é uma nova consulta desta atualização nem uma leitura atual para uso operacional.

NASA real continua não validada por ausência de chave. Os conectores de dados não foram alterados nesta versão.

## Não validado

Containers/Compose, migrações em PostgreSQL real, execução do exemplo TypeScript em Expo/aparelho, builds Android/iOS, carga, auditoria completa de segurança, requisitos jurídicos ou integrações de emergência. O pacote é implementação para desenvolvimento, ainda sujeito à validação de banco descrita acima.

## Plano de testes adicionais — incluído em 06/11/2026

Consulte [PLANO-IA-E-TESTES.md](PLANO-IA-E-TESTES.md), etapa 3, para testes de PostgreSQL, adaptador/worker, chamadas reais, qualidade visual e jornada mobile. O plano exige separar testes controlados de chamadas reais e definir metas antes da avaliação final.

Esta atualização é documental: não executou novamente os testes, não forneceu credenciais de IA e não alterou os resultados históricos descritos acima. A aprovação das etapas exige registrar novas evidências.
