# Terra-Firma

[English](README.md) · [Repositório](https://github.com/armandor123/terra-firma)

MVP de relatos com fotos por agricultores e revisão por cooperativas. Interface web estática servida por Nginx, backend FastAPI e PostgreSQL/PostGIS. Visão selecionável (`simulated` ou Gemini); novos incidentes recebem snapshot ambiental e evidência determinística de satélite/clima. **A IA nunca confirma incêndio sozinha. A revisão humana continua obrigatória.**

Grupo 13, Reboot the Earth 2026: Feliphe Coutinho, Taciára Mendes, Victor Hinoue e Armando de Almeida. Projeto independente de participantes; marcas pertencem aos seus titulares.

O padrão é **ambiente demo + visão simulada**. A interface mostra **DADOS SIMULADOS** sempre que qualquer entrada tem `simulated=true`. Falha em live continua indisponibilidade; não vira simulação nem “sem risco”. Nenhuma métrica de acurácia foi medida.

## Escopo e estado das funcionalidades

“Implementado” significa coberto pelos testes indicados, não aprovação para produção. Comportamento de provedores é testado com HTTP controlado, salvo verificação externa explicitamente identificada. Execuções reais em [VALIDACAO.md](docs/VALIDACAO.md) e [AUDITORIA.md](docs/AUDITORIA.md).

| Funcionalidade | Estado e limites | Evidência de teste |
|---|---|---|
| Login e troca obrigatória de senha | Implementado; Argon2, acesso opaco/refresh rotativo e revogação | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Perfis/isolamento por cooperativa | Implementado; produtor vê seus incidentes, cooperativa vê seus membros | `backend/tests/test_backend.py` |
| Produtores/propriedades | Criação/listagem implementadas; edição/exclusão ausentes | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Proximidade espacial | Implementada em PostGIS com pontos/distância; sem polígonos | `backend/tests/test_backend.py` |
| Fotos/localização | JPEG/PNG validado, EXIF removido, foto privada; localização opcional/autorizada, não verificada | `backend/tests/test_local.py`, `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Idempotência | Implementada por UUID/agricultor e lock; navegador preserva bytes/metadata em memória para repetir | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Adaptadores de visão/sinais estruturados | Implementados simulated/Gemini, quatro sinais, seis classes, limitações e versões; qualidade visual não avaliada | `backend/tests/test_vision.py`, `backend/tests/test_backend.py` |
| Conectores ambientais | Open-Meteo/FIRMS implementados, origem/horários/status/avisos/simulação, falha parcial e demo explícito | `dados-api/tests/test_data.py`, `tests/test_integration.py` |
| Evidências por incidente | Snapshot persistido, filtro espacial/temporal, distância/horário/confiança de focos e clima implementados; sem confirmação de fogo | `backend/tests/test_evidence.py`, `backend/tests/test_backend.py` |
| Revisão humana | Transições, notas obrigatórias e trilha implementadas; escalonamento interno | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Interface web estática | Login, foto/GPS, paginação de dez itens, foto autenticada, IA/contexto/revisão e layout móvel implementados | `web/tests/test_browser.py`, `web/tests/client.test.js` |
| Limites compartilhados | Implementados no PostgreSQL; contenção de ataque público/IP cabe ao operador | `backend/tests/test_limits.py` |
| Fotos órfãs | Limpeza manual com dry-run/apply, carência e lock implementada; sem retenção/agendamento automático | `backend/tests/test_cleanup.py` |
| Identidades distintas no banco | Aplicação DML e migrador privilegiado implementados no Compose | `backend/tests/test_provision.py`, inicialização da stack do navegador |
| Resumo/minuta/SOS | Resumo acumulado/contato/minuta implementados; sem envio ou acionamento externo | `backend/tests/test_backend.py`, `backend/tests/test_local.py` |
| Privacidade/LGPD | Checklist e aviso provisório; política, avaliação legal e atendimento completo a direitos pendentes | [Checklist](docs/PRIVACIDADE-LGPD.md) |
| Índice de risco, worker persistente, offline, push, polígonos, INPE/MapBiomas | Não implementados; risco nulo/não validado | Escopo no [relatório de auditoria](docs/AUDITORIA.md) |
| React Native/Expo | Somente integração de referência; sem aplicativo/build completo | `backend/examples/expo-client.ts` |

## Instalação e inicialização

Requisitos: Git, Docker com Compose v2, Python 3 e rede para baixar imagens/dependências. O teste automatizado de navegador exige Linux/Docker. Na branch de desenvolvimento publicada (ainda sem merge em main):

```sh
git clone --branch feat/fase-5-operacao https://github.com/armandor123/terra-firma.git
cd terra-firma
python3 scripts/configure.py
docker compose up --build -d
docker compose exec backend python -m backend.bootstrap \
  --username coop.admin --name "Representante" --cooperative "Cooperativa Demo"
```

O configurador cria `.env` privado sem imprimir segredos ou sobrescrever arquivo existente. Bootstrap solicita senha de 12–128 caracteres; não há conta padrão. Migrações/provisionamento precisam terminar antes do backend. Abra **http://127.0.0.1:8080**, entre, troque a senha inicial e entre novamente. Cadastre produtor/propriedade na tela da cooperativa; use a conta do produtor para enviar foto e a da cooperativa para revisar. [Roteiro completo](docs/INTERFACE.md).

| Serviço | Endereço local padrão |
|---|---|
| Interface e proxy da API na mesma origem | http://127.0.0.1:8080 |
| Swagger / health do backend | http://127.0.0.1:8000/docs / http://127.0.0.1:8000/health |
| Swagger / health de dados | http://127.0.0.1:8001/docs / http://127.0.0.1:8001/health |

`docker compose down` para serviços e preserva volumes. **Acrescentar `--volumes` apaga banco e fotos.** Instalações existentes precisam preservar credenciais/volumes do migrador e acrescentar credenciais distintas da aplicação; [OPERACAO.md](docs/OPERACAO.md) explica atualização e execução Python direta. PostGIS é obrigatório; não há fallback SQLite.

## Configuração

Segredos ficam no servidor, nunca em `web/public` ou variáveis públicas do cliente. Compose lê `.env`; Python direto não.

| Variável | Padrão / regra |
|---|---|
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | Migrador/dono do banco; nome padrão `terra_firma`, senha privada gerada |
| `POSTGRES_APP_USER`, `POSTGRES_APP_PASSWORD` | Identidade DML da aplicação; padrão `terra_firma_app`, senha privada distinta gerada |
| `DATA_API_KEY` | Chave interna backend/dados gerada; mínimo 24 caracteres |
| `DATA_MODE`, `FIRMS_MAP_KEY` | Compose `demo`; `live` exige chave NASA para focos (clima pode funcionar separadamente) |
| `VISION_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL` | `simulated`; `gemini` exige chave privada e modelo explícito compatível |
| `EVIDENCE_RADIUS_KM`, `EVIDENCE_WINDOW_HOURS` | 10 km (1–50), janela retroativa de 24 h (1–96); heurísticas contextuais não calibradas |
| `WEB_BIND`, `WEB_PORT` | `127.0.0.1`, `8080` |
| `BACKEND_BIND`, `BACKEND_PORT`, `DATA_PORT` | `127.0.0.1`, `8000`, `8001`; bind host de dados permanece loopback |
| `DATABASE_URL`, `PHOTO_DIR`, `DATA_API_URL` | Runtime do backend; Compose fornece URL DML, `/app/data/photos`, `http://dados:8001` |
| `APP_DATABASE_USER`, `APP_DATABASE_PASSWORD` | Entradas do provisionamento somente no migrador, vindas das variáveis de identidade DML no Compose |
| `TEST_DATABASE_URL` | Banco exclusivo de testes; nunca usar produção |

Para entradas reais, configure privadamente `DATA_MODE=live`, `VISION_MODE=gemini` e os três ajustes de provedor e recrie backend/dados. Não publique URLs com chaves. `gemini-3.8-flash` funcionou em uma verificação autorizada com imagem sintética; isso não garante disponibilidade na conta nem qualidade de detecção. [Visão](docs/VISAO.md), [cruzamento](docs/CRUZAMENTO.md), [justificativas dos padrões](docs/DECISOES.md).

## Comportamento e limites

Envio multipart de `metadata` JSON e `photo` JPEG/PNG (3.000.000 bytes, 12 MP; corpo total 4.100.000 bytes). UUID, metadata e bytes originais precisam permanecer iguais nos reenvios; reutilização conflitante retorna 409. A foto é reencodificada sem EXIF. Localização é opcional e nunca substituída pelo ponto da propriedade; a referência temporal é o recebimento no servidor, não captura verificada.

Gemini devolve fogo/fumaça/vegetação seca/queimada com presença, confiança declarada e justificativa curta; limitações; classificação; versões de modelo/prompt. Inconclusivo é válido. Confiança declarada não é acurácia medida. Registros antigos continuam legíveis. Novos relatos persistem snapshot/evidência uma vez; reenvio, GET e revisão não consultam novamente. Sem localização ou fonte indisponível/stale, `unavailable` preserva evidências parciais. Focos vazios significam `no_nearby_hotspot`, não ausência de fogo. `consistent` significa apenas contexto compatível. Caixas FIRMS cruzando antimeridiano continuam indisponíveis; as regras de distância tratam ±180°.

Nginx serve arquivos e proxy `/v1/` na mesma origem, com CSP/no-store/nosniff; sem CORS aberto. Tokens somente em memória no navegador. Refresh coordenado; sair limpa memória/foto blob. Sem fila offline, conversão HEIC ou rascunho durável. GPS exige permissão e localhost/HTTPS. Backend exige autorização para dados/fotos. [Interface](docs/INTERFACE.md).

Janelas fixas de 60 s compartilhadas no PostgreSQL: cinco tentativas de login por username (sucesso limpa), 120 requisições autenticadas/usuário, 20 novos uploads/agricultor, 30 refreshes identificados/usuário. Réplicas precisam do mesmo banco/schema. Rotas públicas, tokens inválidos e muitos usernames distintos exigem proteção de gateway/IP; cache de dados é por processo. 429 traz `Retry-After: 60` conservador. Não é proteção DDoS.

Limpeza manual de órfãs (primeiro inspecione):

```sh
docker compose exec backend python -m backend.cleanup_photos
docker compose exec backend python -m backend.cleanup_photos --apply
```

Carência padrão 24 h; só fotos por hash sem referência/temporários abandonados são elegíveis. Fotos referenciadas/novas, arquivos estranhos e symlinks são preservados. Upload e limpeza coordenam locks PostgreSQL; réplicas também precisam compartilhar armazenamento privado. Não há exclusão agendada nem política de retenção de incidentes implementada. [Operação](docs/OPERACAO.md), [privacidade](docs/PRIVACIDADE-LGPD.md).

Compose de desenvolvimento não significa aprovação para produção. HTTPS, contenção no gateway, monitoramento, backup/restauração conjunta de banco/fotos, retenção, responsável/aviso/canal e atendimento a titulares exigem configuração/decisão do operador. Qualidade da IA/associação em campo não foi avaliada.

## Testes e validação real

```sh
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
node --test web/tests/client.test.js
python3 scripts/test_ui.py
```

CI executa esses comandos com PostGIS real e stack demo descartável completa para Chromium. `scripts/test_ui.py` gera credenciais/projeto/volumes próprios e remove apenas essa stack. `python -m pytest -q` local ignora cenários de banco sem `TEST_DATABASE_URL`; testes ignorados não demonstram aprovação integral.

Fase 4 [CI 42436624805](https://github.com/armandor123/terra-firma/actions/runs/42436624805): **103 Python/PostGIS, quatro Node e quatro Chromium aprovados**, nenhum ignorado. Fase 5 [CI 42437604813](https://github.com/armandor123/terra-firma/actions/runs/42437604813), SHA `13bb5bb`: **112 Python/PostGIS, quatro Node e quatro Chromium aprovados**, nenhum ignorado, um aviso Python. Inclui três comparações exatas de contratos. Veja [registro](docs/VALIDACAO.md). OpenAPI backend **2.1.0** e dados **1.0.0** versionados e comparados aos schemas gerados.

Verificações externas separadas: uma chamada Gemini real com imagem sintética e uma consulta real NASA FIRMS/Open-Meteo num ponto de demonstração. Evidências sanitizadas: [visão](docs/vision-live-check.json), [ambiente](docs/firms-live-check.json). **Não foi demonstrado incidente live completo com foto real. Não há porcentagem de acurácia alegada.**

## Repositório e documentação

`backend/`: API, schemas, visão, cruzamento, migrações SQL e testes. `dados-api/`: serviço ambiental independente/testes. `web/`: interface estática/Nginx e testes de navegador/JS. `scripts/`: configuração privada e runner da stack de navegador. `tests/`: integração. [Rotas/setup direto](backend/README.md), [API de dados](dados-api/README.md), [auditoria](docs/AUDITORIA.md), [decisões](docs/DECISOES.md). Documentos anteriores de PRD/Expo/planejamento são contexto histórico, não capacidades adicionais entregues.

Proposta About: **“Terra-Firma: MVP web de relatos com fotos, visão Gemini opcional, contexto NASA FIRMS/Open-Meteo e revisão humana por cooperativas. FastAPI + PostGIS; modo demo explícito.”** About remoto ainda não alterado: integração GitHub disponível não oferece edição e navegador está sem login. Branches de desenvolvimento publicadas; main não recebeu merge automático.

Nenhuma LICENSE de código foi adotada. MIT é somente proposta em [DECISOES.md](docs/DECISOES.md), pendente de decisão dos autores. Fotos/ícones/marcas têm termos próprios. Kit visual externo não está incluído; confirme permissões/créditos antes de reutilizar. Esta interface usa fontes do sistema e monograma de texto, sem esses assets externos.
