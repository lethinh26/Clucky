# Promotion / Loyalty API contract

This document describes implemented behavior after integrating BE-35 / BE-51 with BE-37 / INT-44. It does not declare unfinished checkout/saga endpoints operational.

## Trust and ownership

- Frontends call Gateway. Each backend still validates JWTs and derives actor/store from `CurrentActor`; `X-User-*` / `X-Store-Id` are not authorization credentials.
- Voucher management is ADMIN / STORE_MANAGER only. Managers see/manage their own STORE vouchers. Creation and edits by a Manager require approval; edits clear the prior approval and return to PENDING_APPROVAL. Only ADMIN approves.
- Loyalty mutations require `INTERNAL_SERVICE` JWTs with configured issuer/audience and revocation checks. Customers cannot grant, redeem or release balances through these internal routes.
- Loyalty preview uses the authenticated customer. A supplied `customerId` cannot select another user's balance. Anonymous preview has zero available points.
- Order must compute trusted amounts from catalog snapshots, not browser prices.

## Voucher endpoints

| Method / path | Access | Behavior |
|---|---|---|
| POST `/api/promotions/vouchers/validate` | Public / internal | Read-only validation; no quota reservation or consumption |
| GET `/api/promotions/vouchers/available` | Public | Active, in-date vouchers; optional positive `storeId` |
| GET `/api/promotions/vouchers` | ADMIN / STORE_MANAGER | Filtered management list; Manager store scope is enforced from JWT |
| GET `/api/promotions/vouchers/{id}` | ADMIN / STORE_MANAGER | Manager cannot read another store's voucher |
| POST `/api/promotions/vouchers` | ADMIN / STORE_MANAGER | Manager creation is a pending STORE proposal |
| POST `/api/promotions/vouchers/store-proposals` | ADMIN / STORE_MANAGER | STORE + PENDING_APPROVAL; Manager cannot submit another store ID |
| PUT `/api/promotions/vouchers/{id}/approve` | ADMIN | Locked transition PENDING_APPROVAL -> ACTIVE; repeated approval is idempotent; expired pending proposals fail |
| PUT `/api/promotions/vouchers/{id}` | ADMIN / STORE_MANAGER | Locked update; Manager edits require reapproval |
| DELETE `/api/promotions/vouchers/{id}` | ADMIN / STORE_MANAGER | Own-store restriction; used vouchers are disabled instead of physically removed |

Validate request: `code` (required, max 80), `orderAmount` (required, nonnegative integer VND, max 12 digits), optional positive `storeId`. `subtotal` is accepted as an alias for `orderAmount` for older callers. `customerId` does not grant authority.

Validate response: `valid`, normalized `code`, nonnegative `discountAmount`, optional `errorCode`, `reason`, and `voucher`. Business rejection returns `valid=false` and zero discount. Invalid HTTP input/authentication uses the shared ApiError shape. UI resolves `errorCode` through the shared error catalog, not raw `reason`.

Percentage discount uses `orderAmount * value / 100`, HALF_UP to integer VND, then `maxDiscount` when positive. Fixed discount uses `value`. Both are capped at orderAmount; shipping is not included.

## Loyalty endpoints and DTOs

| Method / path | Access | Behavior |
|---|---|---|
| GET `/api/loyalty/me` | CUSTOMER | `{ points: MemberPointsResponse, transactions: PointTransactionResponse[] }`, latest 20 transactions |
| GET `/api/loyalty/history` | CUSTOMER | Paged history, `page` default 0, `size` default 20 and capped at 100 |
| POST `/api/loyalty/preview` | Public / authenticated customer | Read-only calculation; never changes balance |
| POST `/api/loyalty/earn` | INTERNAL_SERVICE | Atomic positive/zero ledger entry and balance update |
| POST `/api/loyalty/redeem` | INTERNAL_SERVICE | Atomic debit; insufficient balance is rejected |
| POST `/api/loyalty/release` | INTERNAL_SERVICE | Compensation only for a prior redemption on that order; no prior/remaining redemption returns 204 |
| GET/PUT `/api/loyalty/config` | ADMIN | Single effective configuration; positive rates |

- `LoyaltyPreviewRequest`: required `pointsToRedeem >= 0`, required integer `orderAmount >= 0` (max 12 digits), optional `customerId` restricted to the authenticated actor.
- `LoyaltyPreviewResponse`: `availablePoints`, `pointsUsed`, `pointsAmount`, `pointsToEarn`, `tier`.
- `EarnPointsRequest`: positive `customerId`; positive `orderId` when present; optional nonnegative `orderAmount` and/or nonnegative `points`; optional `operationKey` (max 64) and `reason` (max 255). Without an order, an explicit operation key is required. A positive explicit points value takes precedence; otherwise the configured amount calculation applies.
- `RedeemPointsRequest`: positive `customerId`, `orderId`, `points`; optional `operationKey` (max 64), `reason` (max 255). `orderAmount` is not a required field on this command.
- `LoyaltyReleaseRequest`: positive `customerId`, `orderId`, `points`; optional `operationKey` (max 64), `reason` (max 255).
- Mutation response: `id`, `customerId`, `orderId`, `change`, `balanceAfter`, `type`, `createdAt`, `reason`. Earn is EARN, debit REDEEM, compensation ADJUST.

Preview clamps requested points to the available balance and to `floor(orderAmount / redeemRate)`. It reports the actual `pointsUsed` and does not mutate state. Redeem itself rejects insufficient balance with `INSUFFICIENT_POINTS`.

Earn calculation is `floor(orderAmount * earnRate)`. Redemption value is `floor(pointsUsed * redeemRate)`. Rates come from the active database configuration (seed values: earnRate 0.0100, redeemRate 1000.0000); these are implementation/seed values, not a new product-policy approval. Supported persisted tiers are MEMBER / SILVER / GOLD; no PLATINUM, tier multipliers or automatic tier thresholds are implemented.

## Idempotency and lifecycle limits

For an order, the service derives `{EARN|REDEEM|RELEASE}:cus:{customerId}:order:{orderId}`; a changed client operation key cannot duplicate the order operation. For non-order earn operations, the explicit key is namespaced by operation and customer. Balance locking, replay lookup, ledger writes and compensation totals are in one transaction. Zero-point earnings also record completion, so a replay after a rate change cannot award points again.

`order.completed` consumes only matching source/status/order identities, skips guests without awarding points, and retries unacknowledged failures. Durable DLQ setup is a separate operational dependency.

`VoucherReleaseRequest` is a DTO only: no voucher release/consume endpoint is implemented by this PR. Checkout point redemption remains fail-closed until INT-47 wires actual debit/reservation and compensation. Preview is not proof of a debit, voucher reservation, or completed saga.

## Error contract and verification

Error codes, HTTP statuses and localized messages are owned by `contracts/errors.json`. Boundary validation maps to the documented error shape; do not add a second message catalog here. Relevant errors include UNAUTHENTICATED, FORBIDDEN, RESOURCE_NOT_FOUND, RESOURCE_CONFLICT, VOUCHER_INACTIVE, VOUCHER_EXPIRED, MIN_ORDER_NOT_MET and INSUFFICIENT_POINTS.

Regression coverage includes voucher role/store boundaries, pending/approved transitions, aliases, balance replay and concurrent PostgreSQL operations. The optional PostgreSQL checks require a fresh disposable database via `CLUCKY_TEST_DB_URL` and `CLUCKY_TEST_DB_PASSWORD`; see `backend/notification-service/README.md` for delivery and saga limits. Frontend Playwright tests use fixture APIs and do not establish live Kafka/SMTP integration.
