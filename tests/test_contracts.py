"""Contratos publicados precisam corresponder aos modelos/rotas executáveis."""
import json
from pathlib import Path
import pytest
from backend.main import create_app
from backend.schemas import Incident
from backend.vision import SimulatedProvider
from dados.main import create_app as data_app


@pytest.mark.parametrize('contract',['backend','data','metadata'])
def test_versioned_contract_matches_generated_schema(contract,tmp_path):
    root=Path(__file__).resolve().parents[1]
    if contract=='backend':
        path=root/'backend/openapi.json'
        generated=create_app('postgresql://unused/unused',photo_dir=tmp_path,vision_provider=SimulatedProvider()).openapi()
    elif contract=='data':
        path=root/'dados-api/openapi.json'
        generated=data_app(mode='demo',api_key='contract-test-key-32-characters').openapi()
    else:
        path=root/'backend/incident-metadata.schema.json'
        generated=Incident.model_json_schema()
    assert json.loads(path.read_text())==generated
