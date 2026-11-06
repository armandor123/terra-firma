"""Persistent queue. Run with python -m backend.worker, independently of the API."""
import os
import time
from datetime import datetime, timezone
import httpx
from psycopg.types.json import Jsonb
from .db import connect
from .storage import PhotoStore
from .analysis import analyze_image, cross_evidence, ProviderFailure

def process_one(db_url=None, photo_dir=None, ai_transport=None, data_transport=None):
    with connect(db_url) as db:
        job=db.execute("""SELECT * FROM analysis_jobs WHERE status='pending'
            OR (status='processing' AND lease_until < now())
            ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 1""").fetchone()
        if not job: return False
        iid=job['incident_id']
        attempt=job['attempts']+1
        db.execute("UPDATE analysis_jobs SET status='processing',attempts=%s,lease_until=now()+interval '5 minutes',updated_at=now() WHERE incident_id=%s",(attempt,iid))
        row=db.execute('SELECT * FROM incidents WHERE id=%s',(iid,)).fetchone()
        prop=db.execute('SELECT * FROM properties WHERE id=%s',(row['property_id'],)).fetchone()
        db.execute('UPDATE incidents SET ai_json=%s WHERE id=%s',(Jsonb({'status':'processing','simulated':False}),iid))
    result={'status':'failed','simulated':False,'warning':'Limite de tentativas atingido; solicite nova análise.'}
    if attempt<=3:
        try:
            image=PhotoStore(photo_dir or os.getenv('PHOTO_DIR','./data/photos')).get(row['photo_key'])
            result=analyze_image(image,ai_transport)
        except (ProviderFailure,OSError):
            result={'status':'failed','simulated':False,'warning':'Não foi possível analisar a foto. Verifique a configuração e tente novamente.'}
        lat=row['latitude'] if row['latitude'] is not None else prop['latitude']
        lon=row['longitude'] if row['longitude'] is not None else prop['longitude']
        source=row['location_source'] if row['latitude'] is not None else 'property_reference_not_photo_location'
        context={}
        try:
            with httpx.Client(timeout=25,transport=data_transport) as client:
                r=client.post(os.getenv('DATA_API_URL','http://127.0.0.1:8001').rstrip('/')+'/v1/context',
                    headers={'X-API-Key':os.getenv('DATA_API_KEY','')},
                    json={'latitude':lat,'longitude':lon,'radius_km':10,'days':1})
                r.raise_for_status()
                context=r.json()
                if not isinstance(context,dict): context={}
        except (httpx.HTTPError,ValueError):
            pass
        result['environment_snapshot']=context
        result['crossing']=cross_evidence(result,context,lat,lon,source)
    result['analyzed_at']=datetime.now(timezone.utc).isoformat()
    with connect(db_url) as db:
        # Lease generation prevents a delayed worker overwriting a later attempt.
        updated=db.execute("UPDATE analysis_jobs SET status=%s,lease_until=NULL,updated_at=now() WHERE incident_id=%s AND status='processing' AND attempts=%s RETURNING incident_id",
            ('completed' if result['status']=='completed' else 'failed',iid,attempt)).fetchone()
        if updated: db.execute('UPDATE incidents SET ai_json=%s WHERE id=%s',(Jsonb(result),iid))
    return True

def main():
    while True:
        try:
            if not process_one(): time.sleep(2)
        except Exception:
            # Do not log provider URLs, photo payloads, passwords or API keys.
            print('Falha no worker; tarefa permanece recuperável após expirar a reserva.',flush=True)
            time.sleep(5)

if __name__=='__main__': main()
