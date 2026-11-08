"""Janelas fixas compartilhadas por todas as instâncias no mesmo PostgreSQL."""
import hashlib
from fastapi import HTTPException
from .db import connect


def subject(value):
    return hashlib.sha256(value.encode()).hexdigest()


def consume(url, scope, identity, maximum, seconds=60):
    # Transação própria: uma resposta 401/429 não desfaz a contagem.
    with connect(url) as db:
        db.execute('DELETE FROM request_limits WHERE expires_at<=clock_timestamp()')
        row=db.execute('''INSERT INTO request_limits(scope,subject_hash,hits,expires_at)
            VALUES(%s,%s,1,clock_timestamp()+%s*interval '1 second')
            ON CONFLICT(scope,subject_hash) DO UPDATE SET
            hits=CASE WHEN request_limits.expires_at<=clock_timestamp() THEN 1 ELSE request_limits.hits+1 END,
            expires_at=CASE WHEN request_limits.expires_at<=clock_timestamp()
              THEN clock_timestamp()+%s*interval '1 second' ELSE request_limits.expires_at END
            RETURNING hits''',(scope,subject(identity),seconds,seconds)).fetchone()
    if row['hits']>maximum:
        raise HTTPException(429,'Limite de tentativas atingido; aguarde um minuto',headers={'Retry-After':str(seconds)})


def reset(url, scope, identity):
    with connect(url) as db:
        db.execute('DELETE FROM request_limits WHERE scope=%s AND subject_hash=%s',(scope,subject(identity)))
