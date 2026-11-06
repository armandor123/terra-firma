import json
from datetime import datetime, timezone, timedelta
import httpx
import pytest
from backend.analysis import analyze_image, cross_evidence, ProviderFailure

NOW=datetime(2026,11,6,12,tzinfo=timezone.utc)

def context(simulated=False):
    h={'id':'x','latitude':-22,'longitude':-47,'observed_at':NOW.isoformat()}
    common={'simulated':simulated,'status':'ok','observed_at':NOW.isoformat()}
    return {'hotspots':{**common,'data':[h]},'weather':{**common,'data':{'temperature_c':30,'humidity_pct':20}}}

def test_missing_key_is_not_a_fake_result(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY',raising=False)
    out=analyze_image(b'image')
    assert out['status']=='unavailable'
    assert out['simulated'] is False

def test_real_provider_contract_and_no_confidence_invention(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY','test-secret')
    monkeypatch.setenv('GEMINI_MODEL','gemini-2.5-flash')
    def handler(r):
        assert 'test-secret' not in str(r.url)
        assert r.headers['x-goog-api-key']=='test-secret'
        b=json.loads(r.content)
        assert b['contents'][0]['parts'][1]['inlineData']['mimeType']=='image/jpeg'
        output={'classification':'possible_smoke','fire':False,'smoke':True,'burned_area':False,'explanation':'Possível fumaça; pode ser neblina.'}
        return httpx.Response(200,json={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':json.dumps(output)}]}}]})
    out=analyze_image(b'jpeg',httpx.MockTransport(handler))
    assert out['status']=='completed' and out['confidence'] is None
    assert out['smoke'] is True and not out['simulated']

@pytest.mark.parametrize('payload',[
    {}, {'candidates':[]}, {'candidates':[{'finishReason':'MAX_TOKENS'}]},
    {'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'not json'}]}}]},
    {'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'{"classification":"definite_fire"}'}]}}]}
])
def test_invalid_or_blocked_output_is_failure(monkeypatch,payload):
    monkeypatch.setenv('GEMINI_API_KEY','secret')
    with pytest.raises(ProviderFailure):
        analyze_image(b'x',httpx.MockTransport(lambda r:httpx.Response(200,json=payload)))

def test_provider_error_does_not_leak_key(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY','do-not-leak')
    with pytest.raises(ProviderFailure) as error:
        analyze_image(b'x',httpx.MockTransport(lambda r:httpx.Response(429,text='do-not-leak')))
    assert 'do-not-leak' not in str(error.value)

def test_crossing_uses_actual_distance_and_time():
    c=context()
    c['hotspots']['data'] += [
        {**c['hotspots']['data'][0],'id':'far','latitude':0,'distance_km':0},
        {**c['hotspots']['data'][0],'id':'old','observed_at':(NOW-timedelta(hours=25)).isoformat()},
        {**c['hotspots']['data'][0],'id':'future','observed_at':(NOW+timedelta(hours=1)).isoformat()}]
    r=cross_evidence({'classification':'possible_fire'},c,-22,-47,'manual',NOW)
    assert [h['id'] for h in r['nearby_hotspots']]==['x']
    assert r['validated'] is False
    assert r['weather']['humidity_pct']==20

def test_demo_and_unavailable_never_become_real_evidence():
    for c in (context(True),{}):
        r=cross_evidence({},c,-22,-47,'property_reference_not_photo_location',NOW)
        assert r['weather'] is None and not r['nearby_hotspots']
        assert 'property_reference' in r['location_source']

def test_stale_weather_is_excluded():
    c=context();c['weather']['observed_at']=(NOW-timedelta(hours=4)).isoformat()
    assert cross_evidence({},c,-22,-47,'manual',NOW)['weather'] is None
