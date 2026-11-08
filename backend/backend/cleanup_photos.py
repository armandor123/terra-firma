"""Inspeciona fotos órfãs; só remove com --apply, após carência e sob lock de uploads."""
import argparse
import os
from pathlib import Path
import re
import time
from .db import connect

PHOTO_LIFECYCLE_LOCK=71643002


def cleanup(url=None, root=None, *, apply=False, grace_hours=24):
    if grace_hours<1 or not float(grace_hours)<float('inf'):
        raise ValueError('Carência deve ser finita e >=1 hora')
    directory=Path(root or os.getenv('PHOTO_DIR','./data/photos')).resolve()
    cutoff=time.time()-grace_hours*3600
    candidates=[]
    with connect(url) as db:
        db.execute("SET LOCAL lock_timeout='5s'")
        # Upload adquire lock compartilhado antes da escrita e mantém até commit.
        db.execute('SELECT pg_advisory_xact_lock(%s)',(PHOTO_LIFECYCLE_LOCK,))
        referenced={row['photo_key'] for row in db.execute('SELECT DISTINCT photo_key FROM incidents')}
        for path in sorted(directory.iterdir()):
            if path.is_symlink() or not path.is_file():continue
            if not (re.fullmatch(r'[0-9a-f]{64}\.jpg',path.name) or path.name.startswith('.upload-')):continue
            if path.name in referenced or path.stat().st_mtime>=cutoff:continue
            candidates.append(path.name)
            if apply:path.unlink()
    return {'mode':'apply' if apply else 'dry_run','orphan_count':len(candidates),'files':candidates}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--grace-hours',type=float,default=24)
    args=parser.parse_args()
    result=cleanup(apply=args.apply,grace_hours=args.grace_hours)
    print(f"{result['mode']}: {result['orphan_count']} arquivo(s) órfão(s); nenhuma foto referenciada removida.")
