BEGIN;

CREATE SCHEMA IF NOT EXISTS wolfdesk;

CREATE SEQUENCE IF NOT EXISTS wolfdesk.support_cases_seq;

CREATE TABLE IF NOT EXISTS wolfdesk.support_cases (
  agg_id UUID PRIMARY KEY,
  case_data JSONB,
  case_version INTEGER,
  enumeration_timestamp BIGINT NOT NULL DEFAULT nextval('wolfdesk.support_cases_seq')
);

CREATE OR REPLACE FUNCTION increment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.enumeration_timestamp = nextval('wolfdesk.support_cases_seq');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_enum_timestamp_before_update
BEFORE UPDATE ON wolfdesk.support_cases
FOR EACH ROW EXECUTE FUNCTION increment_timestamp();

CREATE TABLE wolfdesk.outbox (
    event_id BIGSERIAL PRIMARY KEY,
    agg_id UUID NOT NULL,
    payload JSON NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_on TIMESTAMP NULL
);

CREATE INDEX idx_events_is_published ON wolfdesk.outbox (is_published);

COMMIT;

BEGIN;

CREATE SEQUENCE IF NOT EXISTS wolfdesk.support_cases_es_seq;

CREATE TABLE wolfdesk.support_cases_es (
    agg_id UUID NOT NULL,
    changeset_id INTEGER NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_on TIMESTAMP NULL,
    enumeration_timestamp BIGINT NOT NULL DEFAULT nextval('wolfdesk.support_cases_es_seq'),
    PRIMARY KEY (agg_id, changeset_id)
    
);

CREATE TRIGGER increment_es_enum_timestamp_before_update
BEFORE UPDATE ON wolfdesk.support_cases_es
FOR EACH ROW EXECUTE FUNCTION increment_timestamp();

COMMIT;
