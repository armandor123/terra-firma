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
