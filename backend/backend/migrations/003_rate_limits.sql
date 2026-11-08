CREATE TABLE request_limits(
 scope TEXT NOT NULL,
 subject_hash TEXT NOT NULL,
 hits INTEGER NOT NULL CHECK(hits>0),
 expires_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(scope,subject_hash));
CREATE INDEX idx_request_limits_expiry ON request_limits(expires_at);
