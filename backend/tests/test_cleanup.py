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
from test_backend import system, send, h


def test_orphan_cleanup_preserves_references_fresh_and_foreign_files(system,tmp_path):
    client,url=system
    assert send(client).status_code==201
    root=tmp_path/'photos'
    referenced=next(root.glob('*.jpg'))
    orphan=root/('a'*64+'.jpg');orphan.write_bytes(b'orphan')
    temporary=root/'.upload-abandoned';temporary.write_bytes(b'temporary')
    foreign=root/'unrelated.txt';foreign.write_text('keep')
    fresh=root/('b'*64+'.jpg');fresh.write_bytes(b'fresh')
    external=tmp_path/'external';external.write_text('keep')
    symlink=root/('c'*64+'.jpg');symlink.symlink_to(external)
    old=time.time()-48*3600
    for file in [referenced,orphan,temporary,foreign]:os.utime(file,(old,old))
    result=cleanup(url,root)
    assert result['mode']=='dry_run' and set(result['files'])=={orphan.name,temporary.name}
    assert orphan.exists() and temporary.exists()
    assert cleanup(url,root,apply=True)['orphan_count']==2
    assert referenced.exists() and fresh.exists() and foreign.exists() and symlink.is_symlink() and external.exists()
    assert cleanup(url,root,apply=True)['orphan_count']==0
    with pytest.raises(ValueError):cleanup(url,root,grace_hours=0)


def test_cleanup_exclusive_lock_conflicts_with_upload_lifecycle(pg_url,tmp_path):
    with connect(pg_url) as uploading:
        uploading.execute('SELECT pg_advisory_xact_lock_shared(%s)',(PHOTO_LIFECYCLE_LOCK,))
        with connect(pg_url) as cleaner:
            acquired=cleaner.execute('SELECT pg_try_advisory_xact_lock(%s) AS acquired',(PHOTO_LIFECYCLE_LOCK,)).fetchone()
            assert not acquired['acquired']
    assert cleanup(pg_url,tmp_path)['orphan_count']==0


