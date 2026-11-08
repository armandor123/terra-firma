# Escopo atual e evolução — versão 2

Base: PRD fornecido e decisões posteriores do usuário (mobile com Expo/React Native e PostgreSQL). A entrega mantém dados/APIs e backend de contingência separados.

| Item | Estado atual |
|---|---|
| PostgreSQL/PostGIS | suíte integral da Fase 1 executada em CI com banco real; startup do Compose de desenvolvimento ainda pendente. Evidências em VALIDACAO.md |
| Consulta espacial | endpoint PostGIS de propriedades próximas, limitado à cooperativa |
| Dados ambientais | serviço independente; Open-Meteo e NASA implementados, demo explícito |
| Login/perfis | Argon2, tokens opacos, troca inicial, isolamento de cooperativas |
| Sessões mobile | refresh com rotação/revogação e access de 15 minutos |
| Agricultores/propriedades | criação/listagem; edição/exclusão pendentes |
| Fotografias | upload multipart real, reencodificação e volume privado |
| Localização | input e validação de autorização; solicitação no aparelho pendente |
| Reenvios | deduplicação por UUID por agricultor e bloqueio concorrente |
| Fila offline no aparelho | não implementada; contrato preparado |
| Histórico e revisão | listagem paginada, detalhes e trilha de revisão |
| Relatórios | resumo cumulativo; filtros temporais/exportação pendentes |
| IA | Visão simulada/Gemini selecionável e saída estruturada; uma chamada real sintética validada, sem avaliação de qualidade em campo; veja VISAO.md |
| Cruzamento | Snapshot por incidente e regras espaciais/temporais implementados; fontes parciais/simulação preservadas, revisão humana obrigatória; veja CRUZAMENTO.md |
| Risco de incêndio | sem classificação até método/fonte validado |
| SOS/minutas | contato/minuta sem despacho ou envio |
| App mobile | tecnologia definida e cliente de referência; sem telas/APK/IPA |
| Push | não implementado |
| Polígonos | não implementados; localização atual é ponto |

## Próximos passos objetivos

As quatro etapas de IA e validação estão detalhadas em [PLANO-IA-E-TESTES.md](PLANO-IA-E-TESTES.md): selecionar/preparar o modelo; implementar processamento real; executar testes técnicos e avaliação; atualizar evidências e liberar piloto controlado.

1. Executar os testes atuais com PostgreSQL/PostGIS e corrigir falhas.
2. Reunir imagens autorizadas, definir rotulagem e reservar avaliação independente.
3. Escolher fornecedor/modelo, orçamento e credencial de servidor.
4. Evoluir adaptadores já implementados para tarefas persistentes e validar fluxo em campo.
5. Executar testes de integração e qualidade; registrar métricas e limites.
6. Conectar o app Expo e validar câmera/GPS, offline, sessão e estados de análise.
7. Atualizar documentação/PRD e avaliar liberação do piloto com revisão humana.

NASA real, fila offline, histórico ambiental longitudinal e push permanecem frentes adicionais. Snapshots por incidente estão implementados; evidências de testes ficam em VALIDACAO.md.

## Produção

Separar papéis de migração e aplicação no PostgreSQL, aplicar HTTPS e limites no proxy, substituir limitador em memória por controle distribuído, monitorar erros, testar restauração de banco e fotos, escolher armazenamento privado compartilhado e gerenciar segredos. Migração SQL atualmente é somente para frente, sem rollback automatizado. Os requirements fixam dependências diretas; gerar lock transitivo e auditoria em CI.

INPE/MapBiomas, classificação real de imagem, índices de risco, modelagem de propagação e integrações formais com autoridades permanecem fora do escopo executado. Benefícios fiscais e multas citados na seção futura do PRD também não foram implementados.
