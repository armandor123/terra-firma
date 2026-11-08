# Privacidade/LGPD — checklist operacional do MVP

Este documento registra controles e decisões pendentes; não é certificação de conformidade nem parecer jurídico. Antes de uso com dados pessoais reais, o responsável pela operação deve concluir e registrar os itens abertos. Permissão de GPS no navegador não substitui a definição da base legal do tratamento.

## Inventário e fluxos existentes

| Dados | Uso e acesso | Proteção/limite atual |
|---|---|---|
| Nome, usuário, cooperativa, propriedade | Autenticação e vínculo; produtor e cooperativa autorizados | Hash Argon2 de senha, troca inicial; isolamento testado |
| Foto, descrição, localização opcional, horário de recebimento | Análise de relato e revisão | EXIF removido; armazenamento privado; GPS não verificado; texto pode conter terceiros |
| Foto reencodificada enviada ao Google | Somente `VISION_MODE=gemini` | Chave no servidor; avaliar condições do provedor, localização do tratamento e transferências antes de habilitar |
| Coordenadas consultadas nos provedores ambientais | NASA FIRMS/Open-Meteo, somente dados live e localização fornecida | Não envia nome/senha/foto para esses provedores; coordenadas continuam potencialmente identificadoras |
| IA, snapshot ambiental, evidência, notas e trilha de revisão | Subsidiar revisão humana | Não confirmam fogo automaticamente; acesso restrito à cooperativa/autor do relato |
| Tokens e limites | Autenticação e contenção de abuso | Tokens aleatórios, hashes no banco; tokens do navegador somente em memória; sujeitos dos limites em SHA-256, que não constitui anonimização garantida |
| Logs, volumes e backups | Operação e recuperação | Ainda exigem política de acesso/retenção e configuração do operador; não registrar Authorization, senhas, chaves, corpos ou URLs FIRMS com chave |

## Antes de dados reais — responsabilidade do operador

- [ ] Identificar controlador, operadores e canal de privacidade; registrar os responsáveis internos e contratos aplicáveis.
- [ ] Definir finalidade, necessidade, base legal adequada, público e eventual avaliação de impacto; revisar envio a terceiros/transferência internacional conforme o caso.
- [ ] Substituir o aviso provisório em `web/public/privacy.html` por aviso que informe responsável, finalidades, compartilhamentos, critérios de retenção e exercício de direitos. Não coletar consentimento genérico sem essa definição.
- [ ] Orientar a fotografar vegetação, evitando rostos, placas, casas e documentos; a aplicação não anonimiza conteúdo visual automaticamente.
- [ ] Aprovar e publicar prazos de retenção distintos para relatos/fotos/revisões, contas, logs e backups, incluindo exceções justificadas e processo de descarte verificável. **Não há prazo aprovado nem expiração automática de incidentes/fotos referenciadas.**
- [ ] Definir atendimento a acesso, confirmação, correção e demais direitos aplicáveis; verificar identidade/vínculo, registrar solicitação e resposta e evitar exposição de outras pessoas/cooperativas. O MVP não fornece portal completo de atendimento/exportação/exclusão.
- [ ] Planejar eliminação/anonimização autorizada, registros relacionados e cópias de segurança; hashes de foto compartilhados exigem verificar todas as referências. Limpeza de órfãs não substitui eliminação de dados de titular.
- [ ] Configurar HTTPS, chaves reais em armazenamento privado, acesso administrativo mínimo, rotação e revogação; testar backup/restauração de banco e fotos em conjunto.
- [ ] Definir monitoramento, resposta a incidentes de segurança e avaliação das comunicações exigíveis; não alegar um prazo legal sem examinar o caso e a regulamentação vigente.
- [ ] Validar operação com usuários, acessibilidade e fotos autorizadas; registrar limites do modelo e manter revisão humana obrigatória.

## Controles técnicos disponíveis

- [x] Login, troca inicial e revogação de sessões; autorização por perfil/cooperativa testada.
- [x] Foto privada e remoção de EXIF; localização opcional e recusável.
- [x] Tokens da interface somente em memória e limpeza ao sair; dados simulados rotulados.
- [x] Identidades separadas de migração e aplicação no Compose, com DML explícito.
- [x] Limites compartilhados no PostgreSQL; limites e lacunas descritos em OPERACAO.md.
- [x] Limpeza de arquivos órfãos com carência, dry-run e lock; execução manual, não agendada.

## Referências oficiais consultadas em 08/11/2026

- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares).
- [ANPD — agentes de tratamento e encarregado](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/anonimizado___guia_de_agente_de_tratamento_e_encarregado_da_anpd_novo.pdf).

Revisar orientações vigentes e requisitos aplicáveis com o responsável jurídico/privacidade da operação. Os itens abertos são bloqueios de preparação operacional, não funcionalidades implementadas.
