import json
import uuid
import io
import time
import httpx
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from backend.main import create_app,passwords,digest
from backend.db import connect

@pytest.fixture
def system(tmp_path,pg_url):
    path=pg_url
    c=TestClient(create_app(path,photo_dir=tmp_path/'photos',data_transport=httpx.MockTransport(lambda r:httpx.Response(503))))
    with connect(path) as db:
        for coop in ('c1','c2'):
            db.execute('INSERT INTO cooperatives VALUES(%s,%s)',(coop,coop))
        for uid,coop,role in [('admin','c1','cooperative'),('farmer','c1','farmer'),('other','c1','farmer'),('outsider','c2','cooperative')]:
            db.execute('INSERT INTO users VALUES(%s,%s,%s,%s,%s,%s,FALSE)',(uid,coop,uid,uid,passwords.hash('initial-password-123'),role))
            db.execute('INSERT INTO sessions VALUES(%s,%s,%s,%s,%s,%s)',(uid,digest(uid),uid,time.time()+3600,digest('refresh-'+uid),time.time()+86400))
        db.execute('INSERT INTO properties(id,farmer_id,name,municipality,state,latitude,longitude,area_ha) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)',('p1','farmer','Sitio','Campinas','SP',-22,-47,10))
    return c,path

def h(token):
    return {'Authorization':'Bearer '+token}

def photo():
    output=io.BytesIO()
    Image.new('RGB',(10,10),'green').save(output,format='PNG')
    return output.getvalue()

def send(c,raw=None,request_id=None,**fields):
    metadata={'client_request_id':request_id or str(uuid.uuid4()),'property_id':'p1',**fields}
    return c.post('/v1/incidents',headers=h('farmer'),data={'metadata':json.dumps(metadata)},
                  files={'photo':('image.png',raw if raw is not None else photo(),'image/png')})

def test_full_incident_review_flow_and_image(system):
    c,path=system
    r=send(c)
    assert r.status_code==201,r.text
    iid=r.json()['id']
    assert c.get(f'/v1/incidents/{iid}/photo',headers=h('farmer')).headers['content-type']=='image/jpeg'
    assert c.get(f'/v1/incidents/{iid}',headers=h('other')).status_code==404
    assert c.get(f'/v1/incidents/{iid}',headers=h('outsider')).status_code==404
    assert c.patch(f'/v1/incidents/{iid}/review',headers=h('admin'),json={'status':'verified','notes':'Ainda não permitido'}).status_code==409
    for status in ('under_review','verified','escalated'):
        r=c.patch(f'/v1/incidents/{iid}/review',headers=h('admin'),json={'status':status,'notes':'Avaliação humana de teste'})
        assert r.status_code==200,r.text
    item=c.get(f'/v1/incidents/{iid}',headers=h('admin')).json()
    assert len(item['reviews'])==3
    assert item['ai']['simulated'] is True
    assert c.get(f'/v1/incidents/{iid}/notification-draft',headers=h('admin')).json()['sent'] is False
    assert c.get('/v1/reports/summary',headers=h('admin')).json()['by_status']=={'escalated':1}

def test_farmer_temporary_password_and_revoke_sessions(system):
    c,path=system
    r=c.post('/v1/farmers',headers=h('admin'),json={'name':'Ana Silva','username':'ana.silva'})
    assert r.status_code==201
    temp=r.json()['temporary_password']
    login=c.post('/v1/auth/login',json={'username':'ana.silva','password':temp}).json()
    token=login['access_token']
    assert login['must_change_password'] is True
    assert c.get('/v1/properties',headers=h(token)).status_code==403
    assert c.post('/v1/auth/password',headers=h(token),json={'old_password':temp,'new_password':'new-strong-pass-123'}).status_code==200
    assert c.get('/v1/me',headers=h(token)).status_code==401
    new=c.post('/v1/auth/login',json={'username':'ana.silva','password':'new-strong-pass-123'}).json()['access_token']
    assert c.get('/v1/properties',headers=h(new)).status_code==200
    assert c.post('/v1/auth/logout',headers=h(new)).status_code==204
    assert c.get('/v1/me',headers=h(new)).status_code==401

def test_property_registration_and_cooperative_isolation(system):
    c,path=system
    body={'farmer_id':'farmer','municipality':'Campinas','state':'SP','latitude':-22,'longitude':-47,'area_ha':12}
    assert c.post('/v1/properties',headers=h('outsider'),json=body).status_code==404
    assert c.post('/v1/properties',headers=h('farmer'),json=body).status_code==403
    assert c.post('/v1/properties',headers=h('admin'),json=body).status_code==201
    assert c.get('/v1/reports/summary',headers=h('admin')).json()['registered_area_ha']==22
    assert c.get('/v1/properties',headers=h('outsider')).json()==[]
    assert c.get('/v1/reports/summary',headers=h('outsider')).json()['incidents']==0

