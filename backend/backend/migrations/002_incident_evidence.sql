-- NULL preserva a distinção entre registro histórico sem snapshot e consulta sem dados.
ALTER TABLE incidents
 ADD COLUMN environment_snapshot JSONB,
 ADD COLUMN evidence_json JSONB;
