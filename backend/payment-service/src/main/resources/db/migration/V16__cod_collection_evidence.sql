CREATE TABLE payment_service.cod_collection_evidence (
    order_id BIGINT PRIMARY KEY,
    order_code VARCHAR(40) NOT NULL,
    store_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mime_type VARCHAR(20) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    image_bytes BYTEA NOT NULL CHECK (octet_length(image_bytes) BETWEEN 1 AND 2097152),
    sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    review_reason VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX cod_collection_evidence_store_status ON payment_service.cod_collection_evidence(store_id, status);
