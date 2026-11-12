# Notification delivery and review checks

## Admin operations integration (11 November 2026, not validated)

- `GET /api/notifications/email-logs?page=0&size=20&recipient=...&status=SENT&from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z`: ADMIN only; zero-based pagination, size 1–100, literal case-insensitive recipient substring, creation time `[from,to)`. Status is one of QUEUED/SENDING/SENT/FAILED/EXPIRED. Response `{content,page,size,totalElements,totalPages}`, rows `{id,toEmail,subject,status,template,sentAt,createdAt}`. Recipient and addresses within subject are masked in the backend. No bodies, template variables, exception text, credentials, or send/resend endpoint are exposed. `SENT` means SMTP accepted the submission, not confirmed inbox delivery.
- `GET /api/notifications/admin?page=0&size=20` returns the same page envelope with rows `{id,title,content,type,refId,storeId,isRead,createdAt}`. `GET /api/notifications/admin/unread-count` returns `{unreadCount}`. `PUT /api/notifications/admin/{id}/read` returns `{id,isRead:true}`; `PUT /api/notifications/admin/read-all` returns `{updatedCount}`. All four endpoints enforce ADMIN again in the service. Receipt ownership comes only from the authenticated user, never request data.
- Admin fan-out is a role-scoped inbox, not a guessed Identity user list: one sanitized `order.created` row per order, read receipts per Admin. Current Admins can see all stores and historical Admin alerts; losing ADMIN immediately loses access. Customer/Manager/Staff inboxes and reads cannot see or alter these rows. Only `cart-order-service` order-created events with positive `orderId`/`storeId` create these alerts. No arbitrary broadcast API or caller-selected audience exists. Kafka broker ACLs still need to restrict producers: envelope source strings alone are not cryptographic authentication.
- Apply Flyway V9 with the service rollout. It also records committed mail-template INSERT/UPDATE/DELETE changes in `notification_service.configuration_audit`, with SHA-256 before/after fingerprints, database actor, optional application actor/correlation ID and timestamp. This does not audit external Config Server/environment edits. No new template/settings mutation API is enabled. Any future application writer must call transaction-local `set_config('clucky.actor_id', actorId, true)` and `set_config('clucky.correlation_id', correlationId, true)` before changing templates. Protect the audit table with database grants; no audit mutation HTTP endpoint exists.

### Parent frontend wiring

- Import named/default `EmailLogsPage` from `frontend/react/src/pages/EmailLogs/index.tsx`; mount it in the ADMIN-only router and navigation, e.g. `/email-logs`. Date inputs use the browser's local day and send UTC boundaries; filtering is by creation timestamp, not SMTP completion timestamp.
- The shared `components/ui/AdminNotificationCenter.tsx` exists but is outside this agent's ownership. Replace its placeholder with `export { AdminNotificationCenter } from '../../pages/EmailLogs/AdminNotificationCenter';` in the parent change. The supplied component uses real Admin APIs, paginated results, unread count, independent read receipts and visible errors; no mock fallback. AdminLayout itself is unchanged.
- `frontend/react/src/lib/admin-notifications.ts` exports `adminNotificationsApi`, `EmailLog`, `EmailLogFilters`, `EmailStatus`, `AdminNotification`, and `NotificationPage<T>`. It uses the existing authenticated Gateway Axios client. New page-local labels are Vietnamese; shared locale files were not modified.

### Finance producer contract: refund.processed

Publish only after the final REFUNDED transaction commits, using the finance owner's durable outbox, stable eventId/correlationId and Kafka aggregate key `orderId`. Allowed sourceService: `cart-order-service` or `payment-service`. The topic and its DLT are declared by notification-service. This agent cannot change finance/Identity producers; their integration is required before claiming end-to-end refund delivery.

```json
{
  "eventId": "stable-refund-transition-id",
  "correlationId": "request-trace-id",
  "eventType": "refund.processed",
  "sourceService": "cart-order-service",
  "occurredAt": "2026-11-11T00:00:00Z",
  "payload": {
    "refundId": 5,
    "orderId": 42,
    "orderCode": "CLK-42",
    "storeId": 3,
    "customerId": 7,
    "status": "REFUNDED",
    "amount": 25000,
    "recipient": {"userId": 7, "role": "CUSTOMER", "email": "customer@example.com", "emailVerified": true}
  }
}
```

