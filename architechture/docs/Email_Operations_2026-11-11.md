# BE-62 / BE-63 / UI-50 — email delivery operations

Implementation scope approved in chat on 11 November 2026. This contract supersedes the earlier deferred manual-retry notes for these three tasks. Implementation is not functional acceptance; no standalone tests or browser checks have been run by the agent.

12 November update: [the branded template inventory and wiring matrix](Email_Templates_2026-11-12.md) adds 19 active templates, inline logo, HTML/text alternatives and verified customer-contact lookup. It supersedes the old plain-text-only and producer-email-only assumptions. Security input contracts and durable failure/retry boundaries remain unchanged.

V14 applies the user-approved minimal email design across those 19 keys. Security email has no CTA; transaction CTAs are centered. This changes only newly rendered intents: retained encrypted snapshots keep their original content for both automatic and authorized manual retries.

## Ownership and scope

- BE-62: Cao Tất Thành; delivery identity, snapshots, attempts, claims, automatic retry, recovery, atomic terminal handoff.
- BE-63: Mai Sơn Việt; failure publication, read APIs, store scoping, metrics and this runbook.
- UI-50: Mai Sơn Việt; filter/detail UI and the supporting restricted manual-retry endpoint. This is not a public send-mail endpoint.
- Reuse Notification's database, Kafka, JavaMail, Actuator and Gateway. No separate delivery database, service, monitoring stack or automated SMTP-unknown replay.

## Delivery and retention

V11 adds the ledger/outbox schema; V12 preserves branch-security challenge/account/login/role/purpose context in its frozen template. Security templates must match their configured input topic and OTP length (branch: 8 digits; customer register/reset: 6 digits).

`email_logs` remains the delivery source of truth. `messageId` is unique; identical commands deduplicate. The keyed command fingerprint includes recipient, template key, sorted variables, trusted store and declared expiry, not correlation/source event IDs. A changed command under the same ID is rejected and recorded independently in `email_command_conflicts`, without retaining the conflicting payload. Old rows without fingerprints cannot be silently overwritten.

At enqueue, render once and freeze subject/body/HTML (HTML is optional for existing v1 snapshots). `variables` contains an authenticated AES-256-GCM snapshot (v1), not plaintext variables. Nonces are random and messageId is authenticated additional data. HMAC-SHA256 fingerprints prevent offline guessing of low-entropy OTPs from a public digest. Domain-separated keys derive from the existing backend JWT secret; never change this secret while snapshots are pending without planning a migration/key-ring upgrade. A wrong key fails closed, never falls back to plaintext or a new template.

The API subject is an unpersonalized template heading; legacy headings are withheld. Recipient addresses are masked. Body, snapshot, original variable values, provider exception text and credentials never appear in HTTP responses or failure events. App Password stays in environment/Config Server only.

Security topics are `email.requested` and `identity.branch-email`, configured through Config Server. Only register/reset OTP and branch-security templates are accepted. Identity supplies absolute `expiresAt`; invalid/missing expiry is rejected into the existing Kafka recovery path, never extended from consumption time. OTP snapshots are retained only until expiry or a terminal outcome. All security emails are global/private to Admin, never assigned a store from their recipient. Consumer ACK happens after durable enqueue; SMTP runs separately without an open database transaction.

Business snapshots expire after at most `mail-sender.retention-hours` (default 168, maximum 168). Remove snapshots after success, expiry, or any terminal security-email outcome. A poll performs cleanup even when SMTP sending is disabled; when the service is down cleanup resumes on startup. Attempt/diagnostic metadata remains for audit; there is no automatic deletion of business/audit records. Protect database backups and Kafka topics according to their existing retention/access policy.

States: QUEUED → SENDING → SENT / QUEUED / FAILED / EXPIRED. SENT means SMTP accepted, not inbox delivered. Automatic retry applies only to proven connection/DNS failure before submission; authentication failure is terminal but eligible for a manual retry after fixing credentials. Other SMTP errors/timeouts are conservatively SMTP_OUTCOME_UNKNOWN. No automatic or UI retry of unknown outcomes.

