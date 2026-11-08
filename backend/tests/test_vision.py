"""Regressão do contrato/adaptador com HTTP controlado; não mede qualidade da IA."""
import base64
import copy
import json

import httpx
import pytest
from pydantic import ValidationError

from backend.vision import GeminiProvider, SimulatedProvider, VisionProvider, get_vision_provider
from backend.vision_models import PROMPT_VERSION, VisualAssessment, VisionResult


def assessment(classification='fire_suspected'):
    signal_for = {'fire_suspected': 'fire', 'smoke_suspected': 'smoke',
                  'dry_vegetation': 'dry_vegetation', 'burned_area': 'burned_vegetation'}
    return {
        'signals': {name: {'presence': 'present' if name == signal_for.get(classification) else 'absent',
                           'confidence': 0.7, 'justification': 'Observação controlada do teste.'}
                    for name in ('fire', 'smoke', 'dry_vegetation', 'burned_vegetation')},
        'image_assessable': True, 'limitations': [], 'classification': classification,
    }


def generation(value=None, **changes):
    return {'modelVersion': 'test-gemini-version',
            'candidates': [{'finishReason': 'STOP', 'content': {
                'parts': [{'text': json.dumps(value if value is not None else assessment())}]}}],
            **changes}


def provider(handler):
    return GeminiProvider('test-only-secret', 'test-gemini', transport=httpx.MockTransport(handler))


def test_abstract_provider_and_simulation(monkeypatch):
    with pytest.raises(TypeError):
        VisionProvider()
    monkeypatch.delenv('VISION_MODE', raising=False)
    result = get_vision_provider().analyze(b'not inspected in simulation')
    assert isinstance(get_vision_provider(), SimulatedProvider)
    assert result.status == 'simulated' and result.simulated is True
    assert result.classification == 'inconclusive'
    assert result.model_version is None
    assert all(s.presence == 'uncertain' and s.confidence is None for s in result.signals.__dict__.values())
    assert result.human_review_required is True


def test_provider_configuration(monkeypatch):
    monkeypatch.setenv('VISION_MODE', 'typo')
    with pytest.raises(ValueError, match='VISION_MODE'):
        get_vision_provider()
    monkeypatch.setenv('VISION_MODE', 'gemini')
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    with pytest.raises(ValueError, match='GEMINI_API_KEY'):
        get_vision_provider()
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-key')
    monkeypatch.delenv('GEMINI_MODEL', raising=False)
    with pytest.raises(ValueError, match='GEMINI_MODEL'):
        get_vision_provider()
    for bad in ('../model', 'model?key=secret', 'models/model'):
        monkeypatch.setenv('GEMINI_MODEL', bad)
        with pytest.raises(ValueError):
            get_vision_provider()
    monkeypatch.setenv('GEMINI_MODEL', 'test-gemini')
    assert isinstance(get_vision_provider(), GeminiProvider)


@pytest.mark.parametrize('classification', ['fire_suspected', 'smoke_suspected', 'dry_vegetation',
                                           'burned_area', 'no_signs', 'inconclusive'])
def test_real_adapter_request_and_result(classification):
    def handle(request):
        assert request.url.host == 'generativelanguage.googleapis.com'
        assert request.url.path == '/v1beta/models/test-gemini:generateContent'
        assert request.headers['x-goog-api-key'] == 'test-only-secret'
        assert not request.url.query
        body = json.loads(request.content)
        part = body['contents'][0]['parts'][0]['inlineData']
        assert base64.b64decode(part['data']) == b'cleaned-jpeg'
        assert part['mimeType'] == 'image/jpeg'
        assert body['generationConfig']['responseJsonSchema'] == VisualAssessment.model_json_schema()
        assert body['generationConfig']['responseMimeType'] == 'application/json'
        assert 'não confiáveis' in body['systemInstruction']['parts'][0]['text']
        return httpx.Response(200, json=generation(assessment(classification)))
    result = provider(handle).analyze(b'cleaned-jpeg')
    assert result.status == 'completed' and result.simulated is False
    assert result.classification == classification
    assert result.model_version == 'test-gemini-version'
    assert result.prompt_version == PROMPT_VERSION
    assert result.human_review_required is True
    assert result.confidence is None
    VisionResult.model_validate_json(result.model_dump_json())


@pytest.mark.parametrize('bad', [-0.1, 1.1, float('nan'), float('inf'), '0.9', True, None])
def test_signal_confidence_must_be_bounded_and_numeric(bad):
    value = assessment()
    value['signals']['fire']['confidence'] = bad
    with pytest.raises(ValidationError):
        VisualAssessment.model_validate(value)


