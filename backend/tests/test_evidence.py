"""Regras determinísticas e cliente com HTTP controlado; sem consultas NASA reais."""
import asyncio
from datetime import datetime, timedelta, timezone
import json

import httpx
import pytest
from pydantic import ValidationError

from backend.evidence import (EvidenceSettings, EnvironmentalQuery, EnvironmentClient,
                              EnvironmentSnapshot, SourceEnvelope, Weather, Hotspot,
                              build_evidence, distance_km)
from backend.vision import SimulatedProvider
from backend.vision_models import VisionResult

REF = datetime(2026,11,7,12,tzinfo=timezone.utc)


def envelope(data, source='controlled source', **changes):
    return {'schema_version':'1.0','source':source,'simulated':False,'status':'ok',
            'observed_at':REF.isoformat(),'fetched_at':REF.isoformat(),
            'data':data,'warnings':['Aviso da fonte.'],**changes}


def weather(**changes):
    return envelope({'temperature_c':30,'humidity_pct':40,'wind_kmh':10,
                     'wind_direction_deg':90,'precipitation_mm':0},**changes)


def hotspot(id='one', latitude=0, longitude=0, observed_at=REF, **changes):
    return {'id':id,'latitude':latitude,'longitude':longitude,'observed_at':observed_at.isoformat(),
            'confidence':'nominal','frp_mw':8,'distance_km':999,**changes}


def snapshot(items=None, w=None, h=None, lat=0, lon=0):
    return EnvironmentSnapshot(status='ok',collected_at=REF,
        query=EnvironmentalQuery(latitude=lat,longitude=lon,radius_km=10,days=2),
        weather=weather() if w is None else w,
        hotspots=envelope([hotspot()] if items is None else items) if h is None else h)


def cross(s, settings=None, ref=REF):
    return build_evidence(s,ref,SimulatedProvider().analyze(b'jpeg'),settings or EvidenceSettings())


def test_matching_preserves_source_time_confidence_and_recomputes_distance():
    result=cross(snapshot([hotspot(observed_at=REF-timedelta(minutes=30))]))
    assert result.consistency=='consistent'
    match=result.nearby_hotspots[0]
    assert match.distance_km==0  # Não confiar nos 999 km declarados pelo teste/provedor.
    assert match.time_difference_seconds==1800
    assert match.observed_at==REF-timedelta(minutes=30)
    assert match.confidence=='nominal' and match.source=='controlled source'
    assert result.weather_time_difference_seconds==0
    assert result.simulated is True and result.visual_simulated is True
    assert result.human_review_required is True
    assert 'Aviso da fonte.' in result.warnings


@pytest.mark.parametrize('seconds,expected', [(0,True),(86400,True),(86400.001,False),(-0.001,False)])
def test_window_is_backward_inclusive_and_rejects_future(seconds,expected):
    result=cross(snapshot([hotspot(observed_at=REF-timedelta(seconds=seconds))]))
    assert result.consistency==('consistent' if expected else 'no_nearby_hotspot')
    assert len(result.nearby_hotspots)==int(expected)
    assert result.excluded_hotspots_count==int(not expected)


def test_radius_boundary_and_outside():
    exact=distance_km(0,0,0,0.1)
    s=snapshot([hotspot(longitude=0.1)])
    assert cross(s,EvidenceSettings(radius_km=exact)).consistency=='consistent'
    assert cross(s,EvidenceSettings(radius_km=exact-0.000001)).consistency=='no_nearby_hotspot'


def test_antimeridian_and_poles_have_valid_distances():
    result=cross(snapshot([hotspot(longitude=-179.99)],lon=179.99))
    assert result.consistency=='consistent'
    assert 2 < result.nearby_hotspots[0].distance_km < 3
    assert distance_km(90,0,90,180) < 0.000001
    assert 20000 < distance_km(0,0,0,180) < 20020


def test_timezones_and_naive_reference():
    zone=timezone(timedelta(hours=-3))
    item=hotspot(observed_at=REF.astimezone(zone))
    assert cross(snapshot([item])).nearby_hotspots[0].time_difference_seconds==0
    with pytest.raises(ValueError,match='fuso'):
        cross(snapshot(),ref=REF.replace(tzinfo=None))
    item['observed_at']='2026-11-07T12:00:00'
    with pytest.raises(ValidationError):
        snapshot([item])


@pytest.mark.parametrize('failed', ['weather','hotspots','stale_weather','stale_hotspots'])
def test_partial_failure_or_staleness_is_unavailable_not_no_hotspot(failed):
    if failed=='stale_weather':
        s=snapshot(w=weather(status='stale',observed_at=(REF-timedelta(hours=4)).isoformat()))
    elif failed=='stale_hotspots':
        s=snapshot(h=envelope([hotspot()],status='stale'))
    else:
        bad=envelope(None,status='unavailable',observed_at=None,warnings=['Fonte indisponível.'])
        s=snapshot(w=bad) if failed=='weather' else snapshot(h=bad)
    result=cross(s)
    assert result.consistency=='unavailable'
    if failed in ('hotspots','stale_hotspots'):
        assert result.nearby_hotspots is None
        assert result.weather.data.temperature_c==30
    else:
        assert len(result.nearby_hotspots)==1
    assert any('não significa ausência de risco' in x for x in result.warnings)


