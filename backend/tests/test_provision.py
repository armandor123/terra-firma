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
from backend.cleanup_photos import cleanup, PHOTO_LIFECYCLE_LOCK
from backend.provision import provision
from test_backend import system, send, h


def test_application_role_has_dml_but_no_ddl_or_migration_access(pg_url):
    role='app_test_'+uuid.uuid4().hex
    secret=uuid.uuid4().hex
    parts=urlsplit(pg_url)
    app_url=urlunsplit(parts._replace(netloc=role+':'+secret+'@'+parts.netloc.split('@',1)[1]))
    try:
        provision(pg_url,username=role,password=secret)
        provision(pg_url,username=role,password=secret)
        with connect(app_url) as db:
            assert db.execute('SELECT current_user AS u').fetchone()['u']==role
            db.execute("INSERT INTO cooperatives VALUES('test','Test')")
            db.execute("UPDATE cooperatives SET name='Changed' WHERE id='test'")
            assert db.execute('SELECT PostGIS_Version() AS v').fetchone()['v']
        for forbidden in ['CREATE TABLE denied(id int)','ALTER TABLE users ADD denied int','DROP TABLE incidents','SELECT * FROM schema_migrations','DELETE FROM schema_migrations','CREATE ROLE denied_role']:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                with connect(app_url) as db:db.execute(forbidden)
        with pytest.raises(ValueError):
            provision(pg_url,username=parts.username,password=secret)
    finally:
        with connect(pg_url) as db:
            db.execute(sql.SQL('DROP OWNED BY {}').format(sql.Identifier(role)))
            db.execute(sql.SQL('DROP ROLE {}').format(sql.Identifier(role)))
