# Interface web — Fase 4

HTML/CSS/JS nativos em `web/public`, sem bundler, servido por Nginx. A interface usa somente `/v1/` na mesma origem; Nginx preserva o caminho e o Bearer do usuário. Nenhuma chave de dados, Gemini, FIRMS ou banco entra no frontend. Sem CORS aberto. Backend e dados continuam expostos somente no loopback por padrão.

## Do zero (Docker Compose v2)

```sh
python scripts/configure.py
docker compose up --build -d
docker compose exec backend python -m backend.bootstrap \
  --username coop.admin --name "Representante" --cooperative "Cooperativa demo"
```

O configurador não sobrescreve `.env`. Bootstrap solicita senha sem eco (12–128 caracteres), sem conta padrão. A opção `--password-stdin` é para automação sem senha em argumento; nunca use senha literal no histórico do shell.

1. Abra http://127.0.0.1:8080. Entre, troque a senha inicial e entre novamente (sessões são revogadas).
2. Na cooperativa, abra Cadastros, crie produtor e guarde a senha temporária exibida uma vez. Cadastre uma propriedade associada ao produtor.
3. Saia e entre como produtor; troque a senha temporária. Selecione a propriedade e foto JPEG/PNG até 3 MB. Localização é opcional e solicitada somente pelo botão; recusa não impede envio.
4. Envie e abra o detalhe. IA não confirma fogo: observe sinais, confiança declarada, limitações, versão, fontes, horários e avisos. Dados simulados são rotulados, inclusive entradas mistas.
5. Entre como cooperativa e revise com notas. Lista tem dez itens por página. Transições seguem a API; escalonamento é registro interno, sem envio externo.

## Sessão, privacidade e falhas

Tokens somente em memória, refresh coordenado e foto privada recuperada com Bearer como blob. Sair revoga a sessão quando o servidor responde e sempre limpa memória/foto; fechar/recarregar exige login. Sem fila offline. Envio usa UUID e mantém foto/metadata em memória para reenviar após resposta perdida; não gere outro relato sem verificar a lista. Campos ficam congelados durante a tentativa; recarregar perde a tentativa. Nenhuma conversão HEIC/compressão/câmera nativa está implementada. Descrições e notas entram como texto, sem HTML.

Nginx limita corpo e adiciona CSP, no-store, nosniff e proteção contra frames. Geolocalização exige contexto seguro (localhost ou HTTPS) e autorização do navegador. Para acesso público, configurar HTTPS e revisão operacional; não abrir backend/dados/banco à internet. `WEB_BIND` e `WEB_PORT` configuram publicação; por padrão 127.0.0.1:8080. O aviso `web/public/privacy.html` é provisório: exige responsável, finalidade/base legal, retenção e canal antes de dados pessoais reais.

## Testes

```sh
node --test web/tests/client.test.js
python3 scripts/test_ui.py
```

O segundo comando requer Docker em Linux, rede host e portas disponíveis. Cria stack Compose com nome/volumes/credenciais de teste exclusivos, faz bootstrap, sobe Chromium/Playwright e testa jornada completa demo, paginação, reenvio após resposta perdida e tela móvel com recusa de localização. Ao terminar remove somente os volumes dessa stack. O CI executa também toda suíte Python com PostGIS. A imagem Playwright é fixada na mesma versão do pacote Python. Não usa credenciais reais nem prova qualidade do Gemini ou fluxo live completo.

Resultado local: 81 aprovados, 22 ignorados (PostGIS indisponível local), 1 aviso; quatro testes Node aprovados. [CI 42436624805](https://github.com/armandor123/terra-firma/actions/runs/42436624805), SHA f45e67d: 103 Python/PostGIS aprovados em 12,45 s, nenhum ignorado, um aviso; quatro JavaScript e quatro Chromium aprovados (7,29 s). A stack de desenvolvimento iniciou do zero e bootstrap funcionou. Nenhuma chamada live foi feita nesses testes. API/OpenAPI 2.1.0 permanecem inalterados nesta fase.
