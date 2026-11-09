# Notification delivery and review checks

Domain-event processing commits in-app notifications and email intents together, then acknowledges Kafka. Invalid envelopes remain unacknowledged for the configured error handler; a durable DLQ must be configured before treating poison-message recovery as complete.

Email recipients must be present in the producer contract. No customer-email lookup or guessed recipient is performed. An order-created event is not treated as order-confirmed. The separate Identity `email.requested`/OTP consumer is outside this domain-event PR.

The SMTP worker is disabled by default (`MAIL_SENDER_ENABLED=false`). When enabled, it claims committed QUEUED rows with PostgreSQL `SKIP LOCKED`, releases the transaction, then sends. Connect failures retry with bounded backoff. Unknown SMTP outcomes and stale SENDING claims become FAILED with `SMTP_OUTCOME_UNKNOWN`: reconcile with the provider before any manual requeue, because SMTP cannot guarantee exactly-once delivery. Diagnostics never persist provider exception text or sender credentials. Missing templates fail instead of sending generic content.

Loyalty mutation endpoints require a validated `INTERNAL_SERVICE` JWT. Order compensation uses `PROMOTION_SERVICE_TOKEN` from Config Server/environment, with the configured issuer/audience and revocation checks. Customer preview is owner-scoped and capped by order value. Existing tiers are preserved; no undocumented thresholds are introduced. Checkout redemption remains fail-closed until INT-47 actually debits/reserves points and compensates failures; preview alone must never create a discount.

Run backend tests/build with the repository Gradle wrapper. PostgreSQL integration tests additionally require `CLUCKY_TEST_DB_URL` and `CLUCKY_TEST_DB_PASSWORD` pointing at a **fresh disposable database** (user `postgres`); they migrate their owned schemas. They are skipped without these variables. SMTP is mocked, so these tests do not send mail. The integration checks exercise concurrent earn/redeem/release, durable enqueue deduplication, transaction-free SMTP, and safe retry/unknown-outcome handling.
