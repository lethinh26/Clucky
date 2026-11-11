ALTER TABLE notification_service.notifications
    ADD COLUMN source_event_id VARCHAR(160) UNIQUE,
    ADD COLUMN correlation_id VARCHAR(128);
