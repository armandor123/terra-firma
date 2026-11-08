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
