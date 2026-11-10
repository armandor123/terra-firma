# Terra Firma — interface web, IA e cruzamento de evidências

## Executar

Requisitos: Docker Engine com Docker Compose. Não precisa instalar Python no host.

Abra o repositório na branch da integração web. Se já tem um `.env` configurado, mantenha-o.

```bash
cd terra-firma
cp -n .env.example .env
```

Edite `.env` com:

- `POSTGRES_PASSWORD`: senha aleatória URL-safe (não use espaços, `@`, `:` ou `/` na URL).
- `DATA_API_KEY`: segredo aleatório com pelo menos 24 caracteres, usado entre os serviços.
- `GEMINI_API_KEY`: chave do Google AI Studio. Nunca coloque esta chave no JavaScript, Git ou chat.
- `GEMINI_MODEL=gemini-2.5-flash`: modelo configurável. A disponibilidade depende da conta/provedor.
- `FIRMS_MAP_KEY`: chave NASA FIRMS para focos reais. Sem ela, o clima continua sendo consultado e os focos aparecem como indisponíveis.
- `DATA_MODE=live`: fontes reais. `demo` retorna dados fictícios explicitamente identificados, excluídos da correlação real.

Gerar cada segredo localmente:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
docker compose up --build -d
docker compose run --rm backend python -m backend.bootstrap --username cooperativa --name "Representante" --cooperative "Minha cooperativa"
```

O bootstrap pede uma senha de pelo menos 12 caracteres (entrada oculta). Acesse **http://localhost:8080**, entre e troque a senha inicial. Não há usuário/senha padrão na aplicação integrada.

1. Como cooperativa, abra **Produtores**, crie um produtor e anote a senha temporária exibida uma única vez.
2. Cadastre uma propriedade vinculada a esse produtor, com município, UF e coordenadas.
3. Saia, entre como produtor, troque a senha e faça login novamente.
4. Em **Registrar foto → Novo relato**, toque em **Abrir câmera**, autorize a câmera no navegador, toque em **Tirar foto** e envie. Use **Permitir localização** se quiser disponibilizar o GPS do aparelho como alternativa.
5. Acompanhe os estados **Na fila → Processando → Concluída**. O worker salva o resultado e o contexto ambiental no banco.
6. Entre como cooperativa para revisar: enviada → em análise → verificada/rejeitada; verificada → escalada internamente. Nenhuma dessas ações aciona autoridades.

O front usa o proxy Nginx na mesma origem, sem exigir CORS nem expor a chave do serviço de dados. `frontend/demo.html` preserva o protótipo original independente, com dados fictícios no navegador. Suas contas e dados não são migrados para o banco real.

### Câmera no computador e no celular

No computador, acesse `http://localhost:8080`. No celular, abra a interface web por HTTPS com um certificado confiável pelo aparelho. O Compose publica o serviço web por HTTP, portanto é preciso colocar um proxy HTTPS na frente dele para acesso pelo celular. A permissão da câmera é solicitada pelo navegador ao abrir a prévia.

Quando o navegador oferece uma captura fotográfica, a página envia seus bytes originais para preservar os metadados disponíveis. Em navegadores que só oferecem vídeo, a página captura um quadro JPEG, que não contém GPS EXIF. Mesmo uma captura fotográfica pode chegar sem GPS. Nesses casos, use **Permitir localização** para consultar o entorno da captura pelo GPS do aparelho.

Para aplicar a mudança em uma instalação existente, execute `docker compose up -d --build` na branch com esta atualização. O serviço `migrate` aplica a migração `003_incident_photo_location.sql` no banco existente.

## Como a análise funciona

