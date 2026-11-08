"""Execute na raiz: python -m pytest tests/test_integration.py -q."""
import time
import io
import json
import uuid
import httpx
from fastapi.testclient import TestClient
from dados.main import create_app as create_data
from backend.main import create_app as create_backend, passwords, digest
from backend.db import connect
from PIL import Image

def test_backend_consumes_independent_data_service(tmp_path,pg_url):
    key='integration-key-with-24-characters'
    data=create_data(mode='demo',api_key=key)
    db_path=pg_url
    backend=create_backend(db_path,photo_dir=tmp_path/'photos',data_url='http://data',data_key=key,data_transport=httpx.ASGITransport(app=data))
    with connect(db_path) as db:
        db.execute('INSERT INTO cooperatives VALUES(%s,%s)',('coop','Teste'))
        db.execute('INSERT INTO users VALUES(%s,%s,%s,%s,%s,%s,FALSE)',('farmer','coop','Teste','teste',passwords.hash('not-used-password'),'farmer'))
        db.execute('INSERT INTO properties(id,farmer_id,name,municipality,state,latitude,longitude,area_ha) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)',('property','farmer','Sitio','Campinas','SP',-22,-47,10))
        db.execute('INSERT INTO sessions VALUES(%s,%s,%s,%s,%s,%s)',('session',digest('test-token'),'farmer',time.time()+60,digest('refresh'),time.time()+3600))
    with TestClient(backend) as client:
        response=client.get('/v1/properties/property/environment',headers={'Authorization':'Bearer test-token'})
        assert response.status_code==200,response.text
        assert response.json()['weather']['simulated'] is True
        assert response.json()['query']['latitude']==-22

        # Consulta por coordenadas do relato, não pelo ponto da propriedade; snapshot demo explícito.
        photo=io.BytesIO()
        Image.new('RGB',(10,10),'green').save(photo,format='PNG')
        submitted=client.post('/v1/incidents',headers={'Authorization':'Bearer test-token'},
            data={'metadata':json.dumps({'property_id':'property','client_request_id':str(uuid.uuid4()),
                'latitude':0,'longitude':0,'location_source':'manual','location_authorized':True})},
            files={'photo':('photo.png',photo.getvalue(),'image/png')})
        assert submitted.status_code==201,submitted.text
        item=client.get('/v1/incidents/'+submitted.json()['id'],headers={'Authorization':'Bearer test-token'})
        assert item.status_code==200,item.text
        assert item.json()['environment_snapshot']['query']['latitude']==0
        assert item.json()['environment_snapshot']['weather']['simulated'] is True
        assert item.json()['evidence']['simulated'] is True
        assert item.json()['evidence']['consistency']=='no_nearby_hotspot'  # Demo é de janeiro.


def test_antimeridian_keeps_weather_when_firms_box_is_unsupported():
    import asyncio
    from datetime import datetime,timezone
    from backend.evidence import EvidenceSettings,EnvironmentClient,build_evidence
    from backend.vision import SimulatedProvider
    key='integration-key-with-24-characters'
    calls=[]
    def handler(request):
        calls.append(str(request.url.host))
        assert request.url.host=='api.open-meteo.com'
        return httpx.Response(200,json={'current':{
            'time':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M'),
            'temperature_2m':30,'relative_humidity_2m':40,'wind_speed_10m':10,
            'wind_direction_10m':90,'precipitation':0}})
    data=create_data(mode='live',api_key=key,firms_key='fake-test-key',transport=httpx.MockTransport(handler))
    settings=EvidenceSettings()
    client=EnvironmentClient('http://data',key,settings,httpx.ASGITransport(app=data))
    snapshot=asyncio.run(client.capture(0,179.99))
    result=build_evidence(snapshot,datetime.now(timezone.utc),SimulatedProvider().analyze(b'jpeg'),settings)
    assert snapshot.status=='partial' and snapshot.weather.status=='ok'
    assert snapshot.hotspots.status=='unavailable' and result.consistency=='unavailable'
    assert result.nearby_hotspots is None
    assert any('antimeridiano' in text for text in result.warnings)
    assert calls==['api.open-meteo.com']