def test_bad_image_and_location_rejected(system):
    c,path=system
    assert send(c,raw=b'not an image').status_code==422
    assert send(c,latitude=-22).status_code==422
    assert send(c,latitude=-22,longitude=-47,location_source='gps').status_code==422
    assert send(c,latitude=-22,longitude=-47,location_source='manual',location_authorized=True).status_code==201

def test_auth_security_and_service_failure(system):
    c,path=system
    assert c.get('/v1/properties').status_code==401
    assert c.get('/v1/properties/p1/environment',headers=h('farmer')).status_code==503
    assert c.get('/v1/properties/p1/environment',headers=h('other')).status_code==404
    assert c.get('/v1/sos').json()['automatic_dispatch'] is False
    assert c.post('/v1/farmers',headers=h('admin'),json={'name':'Teste','username':'test','role':'cooperative'}).status_code==422
    for _ in range(5):
        assert c.post('/v1/auth/login',json={'username':'missing','password':'bad'}).status_code==401
    assert c.post('/v1/auth/login',json={'username':'missing','password':'bad'}).status_code==429

def test_sessions_persist_across_restart_and_expire(system):
    c,path=system
    second=TestClient(create_app(path))
    assert second.get('/v1/me',headers=h('farmer')).status_code==200
    with connect(path) as db:
        db.execute('UPDATE sessions SET expires=0 WHERE token_hash=%s',(digest('farmer'),))
    assert second.get('/v1/me',headers=h('farmer')).status_code==401

def test_postgis_distance_and_scope(system):
    c,path=system
    r=c.get('/v1/properties/nearby',params={'latitude':-22,'longitude':-47,'radius_m':100},headers=h('admin'))
    assert r.status_code==200,r.text
    assert r.json()[0]['distance_m']==0
    assert c.get('/v1/properties/nearby',params={'latitude':-22,'longitude':-47},headers=h('outsider')).json()==[]
    assert c.get('/v1/properties/nearby',params={'latitude':0,'longitude':0},headers=h('admin')).json()==[]
    assert c.get('/v1/properties/nearby',params={'latitude':-22,'longitude':-47},headers=h('farmer')).status_code==403
    with connect(path) as db:
        r=db.execute("SELECT ST_SRID(location::geometry) AS srid FROM properties WHERE id='p1'").fetchone()
        assert r['srid']==4326

def test_idempotent_retry_and_payload_conflict(system):
    c,path=system
    request_id=str(uuid.uuid4())
    first=send(c,request_id=request_id)
    again=send(c,request_id=request_id)
    assert first.status_code==again.status_code==201
    assert first.json()['id']==again.json()['id']
    assert again.json()['replayed'] is True
    assert send(c,request_id=request_id,description='Diferente').status_code==409
    assert c.get('/v1/reports/summary',headers=h('admin')).json()['incidents']==1

def test_refresh_rotation_replay_and_logout(system):
    c,path=system
    tokens=c.post('/v1/auth/login',json={'username':'farmer','password':'initial-password-123'}).json()
    rotated=c.post('/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']})
    assert rotated.status_code==200,rotated.text
    fresh=rotated.json()
    assert c.get('/v1/me',headers=h(tokens['access_token'])).status_code==401
    assert c.get('/v1/me',headers=h(fresh['access_token'])).status_code==200
    assert c.post('/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']}).status_code==401
    assert c.get('/v1/me',headers=h(fresh['access_token'])).status_code==401
    tokens=c.post('/v1/auth/login',json={'username':'farmer','password':'initial-password-123'}).json()
    assert c.post('/v1/auth/logout',headers=h(tokens['access_token'])).status_code==204
    assert c.post('/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']}).status_code==401

def test_migration_reentrant(system):
    from backend.migrate import migrate
    c,url=system
    with connect(url) as db:
        before=db.execute('SELECT * FROM schema_migrations ORDER BY version').fetchall()
    migrate(url)
    with connect(url) as db:
        assert db.execute('SELECT * FROM schema_migrations ORDER BY version').fetchall()==before

def test_concurrent_duplicate_upload(system):
    from concurrent.futures import ThreadPoolExecutor
    c,path=system
    request_id=str(uuid.uuid4())
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:send(c,request_id=request_id),range(2)))
    assert all(r.status_code==201 for r in results)
    assert results[0].json()['id']==results[1].json()['id']

def test_refresh_survives_access_expiry(system):
    c,path=system
    tokens=c.post('/v1/auth/login',json={'username':'farmer','password':'initial-password-123'}).json()
    with connect(path) as db:
        db.execute('UPDATE sessions SET expires=0 WHERE token_hash=%s',(digest(tokens['access_token']),))
    assert c.get('/v1/me',headers=h(tokens['access_token'])).status_code==401
    assert c.post('/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']}).status_code==200


