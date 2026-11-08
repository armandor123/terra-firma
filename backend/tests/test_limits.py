"""Regras operacionais exercitadas em PostgreSQL real no CI."""
from concurrent.futures import ThreadPoolExecutor
import os
import time
import uuid
from urllib.parse import urlsplit,urlunsplit

import pytest
import psycopg
from psycopg import sql
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.db import connect
from backend.main import create_app
from backend.limits import consume, subject
from test_backend import system, send, h


def test_atomic_limits_across_connections_and_expiry(pg_url):
    def hit(_):
        try:consume(pg_url,'test','identity',5)
        except HTTPException as error:return error.status_code
        return 200
    with ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(hit,range(12)))
    assert results.count(200)==5 and results.count(429)==7
    with connect(pg_url) as db:
        rows=list(db.execute('SELECT * FROM request_limits'))
        assert rows[0]['subject_hash']==subject('identity')
        assert rows[0]['hits']==12
        db.execute("UPDATE request_limits SET expires_at=now()-interval '1 second'")
    consume(pg_url,'test','identity',5)
    with connect(pg_url) as db:assert db.execute('SELECT hits FROM request_limits').fetchone()['hits']==1


def test_login_and_authenticated_limits_survive_another_app(system,tmp_path):
    first,url=system
    second=TestClient(create_app(url,photo_dir=tmp_path/'another'))
    for i in range(5):
        assert (first if i%2 else second).post('/v1/auth/login',json={'username':'farmer','password':'wrong-password'}).status_code==401
    assert second.post('/v1/auth/login',json={'username':'farmer','password':'initial-password-123'}).status_code==429
    with connect(url) as db:db.execute("UPDATE request_limits SET expires_at=now()-interval '1 second'")
    assert second.post('/v1/auth/login',json={'username':'farmer','password':'initial-password-123'}).status_code==200
    with connect(url) as db:
        db.execute("INSERT INTO request_limits VALUES('api',%s,120,now()+interval '1 minute')",(subject('admin'),))
    response=first.get('/v1/me',headers=h('admin'))
    assert response.status_code==429 and response.headers['retry-after']=='60'
    assert second.get('/v1/me',headers=h('admin')).status_code==429


def test_upload_limit_preserves_uuid_replay(system):
    client,url=system
    request_id=str(uuid.uuid4())
    saved=send(client,request_id=request_id)
    assert saved.status_code==201
    with connect(url) as db:db.execute("UPDATE request_limits SET hits=20 WHERE scope='upload'")
    assert send(client).status_code==429
    replay=send(client,request_id=request_id)
    assert replay.status_code==201 and replay.json()['id']==saved.json()['id'] and replay.json()['replayed']


