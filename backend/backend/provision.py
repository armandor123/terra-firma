"""Provisionamento explícito da identidade DML; executado somente pelo migrador."""
import os
import re
from psycopg import sql
from .db import connect

TABLES=('cooperatives','users','properties','sessions','refresh_history','incidents','reviews','request_limits')


def provision(url=None, *, username=None, password=None):
    username=username or os.environ['APP_DATABASE_USER']
    password=password or os.environ['APP_DATABASE_PASSWORD']
    if not re.fullmatch(r'[a-z][a-z0-9_]{2,62}',username) or len(password)<24:
        raise ValueError('Identidade de aplicação inválida ou senha muito curta')
    with connect(url) as db:
        db.execute('SELECT pg_advisory_xact_lock(71643001)')
        current=db.execute('SELECT current_user AS owner,current_schema() AS schema,current_database() AS database').fetchone()
        if username==current['owner']:raise ValueError('Migração e aplicação precisam de usuários distintos')
        role=db.execute('SELECT * FROM pg_roles WHERE rolname=%s',(username,)).fetchone()
        if role and (role['rolsuper'] or role['rolcreatedb'] or role['rolcreaterole'] or role['rolreplication'] or role['rolbypassrls']):
            raise ValueError('Usuário existente tem privilégios elevados; escolha identidade dedicada')
        if role and db.execute('SELECT 1 FROM pg_auth_members WHERE member=%s',(role['oid'],)).fetchone():
            raise ValueError('Usuário existente pertence a outros papéis; escolha identidade dedicada')
        if role and db.execute('SELECT 1 FROM pg_namespace WHERE nspowner=%s UNION SELECT 1 FROM pg_class WHERE relowner=%s',(role['oid'],role['oid'])).fetchone():
            raise ValueError('Usuário existente possui objetos; escolha identidade dedicada')
        action='ALTER' if role else 'CREATE'
        db.execute(sql.SQL(action+' ROLE {} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD {}').format(sql.Identifier(username),sql.Literal(password)))
        db.execute(sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(sql.Identifier(current['database']),sql.Identifier(username)))
        db.execute(sql.SQL('REVOKE CREATE ON SCHEMA {} FROM PUBLIC').format(sql.Identifier(current['schema'])))
        db.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO {}').format(sql.Identifier(current['schema']),sql.Identifier(username)))
        for table in TABLES:
            db.execute(sql.SQL('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE {}.{} TO {}').format(sql.Identifier(current['schema']),sql.Identifier(table),sql.Identifier(username)))
        db.execute(sql.SQL('GRANT USAGE,SELECT ON SEQUENCE {}.reviews_id_seq TO {}').format(sql.Identifier(current['schema']),sql.Identifier(username)))


if __name__=='__main__':
    provision()
    print('Identidade de aplicação provisionada; credenciais não exibidas.')
