# Visão — Fase 2, itens 1 e 2

## Estado real

Implementados `VisionProvider`, `SimulatedProvider`, `GeminiProvider`, seleção por ambiente e contrato Pydantic. O upload agora usa o provedor selecionado e persiste sua saída em `incidents.ai_json`; detalhes e listagem continuam sujeitos à autorização existente. A IA não altera `incidents.status`, que nasce `submitted` e depende da revisão da cooperativa.

**Chamada Gemini real executada com sucesso em 07/11/2026, 21:47 (São Paulo), usando `gemini-3.8-flash` e imagem sintética uniforme criada em memória.** HTTP 200, resposta Pydantic aceita, `completed`, `simulated=false`, `inconclusive`, quatro sinais incertos e revisão obrigatória. [Evidência sem credencial](vision-live-check.json). A chave fornecida pelo usuário foi usada apenas em memória; o modo padrão do servidor permanece simulado. Isso não aprova modelo para uso operacional nem mede acurácia. Testes HTTP controlados continuam separados desta chamada externa.

## Configuração

| Variável | Regra |
|---|---|
| `VISION_MODE` | `simulated` por padrão; somente `simulated` ou `gemini` |
| `GEMINI_API_KEY` | Obrigatória em gemini; somente servidor, enviada em header `x-goog-api-key` |
| `GEMINI_MODEL` | Obrigatória em gemini; ID de modelo com imagem e JSON estruturado. Não existe padrão escolhido sem validação |
| `DATA_MODE` | Continua selecionando apenas os provedores ambientais, independentemente da visão |

No Compose essas variáveis são fornecidas ao backend; não ao aplicativo ou ao serviço ambiental. Em execução direta, exportá-las antes de iniciar a API. Configuração Gemini incompleta ou modo inválido causa erro de inicialização, sem ativar simulação silenciosamente.

Após configurar segredos no `.env` local: `docker compose up --build -d backend`. Não enviar chave em issue, README, foto, código ou cliente. Esta instrução configura uma chamada externa que pode ser cobrada e envia a imagem ao Google; manter `simulated` até a equipe configurar uma conta e fotos autorizadas.

## Contrato persistido

Schema: [`backend/vision-result.schema.json`](../backend/vision-result.schema.json). Classes: [`vision_models.py`](../backend/backend/vision_models.py). Interface/provedores: [`vision.py`](../backend/backend/vision.py).

- `signals`: exatamente `fire`, `smoke`, `dry_vegetation` e `burned_vegetation`.
- Cada sinal: `presence=present|absent|uncertain`, `confidence` entre 0 e 1 ou null e `justification` de 1–240 caracteres. Incerto exige null; presença/ausência exige número. São estimativas subjetivas do modelo, sem calibração e sem equivalência a acurácia medida.
- `image_assessable`: booleano; `limitations`: até oito itens dentre `dark`, `blurry`, `no_sky`, `obstructed`, `low_resolution`, `overexposed`, `cropped`, `other`.
- `classification`: `fire_suspected|smoke_suspected|dry_vegetation|burned_area|no_signs|inconclusive`. Suspeita exige sinal correspondente presente; `no_signs` exige todos ausentes e imagem avaliável. Imagem não avaliável exige inconclusivo. `burned_area` é indício visual de vegetação queimada, não medida de área.
- `status`, `provider`, `simulated`: provenientes do adaptador, não do JSON gerado pelo modelo. Simulação: `simulated/simulated/true`; sucesso Gemini: `completed/gemini/false`; falha Gemini: `unavailable/gemini/false`.
- `model_version`: lida exclusivamente de `modelVersion` da resposta API, obrigatória no sucesso, null na simulação/falha. `requested_model` registra o ID configurado, que pode ser um alias; não é apresentado como versão exata executada.
- `prompt_version=terra-firma-vision-v1`; `schema_version=1.0`; `human_review_required=true`. Alterações futuras no prompt devem incrementar sua versão. A confiança global legada continua null.
- `error_code`: null no sucesso/simulação; falhas usam `timeout`, `authentication_failed`, `rate_limited`, `provider_unavailable`, `invalid_response` ou `blocked_response`, sem copiar erro bruto ou segredo.

