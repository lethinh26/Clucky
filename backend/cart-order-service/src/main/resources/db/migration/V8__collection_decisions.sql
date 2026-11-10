CREATE TABLE order_service.collection_decisions (
    collection_id UUID PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES order_service.orders(id),
    event_id VARCHAR(160) NOT NULL UNIQUE, decision VARCHAR(30) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_accepted_collection ON order_service.collection_decisions(order_id) WHERE decision='ACCEPTED';
ALTER TABLE order_service.orders ADD COLUMN collection_method VARCHAR(20),
    ADD COLUMN collected_cash NUMERIC(12,0), ADD COLUMN declared_transfer NUMERIC(12,0);