@pytest.mark.parametrize('available', [True, False])
def test_vision_persisted_after_authorization_and_deduplication(system,tmp_path,available):
    from backend.vision import GeminiProvider
    c,path=system
    calls=[]
    def handle(request):
        import base64
        body=json.loads(request.content)
        image=base64.b64decode(body['contents'][0]['parts'][0]['inlineData']['data'])
        with Image.open(io.BytesIO(image)) as clean:
            assert clean.format=='JPEG' and not clean.getexif()
        assert 'private metadata' not in request.content.decode()
        calls.append(request)
        visual={'signals':{name:{'presence':'absent','confidence':0.5,'justification':'Resposta de teste.'}
                           for name in ('fire','smoke','dry_vegetation','burned_vegetation')},
                'image_assessable':True,'limitations':[],'classification':'no_signs'}
        return (httpx.Response(200,json={'modelVersion':'test-version','candidates':[
            {'finishReason':'STOP','content':{'parts':[{'text':json.dumps(visual)}]}}]})
            if available else httpx.Response(503,text='private upstream error'))
    vision=GeminiProvider('test-only-key','test-model',transport=httpx.MockTransport(handle))
    c=TestClient(create_app(path,photo_dir=tmp_path/'vision-photos',vision_provider=vision))
    assert send(c,property_id='missing').status_code==404
    assert send(c,raw=b'bad image').status_code==422
    assert calls==[]
    original=io.BytesIO()
    exif=Image.Exif()
    exif[270]='private metadata'
    Image.new('RGB',(10,10),'green').save(original,format='JPEG',exif=exif)
    request_id=str(uuid.uuid4())
    first=send(c,raw=original.getvalue(),request_id=request_id)
    again=send(c,raw=original.getvalue(),request_id=request_id)
    assert first.status_code==again.status_code==201
    assert first.json()['id']==again.json()['id']
    assert again.json()['replayed'] is True and len(calls)==1
    assert send(c,raw=original.getvalue(),request_id=request_id,description='changed').status_code==409
    assert len(calls)==1
    iid=first.json()['id']
    item=c.get(f'/v1/incidents/{iid}',headers=h('farmer')).json()
    assert item['status']=='submitted'
    assert item['ai']['simulated'] is False
    assert item['ai']['human_review_required'] is True
    assert item['ai']['status']==('completed' if available else 'unavailable')
    assert item['ai']['classification']==('no_signs' if available else 'inconclusive')
    assert item['ai']['model_version']==('test-version' if available else None)
    assert c.get(f'/v1/incidents/{iid}',headers=h('other')).status_code==404
    assert c.get(f'/v1/incidents/{iid}',headers=h('outsider')).status_code==404
    assert c.get(f'/v1/incidents/{iid}/photo',headers=h('outsider')).status_code==404
    draft=c.get(f'/v1/incidents/{iid}/notification-draft',headers=h('admin')).json()
    assert draft['sent'] is False and 'é simulada' not in draft['text']
    assert c.patch(f'/v1/incidents/{iid}/review',headers=h('admin'),
                   json={'status':'verified','notes':'Ainda não permitido'}).status_code==409
    for status in ('under_review','verified','escalated'):
        assert c.patch(f'/v1/incidents/{iid}/review',headers=h('admin'),
                       json={'status':status,'notes':'Avaliação humana de teste'}).status_code==200


def test_concurrent_retry_does_not_repeat_vision_call(system,tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from backend.vision import SimulatedProvider
    class CountingProvider(SimulatedProvider):
        calls=0
        def analyze(self,image):
            self.calls+=1
            return super().analyze(image)
    _,path=system
    vision=CountingProvider()
    c=TestClient(create_app(path,photo_dir=tmp_path/'vision-photos',vision_provider=vision))
    request_id=str(uuid.uuid4())
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:send(c,request_id=request_id),range(2)))
    assert all(r.status_code==201 for r in results)
    assert results[0].json()['id']==results[1].json()['id']
    assert vision.calls==1


