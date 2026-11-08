"""Teste de navegador com Compose completo e volumes exclusivos descartáveis (Linux/Docker)."""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
from urllib.request import urlopen

from configure import configure


def main():
    root=Path(__file__).resolve().parents[1]
    project='terra-firma-ui-'+secrets.token_hex(4)
    password=secrets.token_urlsafe(24)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port=sock.getsockname()[1]
    with tempfile.TemporaryDirectory(prefix='terra-ui-') as temp:
        config=Path(temp)/'private.env'
        configure(config,port)
        with config.open('a') as file:
            file.write('BACKEND_PORT=0\nDATA_PORT=0\n')
        compose=['docker','compose','--project-name',project,'--env-file',str(config)]
        def run(args,**kwargs):
            return subprocess.run(args,cwd=root,check=True,**kwargs)
        try:
            run([*compose,'up','--build','-d'])
            ready=False
            for _ in range(90):
                try:
                    with urlopen(f'http://127.0.0.1:{port}/health',timeout=2) as response:
                        ready=response.status==200
                except Exception:
                    pass
                if ready:break
                time.sleep(1)
            if not ready:raise RuntimeError('A stack não ficou saudável')
            run([*compose,'exec','-T','backend','python','-m','backend.bootstrap',
                '--username','coop.e2e','--name','Cooperativa de teste','--cooperative','E2E fictícia',
                '--password-stdin'],input=password+'\n',text=True)
            run(['docker','build','-f','web/tests/Dockerfile','-t',project+'-browser','.'])
            environment={**os.environ,'E2E_BASE_URL':f'http://127.0.0.1:{port}',
                         'E2E_ADMIN_PASSWORD':password}
            run(['docker','run','--rm','--network','host','--ipc','host',
                 '-e','E2E_BASE_URL','-e','E2E_ADMIN_PASSWORD',project+'-browser'],env=environment)
        except Exception:
            subprocess.run([*compose,'logs','--no-color'],cwd=root,check=False)
            raise
        finally:
            subprocess.run([*compose,'down','--volumes','--remove-orphans'],cwd=root,check=False)


if __name__=='__main__':main()
