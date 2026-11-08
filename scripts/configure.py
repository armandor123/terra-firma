"""Gera configuração local sem expor segredos e sem sobrescrever instalação existente."""
import argparse
import os
from pathlib import Path
import secrets


def configure(path: Path, web_port: int = 8080):
    if not 1 <= web_port <= 65535:
        raise ValueError('Porta inválida')
    values = {
        'POSTGRES_USER':'terra_firma', 'POSTGRES_DB':'terra_firma',
        'POSTGRES_PASSWORD':secrets.token_urlsafe(32), 'DATA_API_KEY':secrets.token_urlsafe(32),
        'DATA_MODE':'demo', 'FIRMS_MAP_KEY':'', 'VISION_MODE':'simulated',
        'GEMINI_API_KEY':'', 'GEMINI_MODEL':'', 'EVIDENCE_RADIUS_KM':'10',
        'EVIDENCE_WINDOW_HOURS':'24', 'BACKEND_BIND':'127.0.0.1','BACKEND_PORT':'8000',
        'DATA_PORT':'8001','WEB_BIND':'127.0.0.1','WEB_PORT':str(web_port),
    }
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd,'w') as file:
        file.write('# Configuração privada gerada localmente; não versionar.\n')
        file.writelines(f'{key}={value}\n' for key,value in values.items())


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=Path('.env'))
    parser.add_argument('--web-port',type=int,default=8080)
    args=parser.parse_args()
    try:
        configure(args.output,args.web_port)
    except FileExistsError:
        raise SystemExit('Configuração já existe; nenhuma alteração. Preserve credenciais e volumes existentes.')
    print('Configuração criada. Segredos não foram impressos. Revise antes de usar dados reais.')