Each claim creates one `email_attempts` row with a unique token and monotonically increasing attempt number. Transactional `FOR UPDATE SKIP LOCKED` prevents competing claims. Result writes require the current claim token and live lease. Expired leases become FAILED/SMTP_OUTCOME_UNKNOWN; a late worker cannot overwrite recovery. A pause/crash around SMTP remains an inherently ambiguous window, not an exactly-once guarantee.

`max-retries` retains its configuration name but counts **total attempts per cycle** (default 3). Backoff starts at 5 seconds, doubles and caps at 300 seconds. Each manually authorized cycle increments generation and starts a new bounded attempt budget; default maximum 2 manual cycles. Lifetime attempt history is never reset. Lease defaults to 300 seconds and must exceed six configured SMTP timeouts.

Legacy FAILED rows get a diagnostic failure intent during migration. Legacy QUEUED/PENDING rows without a frozen snapshot are stopped as LEGACY_UNSNAPSHOTTED rather than rendered with a potentially changed template; existing SENDING rows are marked unknown. Do not reconstruct OTPs, store ownership or past attempt histories. These records remain visible but are not eligible for manual retry.

## API / RBAC

All routes go through Gateway. Unauthenticated: 401. Customer/Staff/other disallowed roles: 403. Error responses use the existing ApiError catalog; invalid filters: 400 VALIDATION_ERROR, invisible/missing detail: 404 RESOURCE_NOT_FOUND, ineligible/stale retry: 409 RESOURCE_CONFLICT.

Date filters accept years 0001–9999; out-of-range dates are validation errors, not database failures.

- `GET /api/notifications/email-logs`: page≥0, size 1–100; literal case-insensitive recipient substring (≤255), exact status/template (≤100, letters/digits/underscore/hyphen), UTC creation interval `[from,to)`. Response `{content,page,size,totalElements,totalPages}`. UI date inputs represent Vietnam UTC+7 days. Template is a filter, not free-form SQL or a new template creation operation.
- `GET /api/notifications/email-logs/{id}`: `{delivery,attempts,failures,retries}`. Attempts/failures are newest-first, bounded to 200 (configured maximum lifetime attempts ≤120). Manual actor history is Admin-only. Includes stable IDs, safe failure categories, generation, expiry, `canRetry`, `retryBlockedReason`, and failure publication status. No recipient/body editing.
- Admin reads all stores. Manager reads only rows with trusted `store_id` matching the JWT and `sensitive=false`; SQL scopes both rows and counts. Client parameters cannot select another store. Missing store/global/auth logs remain Admin-only. New domain emails take store ID from the already source-validated producer envelope, not an address or frontend field; historical unknown scope is not inferred. Broker ACLs must restrict which services may publish these topics.
- `POST /api/notifications/email-logs/{id}/retry`, Admin only: `{requestId: UUID, expectedGeneration: nonnegative integer}`. Lock the delivery; require FAILED, retained unexpired snapshot, non-security template, safe connection/auth failure, remaining manual budget and matching generation. Record actor/request/generation and enqueue atomically. Response `{id,generation,replayed}`. Same request/actor/generation returns the original accepted result even after a subsequent send; a changed request for an old generation conflicts. SENT, QUEUED, SENDING, EXPIRED and unknown outcomes cannot retry. No new recipient/body is accepted as a command field. Browser network uncertainty must refetch before another decision; button state is not the security boundary.

Admin inbox endpoints remain Admin-only. Manager access to email logs does not grant access to the Admin notification inbox or a resend button.

## Failure stream / replay

Terminal delivery state and `email_failure_outbox` insert are in the same DB transaction. Unique `(delivery_id,generation)` means one logical terminal failure per cycle, with a stable UUID. A scheduled publisher takes a locked pending row, publishes, waits for broker acknowledgement and only then marks it published. Broker outage leaves pending intent and bounded publication backoff; there is no max-attempt drop. Restart after broker ACK but before DB commit may republish the same UUID: delivery is at-least-once, not exactly-once.