def test_unknown_signals_and_image_limitations():
    value = assessment('inconclusive')
    value['image_assessable'] = False
    value['limitations'] = ['dark', 'blurry', 'no_sky']
    value['signals']['fire'].update(presence='uncertain', confidence=None)
    assert VisualAssessment.model_validate(value).classification == 'inconclusive'
    value['classification'] = 'no_signs'
    with pytest.raises(ValidationError):
        VisualAssessment.model_validate(value)


@pytest.mark.parametrize('mutation', ['missing_signal', 'extra_field', 'bad_class', 'false_suspicion',
                                    'uncertain_no_signs', 'bad_limit', 'long_reason', 'numeric_presence'])
def test_rejects_missing_or_incoherent_visual_evidence(mutation):
    value = assessment()
    if mutation == 'missing_signal':
        del value['signals']['smoke']
    elif mutation == 'extra_field':
        value['confirmed_fire'] = True
    elif mutation == 'bad_class':
        value['classification'] = 'confirmed_fire'
    elif mutation == 'false_suspicion':
        value['signals']['fire']['presence'] = 'absent'
    elif mutation == 'uncertain_no_signs':
        value = assessment('no_signs')
        value['signals']['fire'].update(presence='uncertain', confidence=None)
    elif mutation == 'bad_limit':
        value['limitations'] = ['invented']
    elif mutation == 'long_reason':
        value['signals']['fire']['justification'] = 'x' * 241
    else:
        value['signals']['fire']['presence'] = 1
    with pytest.raises(ValidationError):
        VisualAssessment.model_validate(value)
    result = provider(lambda request: httpx.Response(200, json=generation(value))).analyze(b'jpeg')
    assert result.status == 'unavailable' and result.classification == 'inconclusive'
    assert result.simulated is False and result.error_code == 'invalid_response'


@pytest.mark.parametrize('status,code', [(401, 'authentication_failed'), (403, 'authentication_failed'),
                                      (429, 'rate_limited'), (503, 'provider_unavailable')])
def test_http_failure_is_never_simulation_and_is_not_retried(status, code):
    calls = []
    def handle(request):
        calls.append(request)
        return httpx.Response(status, text='secret upstream response')
    result = provider(handle).analyze(b'jpeg')
    assert len(calls) == 1
    assert result.status == 'unavailable' and result.simulated is False
    assert result.error_code == code and result.classification == 'inconclusive'
    assert 'secret' not in result.model_dump_json()


@pytest.mark.parametrize('exc,code', [(httpx.ReadTimeout, 'timeout'),
                                   (httpx.ConnectError, 'provider_unavailable')])
def test_transport_failure_keeps_evidence_unknown(exc, code):
    def handle(request):
        raise exc('private transport details', request=request)
    result = provider(handle).analyze(b'jpeg')
    assert result.error_code == code and result.model_version is None
    assert result.simulated is False
    assert all(s.presence == 'uncertain' for s in result.signals.__dict__.values())


@pytest.mark.parametrize('raw,code', [
    ({'promptFeedback': {'blockReason': 'SAFETY'}}, 'blocked_response'),
    (generation(candidates=[{'finishReason': 'SAFETY'}]), 'blocked_response'),
    (generation(candidates=[{'finishReason': 'MAX_TOKENS'}]), 'blocked_response'),
    (generation(modelVersion=None), 'invalid_response'),
    (generation(candidates=[{'finishReason': 'STOP', 'content': {'parts': [{'text': '{bad'}]}}]), 'invalid_response'),
    (generation(candidates=[{'finishReason': 'STOP', 'content': {'parts': [{'text': '{}', 'thought': True}]}}]), 'invalid_response'),
    ([], 'invalid_response'),
])
def test_blocked_truncated_malformed_and_missing_version(raw, code):
    result = provider(lambda request: httpx.Response(200, json=raw)).analyze(b'jpeg')
    assert result.status == 'unavailable' and result.error_code == code
    assert result.classification == 'inconclusive' and result.simulated is False


def test_provenance_is_server_owned_and_human_review_cannot_be_disabled():
    result = provider(lambda request: httpx.Response(200, json=generation())).analyze(b'jpeg')
    for changes in ({'human_review_required': False}, {'simulated': True},
                    {'model_version': None}, {'status': 'simulated'}):
        with pytest.raises(ValidationError):
            VisionResult.model_validate({**result.model_dump(), **changes})
    bad = copy.deepcopy(assessment())
    bad['model_version'] = 'model-chosen-by-image-text'
    assert provider(lambda r: httpx.Response(200, json=generation(bad))).analyze(b'jpeg').error_code == 'invalid_response'