@pytest.mark.parametrize('satellite_simulated', [False,True])
def test_consistency_is_context_compatibility_not_ai_confirmation(satellite_simulated):
    vision=VisionResult(signals={name:{'presence':'absent','confidence':0.5,
        'justification':'Controlled fixture.'} for name in ('fire','smoke','dry_vegetation','burned_vegetation')},
        image_assessable=True,limitations=[],classification='no_signs',status='completed',
        provider='gemini',simulated=False,requested_model='test',model_version='test',warning='Fixture only.')
    s=snapshot(h=envelope([hotspot()],simulated=satellite_simulated))
    result=build_evidence(s,REF,vision,EvidenceSettings())
    assert result.consistency=='consistent' and result.visual_classification=='no_signs'
    assert result.simulated is satellite_simulated
    assert result.nearby_hotspots[0].simulated is satellite_simulated
    assert any('revisar a divergência' in warning for warning in result.warnings)


def test_empty_hotspots_does_not_reject_report_or_create_risk_index():
    result=cross(snapshot([]))
    assert result.consistency=='no_nearby_hotspot' and result.nearby_hotspots==[]
    assert result.human_review_required is True
    assert 'risk' not in result.model_dump()
    assert any('não invalida o relato' in x for x in result.warnings)


def test_weather_time_difference_is_signed_and_observation_is_preserved():
    observed=REF+timedelta(minutes=1)
    s=snapshot(w=weather(observed_at=observed.isoformat()))
    result=cross(s)
    assert result.weather_time_difference_seconds==-60
    assert result.weather.observed_at==observed


def test_no_location_never_calls_service_or_uses_property_coordinates():
    def fail(request):
        raise AssertionError('Não consultar fonte sem localização do incidente')
    client=EnvironmentClient('http://data','key',EvidenceSettings(),httpx.MockTransport(fail))
    s=asyncio.run(client.capture(None,None))
    result=cross(s)
    assert s.status=='no_location' and s.query is None
    assert s.weather is None and s.hotspots is None
    assert result.consistency=='unavailable' and result.nearby_hotspots is None


def test_client_uses_config_and_preserves_independent_source_envelopes():
    settings=EvidenceSettings(radius_km=20,window_hours=48)
    def handler(request):
        q=json.loads(request.content)
        assert q=={'latitude':-22.0,'longitude':-47.0,'radius_km':20.0,'days':3}
        assert request.headers['X-API-Key']=='test-key'
        return httpx.Response(200,json={'query':q,'weather':weather(simulated=True),
            'hotspots':envelope(None,status='unavailable',observed_at=None,
                                 warnings=['Antimeridiano não suportado.']),
            'risk':{'level':None,'method':None,'validated':False}})
    client=EnvironmentClient('http://data','test-key',settings,httpx.MockTransport(handler))
    s=asyncio.run(client.capture(-22,-47))
    assert s.status=='partial' and s.weather.simulated is True
    assert s.hotspots.status=='unavailable'
    assert 'Antimeridiano não suportado.' in cross(s).warnings


@pytest.mark.parametrize('error', ['http','timeout','bad_query','bad_json','bad_weather'])
def test_client_failure_handling_and_partial_validation(error):
    def handler(request):
        if error=='http':return httpx.Response(503)
        if error=='timeout':raise httpx.ReadTimeout('private error',request=request)
        if error=='bad_json':return httpx.Response(200,text='not json')
        q=json.loads(request.content)
        if error=='bad_query':q['longitude']=40
        w=weather()
        if error=='bad_weather':w['data']['humidity_pct']=101
        return httpx.Response(200,json={'query':q,'weather':w,'hotspots':envelope([])})
    client=EnvironmentClient('http://data','test-key',EvidenceSettings(),httpx.MockTransport(handler))
    s=asyncio.run(client.capture(0,0))
    assert s.weather.status=='unavailable'
    assert s.hotspots.status==('ok' if error=='bad_weather' else 'unavailable')
    result=cross(s)
    assert result.consistency=='unavailable'
    assert result.nearby_hotspots==([] if error=='bad_weather' else None)
    assert 'private error' not in s.model_dump_json()


@pytest.mark.parametrize('radius,window', [(0,24),(51,24),(10,0),(10,97),(float('nan'),24),(10,float('inf'))])
def test_invalid_parameters_cannot_start(radius,window):
    with pytest.raises(ValidationError):
        EvidenceSettings(radius_km=radius,window_hours=window)


def test_environment_configuration_and_query_day_padding(monkeypatch):
    monkeypatch.setenv('EVIDENCE_RADIUS_KM','12')
    monkeypatch.setenv('EVIDENCE_WINDOW_HOURS','96')
    c=EvidenceSettings.from_env()
    assert c.radius_km==12 and c.query_days==5
    assert EvidenceSettings().query_days==2