Topic `notification.email-failed` (Config Server: `mail-sender.failure-topic`) is the terminal diagnostic/dead-letter stream, **not** a send command. Envelope: `{eventId,correlationId,eventType,sourceService,occurredAt,payload}`. Payload allowlist: `{deliveryId,messageId,sourceEventId,generation,attemptNumber,failureCode}`. No recipients, subjects, OTPs, body, template variables, raw exceptions or credential-bearing headers. Preserve this eventId when re-publishing or consuming; any future subscriber must deduplicate it before side effects. There is deliberately no subscriber that sends email from this stream.

Existing `<source-topic>.DLT` still handles failures to accept the source event (before enqueue). It is separate from SMTP failure after Kafka ACK. Do not feed the new terminal stream into the general order-event replay script or `email.requested`.

Recovery procedure:
1. Find the delivery by filters, open attempts and failure publication details; record delivery/message/event/correlation IDs, not secret payloads.
2. If outbox is PENDING, restore Kafka and let the publisher resume. Do not manually create another failure record or reset email status.
3. If diagnostic re-publication is required after acknowledged publication, select the exact failure UUID and record the operator/reason in the incident record. With an authorized database session, reset only that outbox row's `published_at=NULL,next_attempt_at=now()`; leave UUID, generation and payload identity unchanged. This re-emits diagnostics only, never SMTP. No bulk replay is authorized by this runbook.
4. For safe connection/auth FAILED, fix the dependency then use the Admin retry API/UI. Keep requestId stable on uncertain HTTP outcomes. If retention/limits block it, do not bypass checks with SQL; obtain a new legitimate producer action if appropriate.
5. For SMTP_OUTCOME_UNKNOWN, reconcile with the provider; no automatic or UI retry. SENT is not evidence of inbox arrival. For expired OTP use the existing authentication resend flow, generating a new challenge, never replay the old code.

Metrics through existing Actuator: `clucky.email.attempts{outcome}`, `clucky.email.terminal{reason}`, `clucky.email.failure.publication{outcome=ACKED|PENDING}`, `clucky.email.command.conflicts`. Tags are fixed enums; never label by recipient/ID. Counters are operational process observations, not an accounting ledger; persisted attempt/outbox rows are authoritative after crashes/restarts. Worker restores MDC in `finally`.

## Acceptance checklist (not executed)

- Same command replay / changed-payload conflict; snapshot unaffected by template changes; no plaintext OTP in stored snapshots/API/diagnostics.
- Competing workers; crash before submission, unknown outcome after SMTP acceptance, stale worker result and expiry while queued.
- Backoff/maximum attempts; one atomic terminal intent; Kafka down / timeout / restart after ACK; stable failure UUID on duplicate publication.
- Admin and two Managers: page/count/detail scopes; OTP/global logs hidden; Customer/Staff rejected; malformed filters and IDs rejected.
- Safe manual retry; repeated request; simultaneous different Admins; outdated generation; SENT/unknown/expired/security/limit rejected; immutable recipient/content.
- UI template/date/recipient/status filters, attempt/failure history, VI/EN labels, keyboard confirmation, loading/error states and HTTP uncertainty recovery.

Regression sources: EmailDeliverySafetyTest, EmailDeliveryPostgresTest, AdminNotificationOperationsTest, NotificationSafetyTest, EmailEventPublisherTest. PostgreSQL integration checks require CLUCKY_TEST_DB_URL/CLUCKY_TEST_DB_PASSWORD pointing only to a fresh disposable database, never local application data. Test mail transport is mocked. Agent did not run these tests; Docker build/health results are reported separately.

## Docker handoff — 11 November 2026

Ran `./start-docker.ps1 -Services identity-service,notification-service,admin`, then scoped `notification-service` rebuilds for final recovery/date validation and the V12 security-template update. All commands completed successfully. Final `-Action status` reports identity-service, notification-service and admin healthy. Java bootJar builds succeeded; the Admin Docker build included its existing TypeScript/Vite pipeline. Notification startup completed; no standalone tests, browser checks, SMTP probes or functional API calls were run. Existing Docker volumes were retained. Three tasks remain CHỜ NGHIỆM THU, not DONE.