- O backend valida a foto (JPEG/PNG, até 3 MB e 12 megapixels), lê o GPS EXIF e reencoda a imagem sem metadados antes de salvá-la em volume privado. O endpoint de foto exige autenticação.
- O upload insere a ocorrência e a tarefa na mesma transação. O UUID de requisição evita duplicidade em reenvios.
- O serviço `worker` busca tarefas com `FOR UPDATE SKIP LOCKED`, reserva por 5 minutos e libera o banco antes das chamadas externas. Tarefas interrompidas são recuperadas após a reserva; até 3 tentativas de recuperação. Falhas conhecidas exigem reenvio manual (intervalo mínimo 60 s).
- O Gemini recebe **somente a imagem reencodificada e a instrução de análise visual**, sem nome, relato, coordenadas ou dados ambientais. Respostas JSON são validadas antes de persistir. Não são inventados percentuais de confiança.
- Classes: possível fogo, possível fumaça, possível área queimada, sem indícios visuais claros ou inconclusiva.
- O cruzamento é determinístico e auditável: calcula distância geográfica até cada foco NASA e considera apenas focos reais dentro de **10 km e 24 horas da consulta**. Meteorologia real deve ter até **3 horas**. Fontes demo, antigas ou indisponíveis não contam como evidência real.
- A consulta usa primeiro o GPS EXIF da foto (`photo_exif`). Sem ele, usa as coordenadas autorizadas do aparelho (`gps`) ou de clientes que informam coordenadas (`manual`). Sem coordenadas, usa o ponto cadastrado da propriedade, identificado como referência. A localização e o horário da captura permanecem sem verificação independente.
- Snapshot, fontes, avisos, modelo e horário são persistidos em `incidents.ai_json`. A IA nunca altera o estado da revisão humana.

Não há previsão de propagação, índice validado de risco, medição de área queimada, confirmação de incêndio, INPE/MapBiomas, despacho ou notificação automática. A consulta ao contexto é NASA FIRMS + Open-Meteo já implementados no serviço de dados. Cadastros abrangem criação/listagem; edição/exclusão permanecem pendentes.

## Chaves e ativação real

- Gemini: https://aistudio.google.com/apikey
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/api/map_key/
- Contrato de imagens: https://ai.google.dev/gemini-api/docs/image-understanding
- Saída estruturada: https://ai.google.dev/gemini-api/docs/structured-output

O uso de IA pode consumir a cota/cobrança da conta. Configure limites no provedor. Depois de mudar chaves no `.env`:

```bash
docker compose up -d --force-recreate worker dados
```

Na ocorrência com falha/indisponível, clique **Tentar análise novamente** após um minuto. Fotos já concluídas não são reenviadas pelo botão para evitar consumo acidental.

## Diagnóstico

```bash
docker compose ps
docker compose logs --tail=80 worker backend dados web
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
```

Sem chave Gemini, a foto fica salva e o resultado diz **Indisponível**; não há IA falsa de substituição. Sem NASA, nenhum foco fictício é apresentado como real. Sem worker, a tarefa permanece na fila. Falha da consulta ambiental não apaga uma análise visual concluída.

## Validação e limites

Testes unitários cobrem contrato multimodal, ausência de chave, resposta inválida/bloqueada, falha HTTP, separação demo/real, distância/tempo e meteorologia antiga. Testes PostgreSQL cobrem persistência do worker, isolamento, idempotência, revisão e retry.

A acurácia do modelo ainda precisa ser avaliada com imagens autorizadas e rotuladas. Testes com provedores simulados verificam a integração, não comprovam qualidade do modelo ou disponibilidade da conta. Este MVP exige revisão humana e não deve ser utilizado como sistema autônomo de emergência.

A sessão web usa sessionStorage, encerrado ao fechar a aba; fotos e senhas não são armazenadas no localStorage do app integrado. Use HTTPS para acesso remoto/câmera/GPS. Para produção ainda são necessários recuperação de senha, limites distribuídos de consumo, monitoramento, política de retenção, backups e revisão do conteúdo de orientação. Não exponha o ambiente local diretamente à internet.


## Validação do pacote original de integração

- 22 testes Python passaram; 15 testes de integração foram pulados por ausência de PostgreSQL/PostGIS local.
- Teste DOM passou: login, tratamento de texto não confiável, upload multipart, resultado, fontes ambientais, logout, troca de senha, cadastro, revisão e minuta. Usa API simulada, sem provar a execução ponta a ponta com banco.
- Sintaxe JavaScript e compilação Python verificadas.
- Teste visual em Chromium preparado, mas não executado: o download do navegador não foi concluído neste ambiente.
- Sem chamadas reais ao Gemini (nenhuma chave fornecida). Não foram medidas precisão, sensibilidade ou taxa de falsos positivos.
- Testes de browser: `cd frontend && npm ci`; iniciar `python3 -m http.server 8088` nesta pasta; em outro terminal, `npm run test:browser`. Requer `npx playwright install chromium`.
- Teste de DOM: `cd frontend && npm ci && npm test`.

O pacote original de integração partiu do commit `2907da03d04dfc1ca46b2aef754db362bd752b2a`.
