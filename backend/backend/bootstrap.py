"""Criação local do representante. Nunca exposto por endpoint público."""
import argparse
import getpass
import os
import sys
from pathlib import Path
from .db import connect, database_url
from .main import passwords, uid
from .schemas import Farmer

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--username',required=True)
    parser.add_argument('--name',required=True)
    parser.add_argument('--cooperative',required=True)
    parser.add_argument('--password-stdin',action='store_true',help='Ler uma senha do stdin, sem argumento ou eco; uso automatizado explícito')
    args = parser.parse_args()
    Farmer(name=args.name, username=args.username)
    secret = sys.stdin.readline().rstrip('\r\n') if args.password_stdin else getpass.getpass('Senha inicial (mínimo 12 caracteres): ')
    confirmed = secret if args.password_stdin else getpass.getpass('Repita a senha: ')
    if len(secret)<12 or len(secret)>128 or secret != confirmed:
        raise SystemExit('Senha inválida ou confirmação diferente')
    url = database_url()
    with connect(url) as db:
        if db.execute('SELECT id FROM users WHERE username=%s',(args.username,)).fetchone():
            raise SystemExit('Usuário já existe; nenhuma alteração realizada')
        coop_id,user_id = uid(),uid()
        db.execute('INSERT INTO cooperatives VALUES(%s,%s)',(coop_id,args.cooperative))
        db.execute('INSERT INTO users VALUES(%s,%s,%s,%s,%s,%s,TRUE)',
                   (user_id,coop_id,args.name,args.username,passwords.hash(secret),'cooperative'))
    print('Representante criado. Troque a senha no primeiro acesso.')

if __name__=='__main__':
    main()
