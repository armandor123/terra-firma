# Validação — versão 2, PostgreSQL/mobile

## Fase 1 — 07/11/2026

Mudanças partem de `189311d` (Fase 0). A integração agora está em `tests/test_integration.py`; `pytest.ini` declara `backend/tests`, `dados-api/tests` e `tests` como diretórios de descoberta. O Dockerfile de testes utiliza o mesmo comando padrão do pytest. `conftest.py` permanece na raiz como configuração compartilhada, não como teste solto.

- `python -m pytest --collect-only -q`: **24 tests collected in 0.34s**, incluindo a integração; exit 0.
- `python -m pytest -ra -q`: **11 passed, 13 skipped, 1 warning in 0.96s**; exit 0. Skips por ausência de `TEST_DATABASE_URL`; aviso de depreciação TestClient/HTTPX.
- `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests`: falhou com `docker: command not found` (127). Nenhum banco/container iniciado.
- YAML do workflow/Compose inspecionado por parser; conferidos gatilhos, permissões, comando da suíte, URL PostgreSQL, imagem PostGIS e dependência do healthcheck. `git diff --check` e links relativos dos READMEs conferidos.

O workflow `.github/workflows/tests.yml` está configurado para executar a suíte completa com PostGIS em push/PR/manual, mostrar logs em falha e limpar containers sempre. **Não houve execução remota do Actions, push, alteração de About ou adoção de licença.** O primeiro resultado real do CI deve ser registrado pelo SHA/URL da execução; não há comprovação de 24 testes aprovados nesta fase.

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
