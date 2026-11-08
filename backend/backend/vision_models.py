"""Contrato de evidência visual; confiança declarada não é acurácia medida."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PROMPT_VERSION = 'terra-firma-vision-v1'
Classification = Literal['fire_suspected', 'smoke_suspected', 'dry_vegetation',
                         'burned_area', 'no_signs', 'inconclusive']
Limitation = Literal['dark', 'blurry', 'no_sky', 'obstructed', 'low_resolution',
                     'overexposed', 'cropped', 'other']
ErrorCode = Literal['timeout', 'authentication_failed', 'rate_limited',
                    'provider_unavailable', 'invalid_response', 'blocked_response']


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False,
                              str_strip_whitespace=True)


class Signal(Strict):
    presence: Literal['present', 'absent', 'uncertain']
    confidence: float | None = Field(ge=0, le=1)
    justification: str = Field(min_length=1, max_length=240)

    @model_validator(mode='after')
    def confidence_matches_presence(self):
        if self.presence == 'uncertain' and self.confidence is not None:
            raise ValueError('Sinal incerto exige confiança nula')
        if self.presence != 'uncertain' and self.confidence is None:
            raise ValueError('Presença/ausência exige confiança declarada')
        return self


class Signals(Strict):
    fire: Signal
    smoke: Signal
    dry_vegetation: Signal
    burned_vegetation: Signal


class VisualAssessment(Strict):
    signals: Signals
    image_assessable: bool
    limitations: list[Limitation] = Field(max_length=8)
    classification: Classification

    @model_validator(mode='after')
    def classification_matches_evidence(self):
        if not self.image_assessable and self.classification != 'inconclusive':
            raise ValueError('Imagem não avaliável exige resultado inconclusivo')
        expected = {'fire_suspected': 'fire', 'smoke_suspected': 'smoke',
                    'dry_vegetation': 'dry_vegetation', 'burned_area': 'burned_vegetation'}
        signal = expected.get(self.classification)
        if signal and getattr(self.signals, signal).presence != 'present':
            raise ValueError('Classificação exige o sinal correspondente presente')
        if self.classification == 'no_signs' and any(
            item.presence != 'absent' for item in self.signals.__dict__.values()
        ):
            raise ValueError('Sem indícios exige ausência explícita dos quatro sinais')
        return self


class VisionResult(VisualAssessment):
    schema_version: Literal['1.0'] = '1.0'
    status: Literal['simulated', 'completed', 'unavailable']
    provider: Literal['simulated', 'gemini']
    simulated: bool
    requested_model: str | None = Field(default=None, min_length=1, max_length=100)
    model_version: str | None = Field(default=None, min_length=1, max_length=200)
    prompt_version: Literal['terra-firma-vision-v1'] = PROMPT_VERSION
    human_review_required: Literal[True] = True
    # Compatibilidade com o resultado anterior: não há confiança global calibrada.
    confidence: None = None
    error_code: ErrorCode | None = None
    warning: str = Field(min_length=1, max_length=300)

    @model_validator(mode='after')
    def provenance_is_consistent(self):
        if self.simulated != (self.provider == 'simulated'):
            raise ValueError('Origem e simulated incompatíveis')
        if self.status == 'simulated':
            if not self.simulated or self.model_version is not None or self.error_code is not None:
                raise ValueError('Simulação não representa execução de modelo')
        elif self.simulated:
            raise ValueError('Resultado real não pode ser simulado')
        if self.status == 'completed':
            if not self.model_version or not self.requested_model or self.error_code is not None:
                raise ValueError('Execução concluída exige versão de modelo e ausência de erro')
        else:
            if self.classification != 'inconclusive' or self.image_assessable or any(
                item.presence != 'uncertain' for item in self.signals.__dict__.values()
            ):
                raise ValueError('Sem análise válida, todos os sinais são desconhecidos')
        if self.status == 'unavailable' and (not self.error_code or self.model_version is not None):
            raise ValueError('Falha exige código e não confirma versão executada')
        return self


def unknown_assessment(reason: str) -> dict:
    return {
        'signals': {name: {'presence': 'uncertain', 'confidence': None, 'justification': reason}
                    for name in Signals.model_fields},
        'image_assessable': False, 'limitations': [], 'classification': 'inconclusive',
    }
