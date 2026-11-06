# Terra Firma integrado

Leia [o guia de instalação e ativação](docs/INTEGRACAO-WEB-IA.md).

1. Copie `.env.example` para `.env`.
2. Preencha POSTGRES_PASSWORD, DATA_API_KEY, GEMINI_API_KEY e FIRMS_MAP_KEY. Use DATA_MODE=live.
3. Execute `docker compose up --build -d`.
4. Crie a cooperativa com o comando bootstrap do guia.
5. Abra http://localhost:8080.

A aplicação não possui login padrão. As contas do protótipo são apenas da página `demo.html`.

Entrega: código integrado e testes preparados. 22 testes Python e teste DOM passaram. PostgreSQL/PostGIS, renderização Chromium e Gemini real ainda precisam ser validados no ambiente de execução. Nenhuma alteração foi publicada no GitHub (a integração recusou escrita com 403).
