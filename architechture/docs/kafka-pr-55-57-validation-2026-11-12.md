# Kafka PR #55 / #57 — validation 12/11/2026 (UTC+7)

## Source and scope

- Base: `d1b3744a0992ab62bed1239e06d391aeffcd3552` (`origin/main`).
- Validated code: PR55 `db85238`, PR57 `0f1e1bc`; later commits only record this evidence.
- Both PRs merge together cleanly in the local integration worktree; main is not modified or pushed.
- Frontend tree is identical on base and both PRs: `ca7b9faa33edc485f0ae785ebe735ed83a789bac`. Frontend commands therefore ran once against that exact shared source, in PR57, rather than claiming two independent executions.

## Results

| Check | Result |
|---|---|
| PR55 `./gradlew test build --continue --no-daemon` | 344 tests: 325 passed, 18 skipped, 1 failed (inherited shipping case below) |
| PR57 `./gradlew test build :audit-service:auditSelfCheck --continue --no-daemon` | 355 tests: 336 passed, 18 skipped, 1 failed (same shipping case); audit self-check passed |
| PR55 `./gradlew :cart-order-service:test :review-report-service:test assemble --no-daemon` | PASS; includes new DLT header/transient-error regressions and aligned review contract |
| PR57 `./gradlew :audit-service:test :review-report-service:test :audit-service:auditSelfCheck assemble --no-daemon` | PASS; includes poison/DLT unavailable/DB retry tests |
| React `npm ci`, `npm run lint`, `npm test`, `npm run build` | PASS; 40 tests; lint reports 9 existing warnings, no errors |
| Next.js same install/lint/test/build commands | PASS; 60 tests; build includes TypeScript checks |
| `node scripts/generate-errors.mjs --check` | PASS |
| `npm run test:ui` | 74 passed / 11 failed, 85 total |
| `npm run test:ui -- --last-failed --workers=1` | 1 passed / 10 failed; EN pickup progress passed on retry |
| Docker combined source | PASS: `start-docker.ps1 -Services config-server,cart-order-service,payment-service,promotion-loyalty-service,shipping-service,notification-service,review-report-service,audit-service`; all eight rebuilt containers healthy; no volumes removed |

## Remaining baseline failures — not hidden or disabled

Local runtime: Windows, Node 24.13.1 / npm 11.8.0. GitHub frontend CI uses Node 22 on Linux; local results must not be presented as a completed GitHub CI run. Docker uses the existing Gradle 8.14 image; local Gradle wrapper is 9.7.1. The integration worktree `pr/combined` is retained because Config Server uses its native-config mount. Do not delete it while those local containers are using it.

`ShippingControllerTest.missingConfigurationOrCoordinatesNeverInventsAnEligibleDelivery` expects unavailable delivery when fee/location/config is missing; current main supplies fallback fee/radius/coordinates. Production controller and failing test are unchanged by either PR. Controller blob on all three refs: `dc97f86d3a1975404de0b90583ab24832b8c58c8`. Changing shipping business behavior is outside the Kafka/audit fix; full backend test/build is **not green**.

Playwright failures reproduced with one worker: branch-distance (default-address priority), cart-checkout, checkout-feedback, i18n order timestamps, four loyalty cases, order detail/payment widgets, and profile refresh. Several authenticated pages redirect to login; loyalty policy expectations and default address distance also differ. The identical frontend tree proves no frontend delta in these PRs; this is not a claim that every failure has been fully diagnosed. Do not weaken expectations to make CI green.

## Changes validated

- PR55: main conflicts resolved, valid Flyway YAML restored without auto-baselining existing schemas, optional Redis password, safe ID-only DLT header forwarding with format/length checks, no wholesale classification of `IllegalStateException` as poison, regression tests and replay documentation.
- PR57: injected audit mapper, invalid-source/envelope rejection, metadata-only poison quarantine after broker ACK, source retention on DB/DLT failure, one canonical review `detail.before/after` shape, corrected producer inventory and explicit integration-evidence gaps.
- Existing Mockito fixture/overload errors corrected without changing assertions to conceal business failures.

All checks above are actual local runs, not inferred from previous GitHub frontend badges. PostgreSQL/Kafka crash/rebalance and all-domain readback coverage are not proven by mocked tests. The overall validation remains **NOT ALL GREEN** until baseline failures and integration evidence are addressed.