The producer must resolve `recipient` server-side from the order/refund owner and Identity's verified contact; never copy the refund operator, client-supplied email or arbitrary userId. The recipient ID must equal customerId and role must be CUSTOMER. Missing/unverified email creates an in-app notification only when that customer identity is established. No valid customer identity creates neither message. Both cases leave a durable reason in `notification_delivery_gaps`; there is no Staff fallback. Legacy refund events also require this recipient object before delivery, so finance must supply it for approved/rejected/waiting-bank-details/confirmed too.

Subject/body are owned and rendered by notification-service, not accepted from client/producer text: in-app subject `Hoàn tiền thành công`, body `Số tiền 25000đ cho đơn hàng #CLK-42 đã được hoàn tất.`; email `REFUND_PROCESSED` subject `Clucky — Hoàn tiền thành công cho đơn CLK-42`, body `Clucky đã hoàn 25000đ cho đơn CLK-42. Vui lòng đăng nhập để xem yêu cầu hoàn tiền.`. No bank details/evidence links enter these messages. `refund.approved` still does not mean money was returned. The migration installs the missing successful-refund email template. Sender persists the rendered subject before SMTP so attempted/failed logs retain it.

Choose one completion topic per refund: retain `refund.confirmed` or switch to `refund.processed`, never publish both for the same completion. New processed notifications deduplicate by refundId/channel/recipient even if a producer changes eventId; legacy event keys are preserved to avoid changing replay behavior of existing rows. In-app insertion and email enqueue use database conflicts, not a check-then-insert uniqueness assumption. SMTP unknown outcomes remain non-retryable automatically; no resend UI/API is added. Processed-refund DLT redaction intentionally does not preserve verified recipient contacts: replay must recover the authoritative event from the producer outbox, not reconstruct contacts from diagnostics.

Regression sources: `AdminNotificationOperationsTest` plus the existing notification/email tests. No tests, lint, typecheck, build, browser, SMTP probe or Docker rollout were run for this change. This is not production acceptance.

Domain-event processing commits in-app notifications and email intents together, then acknowledges Kafka. Invalid envelopes remain unacknowledged for the configured error handler; a durable DLQ must be configured before treating poison-message recovery as complete.

Email recipients must be present in the producer contract. No customer-email lookup or guessed recipient is performed. An order-created event is not treated as order-confirmed. The separate Identity `email.requested`/OTP consumer is outside this domain-event PR.

The SMTP worker is disabled by default (`MAIL_SENDER_ENABLED=false`). When enabled, it claims committed QUEUED rows with PostgreSQL `SKIP LOCKED`, releases the transaction, then sends. Connect failures retry with bounded backoff. Unknown SMTP outcomes and stale SENDING claims become FAILED with `SMTP_OUTCOME_UNKNOWN`: reconcile with the provider before any manual requeue, because SMTP cannot guarantee exactly-once delivery. Diagnostics never persist provider exception text or sender credentials. Missing templates fail instead of sending generic content.

Loyalty's internal mutations require an `INTERNAL_SERVICE` JWT identifying `cart-order-service`; order reconciliation requires one identifying `promotion-loyalty-service`. Both services generate 60-second JWTs from the existing JWT configuration and validate signature, issuer, audience, expiry and revocation. No separate service-token environment variable or custom authentication header is used. Customer voucher validation still carries the customer JWT. Existing ownership, reservation and compensation checks are not bypassed by this authentication mechanism.

Run backend tests/build with the repository Gradle wrapper. PostgreSQL integration tests additionally require `CLUCKY_TEST_DB_URL` and `CLUCKY_TEST_DB_PASSWORD` pointing at a **fresh disposable database** (user `postgres`); they migrate their owned schemas. They are skipped without these variables. SMTP is mocked, so these tests do not send mail. The integration checks exercise concurrent earn/redeem/release, durable enqueue deduplication, transaction-free SMTP, and safe retry/unknown-outcome handling.
