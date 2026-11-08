# Terra-Firma

[Português (Brasil)](README.pt-BR.md) · [Repository](https://github.com/armandor123/terra-firma)

An MVP for farmer photo reports and cooperative review. A static web interface served by Nginx calls a FastAPI backend with PostgreSQL/PostGIS. Vision is selectable (`simulated` or Gemini); each new incident receives an environmental snapshot and deterministic satellite/weather evidence. **AI never confirms a fire alone. Human review remains required.**

Group 13, Reboot the Earth 2026: Feliphe Coutinho, Taciára Mendes, Victor Hinoue and Armando de Almeida. Independent participant project; trademarks belong to their owners.

Default configuration is **demo environmental data + simulated vision**. The UI displays **DADOS SIMULADOS** whenever any input has `simulated=true`. Live failure stays unavailable; it never falls back to simulated data or means “no risk”. No accuracy metrics have been measured.

## Scope and feature status

“Implemented” means covered by the referenced tests, not production approval. Provider behavior is tested with controlled HTTP responses unless explicitly identified as an external check. Current execution evidence is in [VALIDACAO.md](docs/VALIDACAO.md) and [AUDITORIA.md](docs/AUDITORIA.md).

| Feature | Status and limits | Test evidence |
|---|---|---|
| Login and mandatory password change | Implemented; Argon2, opaque access/rotating refresh, session revocation | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Roles/cooperative isolation | Implemented; farmer sees own incidents, cooperative sees its members | `backend/tests/test_backend.py` |
| Farmers/properties | Implemented creation/listing; editing/deletion absent | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Spatial proximity | Implemented PostGIS point/distance queries; no property polygons | `backend/tests/test_backend.py` |
| Photos and location | Implemented JPEG/PNG validation, EXIF removal, private storage; optional authorized location, unverified | `backend/tests/test_local.py`, `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Retry idempotency | Implemented per-farmer UUID and concurrency lock; browser preserves pending bytes/metadata in memory | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Vision adapters/structured signals | Implemented simulated/Gemini, four signals, six classes, limitations, model/prompt versions; visual quality unevaluated | `backend/tests/test_vision.py`, `backend/tests/test_backend.py` |
| Environmental connectors | Implemented Open-Meteo and FIRMS, source/time/status/warnings/simulation, partial failures and explicit demo | `dados-api/tests/test_data.py`, `tests/test_integration.py` |
| Incident evidence | Implemented persisted snapshots, radius/time filtering, hotspot distance/time/confidence and weather; no fire confirmation | `backend/tests/test_evidence.py`, `backend/tests/test_backend.py` |
| Human review | Implemented allowed transitions, mandatory notes and history; escalation is internal | `backend/tests/test_backend.py`, `web/tests/test_browser.py` |
| Static web interface | Implemented login, upload/GPS, ten-item pagination, authenticated photo, AI/context and review, mobile layout | `web/tests/test_browser.py`, `web/tests/client.test.js` |
| Shared request limits | Implemented PostgreSQL limits; public/IP flood protection remains an operator responsibility | `backend/tests/test_limits.py` |
| Orphan photo cleanup | Implemented manual dry-run/apply, grace and lifecycle lock; no automatic retention or schedule | `backend/tests/test_cleanup.py` |
| Separate database identities | Implemented DML application role and privileged migrator in Compose | `backend/tests/test_provision.py`, browser stack startup |
| Summary/draft/SOS | Implemented cumulative summary/contact/draft; no dispatch or external sending | `backend/tests/test_backend.py`, `backend/tests/test_local.py` |
| Privacy/LGPD | Checklist and provisional notice; policy, legal assessment and full rights workflow remain pending | [Checklist](docs/PRIVACIDADE-LGPD.md) |
| Risk index, persistent worker, offline queue, push, polygons, INPE/MapBiomas | Not implemented; risk remains null/unvalidated | Source scope in [audit](docs/AUDITORIA.md) |
| React Native/Expo | Reference integration only; no complete mobile app/build | `backend/examples/expo-client.ts` |

## Installation and startup

Requirements: Git, Docker with Compose v2, Python 3, network for image/dependency downloads. Linux/Docker is required by the automated browser runner. On the published development branch (not merged into main):

```sh
git clone --branch feat/fase-5-operacao https://github.com/armandor123/terra-firma.git
cd terra-firma
python3 scripts/configure.py
docker compose up --build -d
docker compose exec backend python -m backend.bootstrap \
  --username coop.admin --name "Representative" --cooperative "Demo Cooperative"
```

The configurator creates private `.env` credentials without printing them or overwriting an existing file. Bootstrap prompts for a 12–128 character password; there is no default account. Migrations/provisioning must succeed before the backend starts. Open **http://127.0.0.1:8080**, log in, change the initial password and log in again. Register a farmer/property in the cooperative screen, then use the farmer account to submit a photo and review it as the cooperative. [Full walkthrough](docs/INTERFACE.md).

| Service | Default local address |
|---|---|
| Web UI and same-origin API proxy | http://127.0.0.1:8080 |
| Backend Swagger / health | http://127.0.0.1:8000/docs / http://127.0.0.1:8000/health |
| Data Swagger / health | http://127.0.0.1:8001/docs / http://127.0.0.1:8001/health |

`docker compose down` stops services and preserves volumes. **Adding `--volumes` deletes database and photos.** Existing installations must preserve the migrator credentials/volumes and add distinct app credentials before upgrading; [OPERACAO.md](docs/OPERACAO.md) explains this and direct Python startup. PostGIS is mandatory; there is no SQLite fallback.

## Configuration

Secrets stay on the server, never in `web/public` or public client variables. Compose reads `.env`; direct Python execution does not.

| Variable | Default / rule |
|---|---|
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | Migrator/database owner; default name `terra_firma`, generated private password |
| `POSTGRES_APP_USER`, `POSTGRES_APP_PASSWORD` | Application DML identity; default `terra_firma_app`, distinct generated private password |
| `DATA_API_KEY` | Generated internal backend/data key; at least 24 characters |
| `DATA_MODE`, `FIRMS_MAP_KEY` | Compose `demo`; `live` requires NASA key for hotspots (weather can succeed separately) |
| `VISION_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL` | `simulated`; `gemini` requires a private key and compatible explicit model |
| `EVIDENCE_RADIUS_KM`, `EVIDENCE_WINDOW_HOURS` | 10 km (1–50), backward 24 h (1–96); uncalibrated context heuristics |
| `WEB_BIND`, `WEB_PORT` | `127.0.0.1`, `8080` |
| `BACKEND_BIND`, `BACKEND_PORT`, `DATA_PORT` | `127.0.0.1`, `8000`, `8001`; data host bind remains loopback |
| `DATABASE_URL`, `PHOTO_DIR`, `DATA_API_URL` | Backend runtime; Compose supplies DML URL, `/app/data/photos`, `http://dados:8001` |
| `APP_DATABASE_USER`, `APP_DATABASE_PASSWORD` | Migrator-only provisioning inputs, supplied by Compose from app identity variables |
| `TEST_DATABASE_URL` | Dedicated test database; never use production data |

For all-real inputs, set `DATA_MODE=live`, `VISION_MODE=gemini` and the three provider settings privately, then recreate backend/data. Do not publish provider URLs containing keys. `gemini-3.8-flash` worked in one authorized synthetic-image check; this does not guarantee account availability or detection quality. [Vision](docs/VISAO.md), [evidence](docs/CRUZAMENTO.md), [decisions/default rationale](docs/DECISOES.md).

## Behavior and limits

Uploads accept multipart `metadata` JSON plus JPEG/PNG `photo` (3,000,000 bytes, 12 MP; total body 4,100,000 bytes). UUID, metadata and original bytes must remain identical for retries; conflicting reuse returns 409. Photos are reencoded without EXIF. Location is optional and never substituted by the property point; server receipt time is the correlation reference, not verified capture time.

Gemini returns fire/smoke/dry/burned signals with presence, declared confidence and short rationale; image limitations; classification and model/prompt versions. Inconclusive is valid. Declared confidence is not measured accuracy. Older records remain readable. New incidents persist snapshots/evidence once; replay, GET and review do not requery providers. No-location or unavailable/stale source gives `unavailable` with partial evidence preserved. Empty hotspots means `no_nearby_hotspot`, not absence of fire. `consistent` only means compatible context. FIRMS boxes crossing the antimeridian remain unavailable; distance rules themselves handle ±180°.

Nginx serves static files and proxies `/v1/` on the same origin, with CSP/no-store/nosniff; no open CORS. User tokens stay in browser memory only. Refresh is coordinated; logout clears memory/blob photo. No offline queue, HEIC conversion or durable draft storage. Geolocation needs browser permission and localhost/HTTPS. Backend/photo authorization is enforced server-side. [Interface details](docs/INTERFACE.md).

PostgreSQL-backed fixed 60 s windows: 5 login attempts per username (success resets), 120 authenticated requests per user, 20 new uploads per farmer, 30 identified refreshes per user. Replicas must share the same database/schema. Public endpoints, invalid tokens and many different usernames still need gateway/IP protection; data cache is per process. 429 has conservative `Retry-After: 60`. This is not DDoS protection.

Manual orphan cleanup (dry-run first):

```sh
docker compose exec backend python -m backend.cleanup_photos
docker compose exec backend python -m backend.cleanup_photos --apply
```

Default grace 24 h; only unreferenced hash photos/abandoned temporary files are eligible. Referenced/fresh/unrelated files and symlinks are preserved. Upload and cleanup coordinate through PostgreSQL locks; replicas also require shared private photo storage. No scheduled deletion or incident retention policy is implemented. [Operation](docs/OPERACAO.md), [privacy checklist](docs/PRIVACIDADE-LGPD.md).

Development Compose is not production approval. HTTPS, gateway abuse controls, monitoring, joint database/photo backup and restore, retention, controller/contact notice and data-subject request handling must be completed by the operator. AI quality/field association have not been evaluated.

## Testing and actual validation

```sh
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
node --test web/tests/client.test.js
python3 scripts/test_ui.py
```

The CI runs these commands, using real PostGIS and a disposable full demo stack for Chromium. `scripts/test_ui.py` creates its own credentials/project/volumes and removes only its test stack. Local `python -m pytest -q` skips database scenarios without `TEST_DATABASE_URL`; skipped tests do not establish full validation.

Phase 4 [CI 42436624805](https://github.com/armandor123/terra-firma/actions/runs/42436624805): **103 Python/PostGIS, four Node and four Chromium passed**, no skips. Phase 5 [CI 42438024608](https://github.com/armandor123/terra-firma/actions/runs/42438024608), SHA `dee128b`: **112 Python/PostGIS, four Node and four Chromium passed**, no skips, one Python warning. This includes three exact contract comparisons. See [validation log](docs/VALIDACAO.md). The OpenAPI backend **2.1.0** and data **1.0.0** contracts are versioned and checked against generated schemas.

External checks are separate: one real Gemini call on a synthetic image, and one real NASA FIRMS/Open-Meteo query at a demonstration point. Sanitized evidence: [vision](docs/vision-live-check.json), [environment](docs/firms-live-check.json). **A full live end-to-end incident with a real photo has not been demonstrated. No accuracy percentage is claimed.**

## Repository and documentation

`backend/`: API, schemas, vision, correlation, SQL migrations and tests. `dados-api/`: independent environmental service/tests. `web/`: static UI/Nginx and browser/JS tests. `scripts/`: private setup and browser-stack runner. `tests/`: integration. [API routes/direct setup](backend/README.md), [data API](dados-api/README.md), [audit](docs/AUDITORIA.md), [decisions](docs/DECISOES.md). Earlier PRD/Expo/planning documents are historical context, not additional delivered capabilities.

About proposal: **“Terra-Firma: MVP web de relatos com fotos, visão Gemini opcional, contexto NASA FIRMS/Open-Meteo e revisão humana por cooperativas. FastAPI + PostGIS; modo demo explícito.”** Remote About remains unchanged: available GitHub integration cannot edit it and browser access is signed out. Development branches are published; main has not been merged automatically.

No code LICENSE has been adopted. MIT is only a proposal in [DECISOES.md](docs/DECISOES.md), pending author choice. Photos, icons and trademarks have separate terms. The external visual kit is not included; confirm permissions/attribution before reuse. This UI uses system fonts and a text monogram, not those external assets.
