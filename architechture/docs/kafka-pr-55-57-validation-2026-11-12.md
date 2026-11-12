# Kafka PR #55 / #57 — validation 12/11/2026 (UTC+7)

## Round 2 — latest-main validation (12/11/2026)

This section supersedes round 1 below. Base: `d721fdeb68138e13a7b4db93795b83b5d6ddf304` (includes PRs #59 and #61). Validated code: PR55 `443e9de595ac80cb448bce28d9df0f195a43a785`, PR57 `f169fbb70d2128cbc040a4cab4e4e1ab245888b7`. Both merge cleanly into integration commit `c8e9db67ee92fa8adaebcc8cb096928767250c02`. Later commits only update this evidence.

### Docker verification

The initial latest-main deployment stopped at Payment with the constructor error described below. After the fix, `start-docker.ps1 -Services cart-order-service,payment-service,promotion-loyalty-service,shipping-service,notification-service,review-report-service,audit-service,customer,admin` completed successfully: all nine targeted containers healthy. Config Server, Gateway and Identity were already rebuilt in the preceding latest-main pass. Final inspection confirms all 12 affected containers healthy. Existing volumes/data were retained; no full-stack rebuild or volume removal was performed. Keep `pr/combined`, which is mounted by Config Server.

### Additional fixes

- Preserved the latest notification email-failure topic bean and configurable security/email topics while resolving the new main conflict.
- Updated `RefundRoleGuardsTest` to the five-field bank DTO: a valid bank BIN ensures missing/stale version assertions still exercise the intended guard.
- Docker exposed `VietQrService` startup failure (`NoSuchMethodException: <init>`): two constructors required explicit Spring injection selection. Added `@Autowired` to the production constructor and a real Spring context regression on both PRs; no upstream request or business behavior changes.
- Final DLT review found raw values incompatible with the existing quarantine replay tool and capable of retaining secrets. A new test reproduced the failure before the fix. All six PR55 recoverers now retain SHA-256, validated identity, metadata and numeric/boolean evidence only; malformed values have no replay event. Arbitrary payload strings/nested objects and raw exception text are not copied. Header allowlisting, bounded retries and broker-ACK-before-recovery remain. Interrupted sends restore the thread interrupt. The replay runbook now requires the original value and matching hash for publish rather than sending a partial DLT payload.
- `KafkaRetryDlqSafetyTest` has six passing cases, including raw-payload/exception privacy and malformed/duplicate JSON quarantine. A normalized source comparison confirms all six recovery policies match. `scripts/test_replay_kafka_dlt.py` passes (one check); this is not a live business replay.
- KAFKA-10 inventory now records the admin notification/email retry mutations introduced on the new base and their missing audit producer. The task is still PARTIAL: per-domain transactional/rebalance/readback evidence and a versioned action contract are not established by these unit tests.

### Final local results

| Check | Actual result |
|---|---|
| PR55 `./gradlew test build --continue --no-daemon --console=plain` | 376 tests: 356 passed, 19 skipped, 1 failed (unchanged shipping case); no compile errors |
| PR57 same command plus `:audit-service:auditSelfCheck` | 385 tests: 365 passed, 19 skipped, 1 failed (same shipping case); self-check passed |
| PR55 `./gradlew :cart-order-service:test :payment-service:test :review-report-service:test assemble --no-daemon` | PASS |
| PR57 `./gradlew :audit-service:test :cart-order-service:test :payment-service:test :review-report-service:test :audit-service:auditSelfCheck assemble --no-daemon` | PASS |
| React lint / unit / production build | PASS; 43 tests, 10 lint warnings and no lint errors |
| Next.js lint / unit / production build | PASS; 63 tests; production build includes TypeScript checks |
| `node scripts/generate-errors.mjs --check` | PASS |
| Playwright full suite | 78 passed / 10 failed, 88 total |
| Playwright `--last-failed --workers=1` | 1 passed / 9 failed; the 320px responsive case passed on retry |

Frontend tree on base and both PRs is exactly `0c3f435c2971acacbb9b827793b369d0b25eec0f`; frontend commands ran once in PR57 against that shared source. Existing `npm ci` installations were reused because lockfiles did not change. Local runtime remains Windows / Node 24.13.1 / npm 11.8.0, not GitHub's Node 22/Linux environment.

Remaining Playwright failures: cart-checkout, checkout-feedback, order timestamp i18n, four loyalty cases, order detail/payment widgets and profile refresh. The branch-distance case from round 1 now passes. Identical frontend source establishes that these PRs contain no frontend delta, not that all failure causes have been diagnosed. The shipping controller/test are also unchanged by these PRs. No failing assertion was removed or disabled. Full `build` remains red because it includes the shipping test even though `assemble` passes.

Logs are retained locally under `pr/`: `pr55-final-backend.log`, `pr57-final-backend.log`, `pr55-final-assemble.log`, `pr57-final-assemble.log`, `latest-*-run-lint.log`, `latest-*-test.log`, `latest-*-run-build.log`, `latest-playwright.log`, `latest-playwright-retry.log`, `dlt-repro.log` and `docker-final.log`. These ignored runtime logs are not committed. GitHub CI results must be checked for the pushed heads separately.

---

## Round 1 — historical evidence (superseded)

### Source and scope

- Base: `d1b3744a0992ab62bed1239e06d391aeffcd3552` (`origin/main`).
- Validated code: PR55 `db85238`, PR57 `0f1e1bc`; later commits only record this evidence.
- Both PRs merge together cleanly in the local integration worktree; main is not modified or pushed.
- Frontend tree is identical on base and both PRs: `ca7b9faa33edc485f0ae785ebe735ed83a789bac`. Frontend commands therefore ran once against that exact shared source, in PR57, rather than claiming two independent executions.

### Results

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

### Remaining baseline failures — not hidden or disabled

Local runtime: Windows, Node 24.13.1 / npm 11.8.0. GitHub frontend CI uses Node 22 on Linux; local results must not be presented as a completed GitHub CI run. Docker uses the existing Gradle 8.14 image; local Gradle wrapper is 9.7.1. The integration worktree `pr/combined` is retained because Config Server uses its native-config mount. Do not delete it while those local containers are using it.

`ShippingControllerTest.missingConfigurationOrCoordinatesNeverInventsAnEligibleDelivery` expects unavailable delivery when fee/location/config is missing; current main supplies fallback fee/radius/coordinates. Production controller and failing test are unchanged by either PR. Controller blob on all three refs: `dc97f86d3a1975404de0b90583ab24832b8c58c8`. Changing shipping business behavior is outside the Kafka/audit fix; full backend test/build is **not green**.

Playwright failures reproduced with one worker: branch-distance (default-address priority), cart-checkout, checkout-feedback, i18n order timestamps, four loyalty cases, order detail/payment widgets, and profile refresh. Several authenticated pages redirect to login; loyalty policy expectations and default address distance also differ. The identical frontend tree proves no frontend delta in these PRs; this is not a claim that every failure has been fully diagnosed. Do not weaken expectations to make CI green.

### Changes validated

- PR55: main conflicts resolved, valid Flyway YAML restored without auto-baselining existing schemas, optional Redis password, safe ID-only DLT header forwarding with format/length checks, no wholesale classification of `IllegalStateException` as poison, regression tests and replay documentation.
- PR57: injected audit mapper, invalid-source/envelope rejection, metadata-only poison quarantine after broker ACK, source retention on DB/DLT failure, one canonical review `detail.before/after` shape, corrected producer inventory and explicit integration-evidence gaps.
- Existing Mockito fixture/overload errors corrected without changing assertions to conceal business failures.

All checks above are actual local runs, not inferred from previous GitHub frontend badges. PostgreSQL/Kafka crash/rebalance and all-domain readback coverage are not proven by mocked tests. The overall validation remains **NOT ALL GREEN** until baseline failures and integration evidence are addressed.
