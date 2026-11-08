"""Snapshots ambientais e compatibilidade espacial/temporal; não confirma incêndio."""
from datetime import datetime, timezone
import math
import os
from typing import Generic, Literal, TypeVar

import httpx
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictBool, ValidationError, model_validator

from .vision_models import Classification, VisionResult


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class EvidenceSettings(Strict):
    radius_km: float = Field(default=10, ge=1, le=50)
    window_hours: float = Field(default=24, ge=1, le=96)

    @property
    def query_days(self) -> int:
        # Margem de um dia para consultas diárias que atravessam meia-noite UTC.
        return math.ceil(self.window_hours / 24) + 1

    @classmethod
    def from_env(cls):
        return cls(radius_km=os.getenv('EVIDENCE_RADIUS_KM', '10'),
                   window_hours=os.getenv('EVIDENCE_WINDOW_HOURS', '24'))


class EnvironmentalQuery(Strict):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(ge=1, le=50)
    days: int = Field(ge=1, le=5)


class Weather(Strict):
    temperature_c: float = Field(ge=-100, le=70)
    humidity_pct: float = Field(ge=0, le=100)
    wind_kmh: float = Field(ge=0, le=500)
    wind_direction_deg: float = Field(ge=0, le=360)
    precipitation_mm: float = Field(ge=0)


class Hotspot(Strict):
    id: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    observed_at: AwareDatetime
    confidence: Literal['low', 'nominal', 'high']
    frp_mw: float | None = Field(default=None, ge=0)
    distance_km: float = Field(ge=0)


T = TypeVar('T')


class SourceEnvelope(Strict, Generic[T]):
    schema_version: Literal['1.0'] = '1.0'
    source: str = Field(min_length=1, max_length=200)
    simulated: StrictBool
    status: Literal['ok', 'unavailable', 'stale']
    observed_at: AwareDatetime | None
    fetched_at: AwareDatetime
    data: T | None
    warnings: list[str] = Field(default_factory=list)

    @model_validator(mode='after')
    def data_matches_status(self):
        if self.status == 'unavailable' and self.data is not None:
            raise ValueError('Fonte indisponível não representa dados atuais')
        if self.status != 'unavailable' and self.data is None:
            raise ValueError('Fonte disponível exige dados')
        if isinstance(self.data, Weather) and self.observed_at is None:
            raise ValueError('Clima disponível exige horário de observação')
        return self


class EnvironmentSnapshot(Strict):
    schema_version: Literal['1.0'] = '1.0'
    status: Literal['ok', 'partial', 'unavailable', 'no_location']
    collected_at: AwareDatetime
    query: EnvironmentalQuery | None
    weather: SourceEnvelope[Weather] | None = None
    hotspots: SourceEnvelope[list[Hotspot]] | None = None
    warnings: list[str] = Field(default_factory=list)


class HotspotMatch(Hotspot):
    source: str
    simulated: bool
    time_difference_seconds: float = Field(ge=0)


class Evidence(Strict):
    schema_version: Literal['1.0'] = '1.0'
    method: Literal['spatial-temporal-context-v1'] = 'spatial-temporal-context-v1'
    reference_at: AwareDatetime
    reference_kind: Literal['server_received_at'] = 'server_received_at'
    parameters: EvidenceSettings
    visual_classification: Classification
    visual_simulated: bool
    simulated: bool
    consistency: Literal['consistent', 'no_nearby_hotspot', 'unavailable']
    nearby_hotspots: list[HotspotMatch] | None
    excluded_hotspots_count: int = Field(ge=0)
    weather: SourceEnvelope[Weather] | None
    weather_time_difference_seconds: float | None
    human_review_required: Literal[True] = True
    warnings: list[str]


def now():
    return datetime.now(timezone.utc)


def unavailable_source(channel, reason, raw=None):
    # Origem desconhecida em falha do serviço; não inventar uma observação NASA/clima.
    simulated = raw.get('simulated') is True if isinstance(raw, dict) else False
    return {'source': f'dados-api / {channel}', 'simulated': simulated,
            'status': 'unavailable', 'observed_at': None, 'fetched_at': now(),
            'data': None, 'warnings': [reason]}


