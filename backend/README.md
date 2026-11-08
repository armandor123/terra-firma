# Backend oficial — PostgreSQL/PostGIS e mobile

Aplicação FastAPI independente, versão 2.0.0. Para executar junto do projeto de dados, prefira o Compose da raiz. Ele inicia PostgreSQL, aplica migrações e só depois inicia a API.

## Execução sem Docker

Requer Python 3.12, PostgreSQL com PostGIS disponível e banco vazio criado por você. O papel usado pelo migrador deve poder criar a extensão ou ela deve ter sido previamente instalada pelo administrador.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export DATABASE_URL='postgresql://usuario:SENHA_URL_ENCODED@127.0.0.1:5432/terra_firma'
export PHOTO_DIR=./data/photos
export DATA_API_URL=http://127.0.0.1:8001
export DATA_API_KEY='MESMA_CHAVE_DO_SERVICO_DE_DADOS'
python -m backend.migrate
python -m backend.bootstrap --username coop.admin --name 'Representante' --cooperative 'Cooperativa Demo'
python -m uvicorn backend.main:create_app --factory --host 127.0.0.1 --port 8000
```

No PowerShell, ative `.venv\Scripts\Activate.ps1` e use `$env:NOME = 'valor'`. `.env` não é carregado automaticamente pelo Python; o Compose carrega a configuração da raiz. O backend não cria tabelas no startup: migração é um passo explícito.

## Autenticação

Login retorna access token (15 minutos) e refresh token (até 30 dias a partir do login). Ambos são opacos e aleatórios; o banco guarda apenas hashes. Refresh troca ambos os tokens, invalida o acesso anterior e registra o refresh usado. Reutilização de um refresh antigo revoga a sessão correspondente. A renovação não prolonga indefinidamente os 30 dias.

O aplicativo deve manter apenas uma renovação em andamento. Se a resposta de refresh se perder depois do servidor processar a troca, pode ser necessário fazer login novamente; a versão atual não fornece período de tolerância. Troca de senha revoga todas as sessões; logout revoga a sessão apresentada. Com acesso expirado, renove antes de solicitar logout remoto. Se o aparelho estiver offline, apagar tokens locais não garante revogação remota.

## Rotas

| Método | Caminho | Perfil |
|---|---|---|
| POST | /v1/auth/login | público, credenciais |
| POST | /v1/auth/refresh | público, refresh válido |
| GET | /v1/me | autenticado |
| POST | /v1/auth/password | autenticado |
| POST | /v1/auth/logout | autenticado |
| POST/GET | /v1/farmers | cooperativa |
| POST | /v1/properties | cooperativa |
| GET | /v1/properties | propriedades autorizadas |
| GET | /v1/properties/nearby | cooperativa |
| GET | /v1/properties/{id}/environment | acesso à propriedade |
| POST | /v1/incidents | agricultor, multipart |
| GET | /v1/incidents | registros autorizados, limit/offset |
| GET | /v1/incidents/{id} | acesso à ocorrência |
| GET | /v1/incidents/{id}/photo | acesso à ocorrência |
| PATCH | /v1/incidents/{id}/review | cooperativa responsável |
| GET | /v1/incidents/{id}/notification-draft | cooperativa responsável |
| GET | /v1/reports/summary | cooperativa |
| GET | /v1/sos | público |

## Banco e fotos

`backend/migrate.py` aplica arquivos SQL de `backend/migrations`. Uma tabela controla versão e checksum; alterar uma migração já aplicada causa falha. Para evoluir, crie outro arquivo numerado. A execução usa transação e lock para evitar migrações concorrentes. Não inclui downgrade automático nem importação do SQLite antigo.

O app usa psycopg 3 com parâmetros vinculados. `location` é gerado pelo banco a partir das coordenadas: longitude vem antes da latitude em `ST_MakePoint`. Consulta de proximidade usa `ST_DWithin`/`ST_Distance`, com `geography` e metros. Propriedades continuam representadas por pontos; polígonos ainda não foram implementados.

As imagens não ficam no PostgreSQL. `PHOTO_DIR` contém arquivos JPEG privados, com nomes derivados do conteúdo e escrita atômica. A API autentica e autoriza a leitura; não publique essa pasta como diretório estático. Em implantação com múltiplas instâncias, use volume compartilhado ou um adaptador de object storage privado. Backup deve abranger banco e arquivos. Uma falha após salvar arquivo e antes do commit pode deixar arquivo órfão; limpeza periódica ainda não foi implementada.

## Testes

Na raiz, `compose.test.yaml` executa todos os testes com um PostgreSQL/PostGIS isolado. Se já tiver banco de testes:

```bash
export TEST_DATABASE_URL='postgresql://usuario:senha@127.0.0.1:5432/terra_firma_test'
python -m pytest -q backend/tests tests/test_integration.py
```

Execute esse comando na raiz. Cada cenário cria/remove somente seu próprio schema com nome aleatório. O banco precisa permitir criar schemas e ter PostGIS. Sem `TEST_DATABASE_URL`, os cenários de banco são explicitamente ignorados, não aprovados.

## Visão — Fase 2

O upload seleciona `VisionProvider` por `VISION_MODE=simulated|gemini`. O padrão é simulado. Gemini exige `GEMINI_API_KEY` e `GEMINI_MODEL` somente no servidor; sem ambos, o modo gemini não inicializa. O JPEG reencodificado sem EXIF é enviado após autorização/deduplicação; a saída Pydantic é salva em `ai_json`, sem modificar o status de revisão humana. Não há chamada Gemini real validada nesta entrega nem avaliação de qualidade.

Veja [`docs/VISAO.md`](../docs/VISAO.md) para contrato, campos de confiança, instruções de configuração, comportamento indisponível/inconclusivo e limitações da chamada síncrona. O schema está em [`vision-result.schema.json`](vision-result.schema.json). Credenciais não devem ir ao app. `DATA_MODE` não seleciona visão. Não há fila/worker/reanálise ou cruzamento ambiental automático.

## Limites operacionais

MVP, sem recuperação de senha, MFA, push, auditoria completa de acesso, retenção automática ou processamento assíncrono de imagens. Limite de login em memória, por processo. Em produção, separar credenciais de migração/aplicação, configurar HTTPS, pool de conexões, limites distribuídos, monitoração e restauração de backups. CORS precisa de configuração explícita se houver cliente web; app nativo não depende de CORS do navegador.