Pydantic rejeita campos extras, coerções indevidas, notas vazias, confiança fora da faixa/não finita e classificações incompatíveis. O modelo gera somente `VisualAssessment`; não pode definir origem, versão do prompt, status ou dispensar revisão humana. Bloqueio de segurança, resposta truncada, JSON inválido ou versão de modelo ausente nunca viram `no_signs`.

## Fluxo e preservação das garantias

1. Autenticar, validar metadata/foto e reencodificar JPEG sem EXIF.
2. Autorizar propriedade, adquirir lock por agricultor/UUID e verificar replay/conflito.
3. Guardar foto privada e chamar o provedor com os bytes já limpos. Enviar apenas imagem, instruções e schema; nenhum dado de agricultor/localização/descrição.
4. Validar evidência e persistir o resultado na mesma ocorrência. Falha externa salva resultado indisponível/inconclusivo para revisão humana, sem fallback demo.
5. Retornar ID existente em replay, sem outra chamada ao provedor. O mesmo lock protege reenvios concorrentes.

Registros antigos não são migrados nem reanalisados. O JSON antigo permanece válido como registro histórico, mas não é transformado artificialmente no schema novo. Não há endpoint de reanálise. A minuta agora distingue simulação de análise automática e continua sem envio.

O adaptador é **síncrono**: mantém a transação/lock durante HTTP. Timeout por operação 20 s, conexão 5 s, uma tentativa, sem retry automático ou fallback de modelo. Uma falha do processo/banco após uma chamada externa pode causar nova cobrança ao reenviar antes de um commit; não há garantia de cobrança única. Worker, outbox, retomada após reinício e histórico de reanálise não foram pedidos nos itens 1–2 e permanecem evolução documentada.

## Validação e pendências

Teste local: 49 aprovados, 16 ignorados por falta de banco, 1 aviso; 65 coletados. [CI com PostGIS](https://github.com/armandor123/terra-firma/actions/runs/42429976440) executou todos: **65 aprovados, nenhum ignorado, 1 aviso em 10,57 s**. Evidência de commit/ambiente em [`VALIDACAO.md`](VALIDACAO.md). Inclui testes de quatro sinais/seis classes, limites, configuração, HTTP/timeout/bloqueio/JSON/versão, persistência e fluxo de revisão, foto sem EXIF, autorização e reenvios simultâneos sem nova chamada.

O prompt instrui a ignorar comandos dentro da imagem; os testes verificam instrução e rejeição de campos indevidos, sem medir resistência adversarial do modelo real. Textos gerados pelo modelo devem ser apresentados como texto não confiável, nunca HTML executável.

O adaptador/API foi verificado com uma imagem sintética; falta validar o fluxo completo com foto autorizada e ocorrência real persistida, confirmar versão/status e registrar evidência sem credencial ou imagem privada. A tentativa anterior com gemini-2.5-flash retornou 404; o operador escolheu explicitamente gemini-3.8-flash após conferir sua disponibilidade. Isso não cria fallback automático no código e não comprova qualidade. Avaliação independente rotulada continua necessária para publicar métricas.

A Fase 3 acrescenta snapshot ambiental por incidente e cruzamento espacial/temporal determinístico, preservando clima e classe visual. A consulta atual por propriedade também permanece. Veja [CRUZAMENTO.md](CRUZAMENTO.md). Não há worker, índice de risco ou confirmação de incêndio pela IA; a validação conjunta em campo com fontes reais continua pendente.

## Referências de implementação

- [Gemini generateContent](https://ai.google.dev/api/generate-content)
- [Imagens via generateContent](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding)
- [JSON estruturado via generateContent](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)

REST `v1beta/models/{model}:generateContent`, imagem inline e `generationConfig.responseMimeType/responseJsonSchema`. A documentação principal também descreve Interactions; este adaptador usa explicitamente generateContent. Não foi presumido que todo modelo disponível suporte o mesmo schema sem validação real.