class EnvironmentClient:
    def __init__(self, url: str, api_key: str, settings: EvidenceSettings, transport=None):
        self.url, self.api_key = url.rstrip('/'), api_key
        self.settings, self.transport = settings, transport

    async def capture(self, latitude: float | None, longitude: float | None) -> EnvironmentSnapshot:
        if latitude is None or longitude is None:
            return EnvironmentSnapshot(status='no_location', collected_at=now(), query=None,
                warnings=['Ocorrência sem coordenadas; não substituir pela posição da propriedade.'])
        query = EnvironmentalQuery(latitude=latitude, longitude=longitude,
                                   radius_km=self.settings.radius_km, days=self.settings.query_days)
        reason = None
        try:
            async with httpx.AsyncClient(timeout=25, transport=self.transport, follow_redirects=False) as client:
                response = await client.post(self.url + '/v1/context', json=query.model_dump(),
                                             headers={'X-API-Key': self.api_key})
                response.raise_for_status()
                payload = response.json()
            if not isinstance(payload, dict) or EnvironmentalQuery.model_validate(payload.get('query')) != query:
                raise ValueError('Consulta retornada não corresponde à ocorrência')
        except (httpx.HTTPError, ValueError, TypeError):
            payload = {}
            reason = 'Consulta ambiental falhou ou retornou contexto incompatível; não inferir ausência de risco.'

        def parse(channel, schema):
            raw = payload.get(channel)
            try:
                return schema.model_validate(raw)
            except (ValidationError, ValueError, TypeError):
                return schema.model_validate(unavailable_source(
                    channel, reason or 'Envelope ambiental inválido ou ausente; fonte indisponível.', raw))

        weather = parse('weather', SourceEnvelope[Weather])
        hotspots = parse('hotspots', SourceEnvelope[list[Hotspot]])
        ok_count = sum(source.status == 'ok' for source in (weather, hotspots))
        return EnvironmentSnapshot(status=('ok' if ok_count == 2 else 'partial' if ok_count else 'unavailable'),
            collected_at=now(), query=query, weather=weather, hotspots=hotspots,
            warnings=[reason] if reason else [])


def distance_km(lat1, lon1, lat2, lon2):
    a, b = math.radians(lat1), math.radians(lat2)
    value = (math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b) *
             math.sin(math.radians(lon2-lon1)/2)**2)
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, max(0, value))))


def build_evidence(snapshot: EnvironmentSnapshot, reference_at: datetime,
                   vision: VisionResult, settings: EvidenceSettings) -> Evidence:
    if reference_at.tzinfo is None or reference_at.utcoffset() is None:
        raise ValueError('A referência temporal deve ter fuso horário')
    warnings = [
        'Compatibilidade espacial/temporal não confirma incêndio nem valida a imagem.',
        'Ausência de foco não invalida o relato; indisponibilidade não significa ausência de risco.',
        *snapshot.warnings,
    ]
    for source in (snapshot.weather, snapshot.hotspots):
        if source is not None:
            warnings.extend(source.warnings)
    matches, excluded = None, 0
    if snapshot.query is not None and snapshot.hotspots is not None and snapshot.hotspots.status == 'ok':
        matches = []
        for item in snapshot.hotspots.data:
            distance = distance_km(snapshot.query.latitude, snapshot.query.longitude,
                                   item.latitude, item.longitude)
            delta = (reference_at-item.observed_at).total_seconds()
            if distance <= settings.radius_km and 0 <= delta <= settings.window_hours*3600:
                matches.append(HotspotMatch(**{**item.model_dump(), 'distance_km': distance},
                    source=snapshot.hotspots.source, simulated=snapshot.hotspots.simulated,
                    time_difference_seconds=delta))
            else:
                excluded += 1
        matches.sort(key=lambda item: (item.distance_km, item.time_difference_seconds, item.id))
    available = (snapshot.query is not None and snapshot.weather is not None and
                 snapshot.weather.status == 'ok' and snapshot.hotspots is not None and
                 snapshot.hotspots.status == 'ok')
    consistency = ('consistent' if matches else 'no_nearby_hotspot') if available else 'unavailable'
    if excluded:
        warnings.append(f'{excluded} foco(s) do snapshot fora do raio/janela ou com horário posterior à referência.')
    simulated = vision.simulated or any(source is not None and source.simulated
                                       for source in (snapshot.weather, snapshot.hotspots))
    if simulated:
        warnings.append('Há entrada simulada; este conjunto não comprova um evento real.')
    if matches and vision.classification == 'no_signs':
        warnings.append('Há focos compatíveis, mas a análise visual não indicou sinais; revisar a divergência.')
    weather_delta = ((reference_at-snapshot.weather.observed_at).total_seconds()
        if snapshot.weather is not None and snapshot.weather.observed_at is not None else None)
    return Evidence(reference_at=reference_at, parameters=settings,
        visual_classification=vision.classification, visual_simulated=vision.simulated,
        simulated=simulated, consistency=consistency, nearby_hotspots=matches,
        excluded_hotspots_count=excluded, weather=snapshot.weather,
        weather_time_difference_seconds=weather_delta, warnings=list(dict.fromkeys(warnings)))
