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
- Resultado local: 24 testes descobertos; 11 aprovados, 13 ignorados e 1 aviso na execução. Configuração YAML inspecionada; Docker ausente impede executar Compose aqui. O primeiro resultado remoto do CI ainda precisa ser observado.
