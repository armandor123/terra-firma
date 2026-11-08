# Decisões de execução

## 07/11/2026 — Escopo da Fase 0

- A instrução específica de auditoria sem alterar código prevalece nesta etapa. Não implementar adaptador, worker, cruzamento, migração ou novas regras. Correções documentais são permitidas; eventuais falhas reproduzidas exigiriam commits separados antes de avançar.
- Não avançar para outra fase enquanto faltar a execução integral PostgreSQL/PostGIS. Docker ausente é bloqueio do ambiente, não aprovação nem falha comprovada da aplicação. Registrar `skipped` sem convertê-lo em aprovação.
- Auditar o checkout público atual de `armandor123/terra-firma`, base `1825555f9a714ffab131a3e7796f4223bb753944`, em vez de ZIPs históricos. Trabalho local em branch própria; nenhuma alteração do About, push ou merge efetuados.
- Padronizar o documento português como `README.pt-BR.md`, o nome já usado pelo link de idioma. Preservar Markdown e traduzir as ressalvas de estado igualmente nos dois idiomas.
- Manter arquivos de teste, `resultado-testes.txt` e contratos existentes; nesta fase, registrar inconsistências em vez de reorganizar código. O log antigo não tem proveniência suficiente para substituir execução atual.
- Não atribuir licença sem definição dos titulares. Ausência de `LICENSE` permanece explícita.
- Tratar web/Gemini como proposta, Expo como cliente de referência e o código das APIs como implementação existente. Não considerar a apresentação como comprovação de capacidades.
- Não escolher modelo, janela de correlação ou métrica de qualidade na auditoria. A futura correlação precisará distinguir horário de recebimento de horário de captura; hoje só o primeiro existe no contrato. Uma análise nunca deve alterar sozinha o status de revisão humana.

## 07/11/2026 — Fase 1: higiene e CI

