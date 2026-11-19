-- Legal revisions are immutable content snapshots. Publication/draft pointers live on the document.
CREATE TABLE identity_service.legal_documents (
  document_type VARCHAR(32) PRIMARY KEY CHECK (document_type IN ('TERMS_OF_SERVICE', 'PRIVACY_POLICY')),
  revision_counter INTEGER NOT NULL DEFAULT 0,
  draft_revision_id BIGINT,
  published_revision_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE identity_service.legal_revisions (
  id BIGSERIAL PRIMARY KEY,
  document_type VARCHAR(32) NOT NULL REFERENCES identity_service.legal_documents(document_type),
  version INTEGER NOT NULL CHECK (version > 0),
  title_vi VARCHAR(160) NOT NULL,
  title_en VARCHAR(160) NOT NULL,
  html_vi TEXT NOT NULL,
  html_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by BIGINT NOT NULL REFERENCES identity_service.users(id),
  published_at TIMESTAMPTZ,
  UNIQUE(document_type, version),
  UNIQUE(document_type, id)
);

ALTER TABLE identity_service.legal_documents
  ADD CONSTRAINT legal_draft_same_document
    FOREIGN KEY (document_type, draft_revision_id)
    REFERENCES identity_service.legal_revisions(document_type, id),
  ADD CONSTRAINT legal_published_same_document
    FOREIGN KEY (document_type, published_revision_id)
    REFERENCES identity_service.legal_revisions(document_type, id);

CREATE TABLE identity_service.legal_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  terms_revision_id BIGINT NOT NULL REFERENCES identity_service.legal_revisions(id),
  privacy_revision_id BIGINT NOT NULL REFERENCES identity_service.legal_revisions(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source VARCHAR(24) NOT NULL CHECK (source IN ('PHONE_REGISTER', 'GOOGLE_COMPLETE'))
);
CREATE INDEX legal_consents_user_idx ON identity_service.legal_consents(user_id, accepted_at DESC);

INSERT INTO identity_service.legal_documents(document_type)
VALUES ('TERMS_OF_SERVICE'), ('PRIVACY_POLICY');
-- Intentional fail-closed bootstrap: an ADMIN must review/publish both documents
-- before new customer registration can be accepted. No placeholder is auto-published.