@pytest.mark.parametrize('case', ['matched','empty','weather_failed','hotspots_failed','no_location'])
def test_incident_environment_snapshot_is_saved_once_and_scoped(system,tmp_path,case):
    from datetime import datetime,timedelta,timezone
    from backend.evidence import EvidenceSettings
    _,path=system
    calls=[]
    def handler(request):
        q=json.loads(request.content)
        assert q=={'latitude':0.0,'longitude':179.99,'radius_km':12.0,'days':3}
        assert request.headers['X-API-Key']=='test-key'
        calls.append(q)
        t=(datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat()
        common={'schema_version':'1.0','simulated':False,'status':'ok',
                'observed_at':t,'fetched_at':t,'warnings':['Aviso original da fonte.']}
        w={**common,'source':'Open-Meteo controlled','data':{
            'temperature_c':30,'humidity_pct':40,'wind_kmh':10,'wind_direction_deg':90,'precipitation_mm':0}}
        h={**common,'source':'FIRMS controlled','data':[] if case=='empty' else [
            {'id':'near','latitude':0,'longitude':-179.99,'observed_at':t,
             'confidence':'high','frp_mw':8,'distance_km':999}]}
        if case=='weather_failed':w.update(status='unavailable',data=None,observed_at=None)
        if case=='hotspots_failed':h.update(status='unavailable',data=None,observed_at=None)
        return httpx.Response(200,json={'query':q,'weather':w,'hotspots':h})
    c=TestClient(create_app(path,photo_dir=tmp_path/'snapshot-photos',data_key='test-key',
        data_transport=httpx.MockTransport(handler),
        evidence_settings=EvidenceSettings(radius_km=12,window_hours=48)))
    coordinates={} if case=='no_location' else {'latitude':0,'longitude':179.99,
        'location_source':'manual','location_authorized':True}
    request_id=str(uuid.uuid4())
    first=send(c,request_id=request_id,**coordinates)
    assert first.status_code==201,first.text
    iid=first.json()['id']
    detail=c.get(f'/v1/incidents/{iid}',headers=h('farmer'))
    assert detail.status_code==200,detail.text
    item=detail.json()
    assert item['contract_version']=='2.1.0' and item['status']=='submitted'
    assert 'evidence_json' not in item and 'photo_key' not in item
    expected={'matched':'consistent','empty':'no_nearby_hotspot'}.get(case,'unavailable')
    assert item['evidence']['consistency']==expected
    assert item['evidence']['parameters']=={'radius_km':12,'window_hours':48}
    if case=='no_location':
        assert item['environment_snapshot']['status']=='no_location'
        assert item['evidence']['nearby_hotspots'] is None
        assert calls==[]
    else:
        assert len(calls)==1
        assert item['environment_snapshot']['query']['longitude']==179.99
        assert item['environment_snapshot']['hotspots']['source']=='FIRMS controlled'
        assert item['evidence']['weather']['source']=='Open-Meteo controlled'
        if case not in ('empty','hotspots_failed'):
            match=item['evidence']['nearby_hotspots'][0]
            assert 2 < match['distance_km'] < 3 and match['confidence']=='high'
            assert 0 <= match['time_difference_seconds'] <= 48*3600
    replay=send(c,request_id=request_id,**coordinates)
    assert replay.status_code==201 and replay.json()=={'id':iid,'replayed':True}
    assert len(calls)==(0 if case=='no_location' else 1)
    assert c.get(f'/v1/incidents/{iid}',headers=h('farmer')).json()['environment_snapshot']==item['environment_snapshot']
    assert c.get(f'/v1/incidents/{iid}',headers=h('outsider')).status_code==404
    assert c.get(f'/v1/incidents/{iid}',headers=h('other')).status_code==404
    with connect(path) as db:
        saved=db.execute('SELECT environment_snapshot,evidence_json FROM incidents WHERE id=%s',(iid,)).fetchone()
        assert saved['environment_snapshot']==item['environment_snapshot']
        assert saved['evidence_json']==item['evidence']


def test_evidence_migration_preserves_legacy_json_and_null_snapshot(system):
    from backend.migrate import migrate
    from psycopg.types.json import Jsonb
    c,path=system
    legacy={'status':'simulated','simulated':True,'classification':'inconclusive','confidence':None}
    with connect(path) as db:
        # Reproduz o esquema 001 para verificar upgrade, sem modificar SQL já aplicado.
        db.execute('ALTER TABLE incidents DROP COLUMN environment_snapshot,DROP COLUMN evidence_json')
        db.execute("DELETE FROM schema_migrations WHERE version='002_incident_evidence.sql'")
        db.execute('''INSERT INTO incidents(id,property_id,farmer_id,description,location_source,
            location_authorized,created_at,status,photo_key,photo_type,ai_json,client_request_id,request_hash)
            VALUES(%s,%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s)''',
            ('legacy','p1','farmer','Old report','unavailable',False,'submitted','0'*64+'.jpg',
             'image/jpeg',Jsonb(legacy),uuid.uuid4(),'legacy-hash'))
    migrate(path)
    response=c.get('/v1/incidents/legacy',headers=h('farmer'))
    assert response.status_code==200,response.text
    item=response.json()
    assert item['ai']==legacy and item['environment_snapshot'] is None and item['evidence'] is None