- A solicitação explícita da Fase 1 autoriza a higiene e a configuração do CI enquanto a validação completa da Fase 0 permanece pendente. Isso não libera implementação de IA nem declara o banco validado.
- `README.pt-BR.md` e os links de idioma já estavam corrigidos pela Fase 0; preservar o nome e verificar os links. Sincronizar os dois READMEs com o estado real desta fase.
- Remover `resultado-testes.txt` somente do índice Git (`git rm --cached`) e adicioná-lo ao `.gitignore`, preservando a cópia local. O histórico Git anterior permanece intacto.
- Mover o teste solto para `tests/test_integration.py`, compatível com a descoberta padrão. Manter testes de cada serviço em suas pastas. `conftest.py` fica na raiz para compartilhar a fixture PostgreSQL entre todos; movê-lo apenas para `tests/` retiraria a fixture dos testes em `backend/tests/`. `pytest.ini` é configuração, não teste solto.
- Usar `python -m pytest -ra -q` como comando canônico, com as três pastas em `testpaths`. Remover do teste movido as alterações manuais de `sys.path`; o `pythonpath` existente no pytest.ini resolve os dois serviços.
- Reutilizar `compose.test.yaml` no CI para evitar duas definições de ambiente divergentes. O banco de testes usa tmpfs, credenciais fictícias próprias, PostGIS e healthcheck; não usa o banco de desenvolvimento. O serviço `tests` recebe `TEST_DATABASE_URL` e aguarda o banco saudável. Falha de conexão/migração gera erro, sem fallback de banco.
- Executar CI em push, PR e manualmente; limitar permissões a leitura, fixar checkout por SHA, limitar duração, publicar diagnóstico nos logs em falha e limpar containers/volumes sempre. Provedores são controlados nos testes: nenhum segredo NASA/IA necessário.
- Resultado local: 24 testes descobertos; 11 aprovados, 13 ignorados e 1 aviso na execução. Configuração YAML inspecionada; Docker ausente impede executar Compose aqui. O resultado remoto posterior foi observado: 24 aprovados, nenhum ignorado e 1 aviso em 6,49 s; [execução 42428442702](https://github.com/armandor123/terra-firma/actions/runs/42428442702), commit `4eb09cc86ed3101e1335f180fb84a6439270c714`.

### Proposta de licença — PENDENTE, não adotada

**Recomendo avaliar MIT** se a intenção dos autores for permitir reutilização ampla do código do hackathon, inclusive modificações e redistribuição, mantendo os avisos de copyright e de licença. Essa condição consta do [texto oficial MIT publicado pela Open Source Initiative](https://opensource.org/license/mit).

Esta é uma proposta para decisão da equipe/titulares. **Nenhum arquivo `LICENSE` foi criado e nenhuma licença foi aplicada.** Antes de adotar, confirmar concordância dos titulares e identificar corretamente os detentores dos direitos. Caso a equipe queira impor outras condições ao código derivado, revisar a escolha antes da adoção. Fotos, ícones, marcas, dados e dependências mantêm suas condições próprias; a proposta não os relicencia.

Decisão pendente: os titulares aceitam MIT para o código autoral do projeto? Responsável pela aprovação: equipe/titulares do Terra-Firma. Não interpretar esta recomendação como aprovação.

### Sugestão de About — não publicada

> Terra-Firma: MVP de combate ao desmatamento com foco em queimadas. Relatos com fotos, revisão por cooperativas e conectores NASA FIRMS/Open-Meteo. FastAPI + PostGIS. IA de imagem e cruzamento automático ainda planejados.

Texto proposto para substituir a descrição centrada em um aplicativo mobile. Reflete APIs existentes e capacidades futuras, sem alegar detecção real, métricas de acurácia ou interface pronta. A descrição remota não foi alterada.

## 07/11/2026 — Publicação e execução autorizadas

- Após autorização do usuário e conexão ao GitHub, publicar as Fases 0/1 em `chore/fase-1`, preservando `main`, licença e About.
- Publicação por objetos Git via API; preservar os cinco commits lógicos e comparar cada árvore com a revisão local. SHAs de commits mudam; conteúdo não muda.
- Registrar a execução real em `VALIDACAO.md` e nos dois READMEs. A suíte integral de banco passou; startup do Compose de desenvolvimento permanece pendente.

## Fase 2 — Visão estruturada (itens 1 e 2)

- Conferir Fase 1 na branch publicada `chore/fase-1`, SHA `a796bb5`: README/links, log ignorado, teste em `tests/`, licença apenas proposta e About apenas sugerido. [CI final 42428636894](https://github.com/armandor123/terra-firma/actions/runs/42428636894) confirmado com sucesso, 24 aprovados. Nenhum item solicitado da Fase 1 exige adoção de licença ou mudança de About.
- Criar visão no backend, que já possui a foto limpa e o vínculo autorizado. Não transferir fotos privadas entre serviços para implementar apenas esta interface. HTTPX já instalado basta para o adaptador REST Gemini; não adicionar SDK sem necessidade.
- `VISION_MODE=simulated` mantém o padrão. `gemini` exige chave e ID de modelo explícitos; não escolher um alias/modelo sem credencial e validação. Nenhuma credencial/modelo configurados nesta entrega, portanto não declarar chamada Gemini real executada.
- Implementar saída estrita com quatro sinais, seis classificações, limitações, versão real retornada pelo provedor e versões de prompt/schema controladas pelo servidor. Confiança por sinal é estimativa do modelo, não métrica de qualidade. Sinal incerto usa confiança nula; não inventar porcentagens.
- Ligar o adaptador ao upload após autorização/deduplicação, usando JPEG sem EXIF. Para o escopo dos dois itens, escolher execução síncrona com uma tentativa HTTP; documentar latência, lock e possibilidade de repetir cobrança após rollback/crash. Não declarar fila durável ou garantia de execução externa única.
- Timeout/erro/bloqueio/JSON inválido mantêm relato e revisão possíveis, com `unavailable`, `simulated=false`, `inconclusive`, sinais desconhecidos e código controlado. Não usar simulação de fallback. Modo inválido ou credencial/modelo ausente falham no startup.
- Não alterar migração aplicada nem reescrever `ai_json` de relatos antigos. Reaproveitar coluna JSONB; o novo schema vale para novas análises. Replay não reanalisa; reanálise e processamento persistente permanecem fora desta etapa.
- Garantir `human_review_required=true`; não mudar transições de revisão. Atualizar a minuta para não chamar análise Gemini de simulada. `burned_area` é somente classe visual, não hectares ou confirmação.
- Manter o cruzamento FIRMS/Open-Meteo pendente. Nenhum resultado de teste com transporte controlado deve ser apresentado como prova de inferência ou acurácia real. Detalhes e evidências em `VISAO.md`/`VALIDACAO.md`.

- Evidência remota da Fase 2: [CI 42429976440](https://github.com/armandor123/terra-firma/actions/runs/42429976440), SHA `01ae50dab2e1649a0317bc1069e12b6558c3c6ec`: 65 aprovados, nenhum ignorado, 1 aviso em 10,57 s. Isso valida regressão técnica com PostGIS e HTTP controlado, sem comprovar inferência Gemini real ou qualidade visual.

## 07/11/2026 — Verificação externa com chave autorizada

- Usar a chave fornecida somente em memória no processo de verificação, sem salvar em .env, CI, commits ou evidência. Manter o padrão simulado; não alterar configuração de produção ou permissões da conta.
- Usar uma imagem sintética uniforme própria para testar o protocolo sem enviar fotos privadas de terceiros. Não tratar o teste como avaliação de detecção de fogo.
- Metadados listaram gemini-2.5-flash, mas a geração retornou 404. Escolher explicitamente gemini-3.8-flash, também listado e descrito na documentação atual, para uma segunda tentativa manual: sucesso HTTP 200 e saída Pydantic válida/inconclusiva. Não implementar fallback/retry automático nem afirmar que a listagem garante geração para qualquer modelo.
- Registrar apenas evidências sanitizadas e tempos observados. Uma chamada não mede acurácia/calibração e não valida persistência de ocorrência real de ponta a ponta. Testes controlados e externos permanecem separados.

## Fase 3 — Snapshot e cruzamento determinístico

- Antes de avançar, confirmar os itens 1–2 da Fase 2 na base publicada `c614b6d`: interface/adaptadores, quatro sinais/seis classes e validação/versionamento implementados; [CI final](https://github.com/armandor123/terra-firma/actions/runs/42431574627) com 65 testes aprovados e evidência de chamada Gemini real sintética em `vision-live-check.json`. Qualidade em fotos reais não foi medida e não será alegada.
- Usar **coordenadas do incidente**, nunca substituir automaticamente pela propriedade. Sem localização, aceitar relato e persistir snapshot `no_location`/evidência `unavailable`, sem consulta externa. A localização continua não verificada.
- Referência temporal: recebimento/processamento inicial pelo servidor em UTC, antes de visão/ambiente, persistido em `created_at` e `evidence.reference_at`. Não há horário de captura; não assumir que envio e fotografia ocorreram juntos. A janela é somente retroativa e inclusiva; foco posterior à referência é excluído.
- **Padrão raio 10 km**, configurável 1–50 por `EVIDENCE_RADIUS_KM`: reutiliza o raio padrão já admitido no dados-api e fornece contexto regional em torno de um ponto declarado. É uma escolha operacional de MVP, não alcance de incêndio, polígono da propriedade ou limiar calibrado de detecção.
- **Padrão janela 24 h**, configurável 1–96 por `EVIDENCE_WINDOW_HOURS`: contexto de observações recentes, com revisão de diferenças temporais explícitas, sem inventar correlação exata. Também é heurística não calibrada, sujeita à passagem/cobertura e latência das fontes.
- Solicitar `ceil(window_hours/24)+1` dias ao dados-api (2 no padrão, até 5), com um dia de margem para bordas diárias UTC; filtrar novamente os pontos retornados pela janela exata no backend. O máximo de 96 h respeita o limite existente de 5 dias com essa margem. Não afirmar cobertura completa do período por essa consulta.
- Recalcular Haversine a partir das coordenadas do foco e do relato, sem confiar em `distance_km` upstream. Preservar horário/confiança categórica/FRP e fontes; nunca converter confiança VIIRS em porcentagem de acerto ou FRP em hectares.
- `consistent` significa somente foco espacial/temporal compatível e ambas as fontes ok, sem confirmar a imagem. Sem foco compatível, `no_nearby_hotspot` não invalida o relato. Fonte stale/unavailable ou sem localização resulta em `unavailable`; preservar evidência parcial e nunca gerar índice/nível de risco. Divergência com `ai.classification=no_signs` gera aviso para revisão, não nova classificação.
- Preservar simulação por fonte e no agregado (`simulated=true` se qualquer entrada for simulada), sem substituir falha por demo. Demo ambiental tem data fixa de janeiro e pode ficar fora da janela: isso é esperado, identificado e não é ausência real de fogo.
- Reutilizar consulta assíncrona interna por ponte AnyIO no worker HTTP síncrono existente; sem nova fila. Chamar após autorização/deduplicação e persistir os dois JSONB junto da ocorrência. Replays e GETs não atualizam o snapshot nem repetem consulta. Registrar limitação de latência/lock e possível repetição de chamadas após falha antes do commit.
- Migração **nova 002**, sem modificar 001, com campos nullable para preservar histórico; não buscar dados atuais para preencher relatos antigos. Validar envelopes independentemente para que uma falha não apague a outra fonte. Query retornada deve coincidir com a solicitada.
- Backend/OpenAPI **2.1.0**, resposta tipada de detalhe com versão explícita e campos adicionais nullable. Manter rotas v1, metadata, IA histórica e isolamento existentes; contrato anterior permanece no histórico Git. Dados-api continua 1.0.0 sem mudança de conector.
- Manter a indisponibilidade explícita do conector FIRMS quando a caixa cruza o antimeridiano; testar preservação parcial e distância entre longitudes +/−180. Não alegar suporte NASA em duas caixas, que não foi implementado nesta etapa.

## 07/11/2026 — Verificação FIRMS real autorizada

- Usar a MAP_KEY fornecida apenas em memória, sem salvar em .env, logs, CI, commits ou URLs publicadas. Não mudar configurações de produção nem padrões demo/simulated.
- Consultar coordenadas públicas de demonstração perto de Campinas, sem dados de agricultor/propriedade privada, através do dados-api live e EnvironmentClient reais. NASA FIRMS e Open-Meteo responderam HTTP 200 e envelopes ok/simulated=false. FIRMS retornou lista vazia válida, preservada como lista vazia e no_nearby_hotspot, sem afirmar ausência de fogo.
- Manter visão simulada nessa verificação para testar somente o contexto ambiental; o agregado simulated=true indica essa entrada e não altera a origem real dos dois envelopes. Não reutilizar o resultado da imagem sintética anterior como se tivesse localização verificada.
- Registrar snapshot sanitizado em firms-live-check.json e limites em VALIDACAO.md. Sem ocorrência persistida ou associação positiva em campo, não declarar o fluxo real completo validado nem medir acurácia. A limitação do antimeridiano permanece.

## Fase 4 — Interface mínima e sessão

- Usar JavaScript nativo e Nginx com proxy da mesma origem, sem build/CDN/CORS amplo. Servir somente páginas, API v1, contrato e health; Swagger continua na porta local do backend.
- Tokens ficam somente em memória: recarregar exige novo login. Não criar fila offline nem persistir foto/segredos no navegador. Refresh é único por sessão e não pode ressuscitar logout.
- Permitir relato sem localização. Geolocalização só por ação explícita, com recusa visível e sem substituição por coordenadas da propriedade. Imagens HEIC/compressão ficam fora deste escopo.
- Manter UUID, arquivo e metadados congelados para repetição após falha de rede; informar o risco ao descartar. A API continua dona da idempotência e autorização.
- Acrescentar cadastro mínimo de produtor/propriedade na cooperativa para uso desde bootstrap sem chamadas manuais de API. Senha temporária aparece uma vez; revisão humana segue transições existentes.
- Marcar qualquer objeto com simulação, inclusive snapshots mistos e legados. Ausência/indisponibilidade de evidência não vira ausência de risco.
- Validar navegador contra Nginx/PostGIS/serviços reais em demo em stack descartável, sem substituir por mocks. A validação live com foto real continua separada e pendente.

## Fase 5 — Segurança e operação

- Reutilizar PostgreSQL em vez de adicionar Redis ao MVP: UPSERT/transação própria e relógio do banco compartilham janelas entre réplicas no mesmo banco/schema. Limites fixos em 60 s: login 5/username, API 120/usuário, novos uploads 20/agricultor, refresh identificado 30/usuário. Sucesso de login limpa contador; replay não conta novo upload. Valores operacionais não dimensionados; proteger IP/rotas públicas/novos usernames no gateway antes de exposição pública. Banco indisponível não vira fallback local.
- Carência de órfãs 24 h, configurável >=1 h, com dry-run por padrão e --apply explícito. Limpeza manual, sem cron. Preservar referências globais por hash, arquivos novos/estranhos/symlinks; lock exclusivo serializa com lock compartilhado do upload até commit. Timeout 5 s limita espera do limpador. Não implementar retenção de relatos sem decisão do operador; isso não é limpeza de dados de titular.
- Preservar usuário/senha existentes do migrador sobre volumes já inicializados. Acrescentar identidade DML dedicada e senha distinta, fornecida só ao backend. Provisionar após migrações com grants explícitos, sem herdar papéis nem ser dono de objetos; rejeitar identidades pré-existentes privilegiadas. Não logar SQL com senha ou variáveis secretas. Banco dedicado; sem mudança automática no volume antigo/credenciais de proprietário.
- Checklist LGPD separa controles técnicos, aviso provisório e decisões do controlador (retenção, base legal, responsáveis, transferências e direitos); não declarar conformidade ou prazo de retenção aprovado.
- Consolidar os READMEs EN/PT-BR no estado entregue, com teste por funcionalidade e limites explícitos. Marcar planos anteriores como referência histórica; não apresentar Expo como app entregue. Contratos HTTP permanecem 2.1.0/1.0.0; teste compara ambos e metadata aos gerados.
- About proposto atualizado: "Terra-Firma: MVP web de relatos com fotos, visão Gemini opcional, contexto NASA FIRMS/Open-Meteo e revisão humana por cooperativas. FastAPI + PostGIS; modo demo explícito." Não foi alterado remotamente: a integração não oferece edição e o navegador retornou página sem autenticação em 08/11/2026. Não confundir proposta salva com edição concluída.
- Não declarar aceite live completo com base em duas consultas externas separadas; falta foto real autorizada → Gemini → snapshot real persistido → revisão na mesma ocorrência. Não salvar chaves fornecidas em git/CI para viabilizar demonstração. As branches seguem publicadas sem merge automático em main.
