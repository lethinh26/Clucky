ALTER TABLE identity_service.users
    ADD COLUMN firebase_uid VARCHAR(128);

ALTER TABLE identity_service.users
    ADD CONSTRAINT users_firebase_uid_unique UNIQUE (firebase_uid);
