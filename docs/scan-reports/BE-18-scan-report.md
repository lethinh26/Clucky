# BE-18 – Báo cáo dò quét (trước triển khai)

**Ngày/commit quét:** 2026-11-10 · `16558fe`  
**Người quét:** Antigravity  
**Chế độ:** Giai đoạn 1 chỉ-đọc. Không chạy build/test/lint, không kết nối DB, không chạy migration.  
**Phạm vi tài liệu:** repository thực tế dùng `architechture/docs/` cho đặc tả; đường dẫn yêu cầu `docs/scan-reports/` chưa tồn tại nên báo cáo này được tạo đúng vị trí yêu cầu.

## 1. Tóm tắt điều hành (≤10 dòng)

- Source hiện có phần lớn BE-18: endpoint, DTO allowlist, owner-scoped repository, UI gọi Gateway và migration unique partial index đều đã tồn tại.
- BE-01 (entity/repository) và BE-09/INT-53 (JWT actor + Gateway strip/inject) có bằng chứng code; runtime vẫn chưa được xác minh trong lần quét này.
- `GET/PUT /api/users/me` và CRUD `/api/users/me/addresses` đúng route đặc tả; `PUT` hiện là **full replacement**, không phải partial update.
- Cơ chế default đang chọn: địa chỉ đầu tiên tự default; xóa default để lại 0 default. Đây là các quyết định chưa có PM/owner chốt theo task.
- V5 unique index không có bước backfill dữ liệu default trùng; migration có nguy cơ fail trên database lịch sử có vi phạm invariant.
- Có test service owner allow/deny/default nhưng race test là mô phỏng in-memory, không phải concurrent PostgreSQL transaction.
- Có 3 blocker/rủi ro cao cần PM/owner và môi trường giải quyết; 6 câu hỏi cần chốt.
- **Khuyến nghị: GO có điều kiện** — chỉ sửa các gap độc lập sau khi nhận `GO`; AC liên quan policy default/phone/email vẫn BLOCKED đến khi được chốt.

## 2. Ngữ cảnh đã hiểu

- **Stack:** Java/Spring Boot, Spring Security Resource Server/JWT, Spring Data JPA, Flyway; PostgreSQL (SQL dùng `BIGSERIAL`, `TIMESTAMPTZ`, partial unique index); Spring Cloud Gateway/Eureka/Config Server. Customer frontend là Next.js.
- **Architecture:** frontend chỉ gọi Gateway; Gateway route `/api/users/**` tới `IDENTITY-SERVICE`; mỗi service sở hữu schema riêng; address thuộc schema `identity_service` và không có cross-service FK.
- **Convention bắt buộc từ `AGENTS.md`:** DTO ở HTTP boundary, không expose JPA entity; validate tại boundary và trả error shape chung; không sửa migration đã áp dụng, phải thêm Flyway migration; backend phải enforce ownership/storeId; thay đổi tối thiểu; không thêm dependency/abstraction không cần thiết.
- **Verification:** `AGENTS.md` cấm tự chạy test/lint/build/browser trừ khi user yêu cầu rõ. Prompt Giai đoạn 1 cũng cấm build/rebuild/migration, nên báo cáo không coi file/test có sẵn là runtime PASS.
- Không tìm thấy `AGENTS.md` lồng trong repository. Git working tree sạch tại thời điểm quét.

## 3. Trạng thái dependency

| Dependency | Cần gì | Thực tế trong code | Kết luận |
|---|---|---|---|
| BE-01 | User/Address entity + repository, Identity schema, ID/owner mapping | `Address` dùng `Long`/`BIGSERIAL`, owner `user_id`; repository có `findByIdAndUserId`, list scoped, clear default; schema V2 có tables users/addresses. Xem `backend/identity-service/.../entity/Address.java:5-35`, `repository/AddressRepository.java:11-20`, `db/migration/V2__domain_schema.sql:1-22`. | **OK về source; runtime DB chưa xác minh** |
| BE-09 | JWT đã verify, current actor, role authorization và owner/server scope | `CurrentActor.require()` đọc subject/role/storeId từ `JwtAuthenticationToken`; Security yêu cầu JWT và method security; controller dùng `@PreAuthorize`; Gateway strip client headers và inject claim verified. Xem `config/CurrentActor.java:8-18`, `config/SecurityConfig.java:31-90`, Gateway `IdentityHeaderPropagationFilter.java:36-71`. | **OK về source; runtime route/JWT/revocation chưa xác minh** |

## 4. Gap analysis theo AC

| AC | Trạng thái | Bằng chứng (file:dòng) | Việc còn thiếu | Bị chặn bởi |
|---|---|---|---|---|
| 01 | **CÓ NHƯNG THIẾU** | `UserController.java:36-46`; `UserProfileService.java:41-57`; `UpdateProfileRequest.java:10-13`; service test `:58-87` | Có readback response và allowlist fullName/phone; cần chốt profile contract/Q01 và runtime/API evidence. | Q01; chưa chạy runtime |
| 02 | **ĐÃ ĐỦ về source** | Request DTO không có role/storeId/emailVerified/owner (`UpdateProfileRequest.java:7-13`, `AddressRequest.java:7-19`); actor server-side (`UserProfileService.java:111-129`) | Cần test HTTP mass-assignment/unknown-property policy và Gateway runtime proof. | Chưa chạy runtime |
| 03 | **CÓ NHƯNG THIẾU** | CRUD mapping `UserController.java:48-72`; list/create/update/delete service `UserProfileService.java:61-107`; FE API calls `account/page.tsx:51-105` | Need endpoint integration/readback including hard-delete; no full controller/Gateway test evidence. | Chưa chạy runtime |
| 04 | **CÓ NHƯNG THIẾU** | `findByIdAndUserId` at `AddressRepository.java:12`; scoped update/delete `UserProfileService.java:84-105`; tests `UserProfileServiceTest.java:91-120` | No individual GET address endpoint exists (spec route table is ambiguous); no HTTP-level no-leak evidence across all mutations. | Contract Q03; chưa chạy runtime |
| 05 | **CÓ NHƯNG THIẾU** | Bean validation `AddressRequest.java:11-19`, profile `UpdateProfileRequest.java:10-13`; handler maps invalid to 400 `GlobalExceptionHandler.java:35-40` | Error is generic `VALIDATION_ERROR`, not field-specific; profile phone has no format policy; tests do not exercise HTTP validation/long fields/type ID. | Q01/Q04; chưa chạy tests |
| 06 | **CÓ NHƯNG SAI/THIẾU** | clear-then-set service `UserProfileService.java:67-97`; partial unique index V5 `V5__address_default_unique_index.sql:1-5`; simulated test `UserProfileServiceTest.java:165-182` | Transaction plus index provides invariant only after migration succeeds, but concurrent PostgreSQL outcome/retry behavior has not been tested; test does not launch concurrent service/DB operations. | Runtime PostgreSQL; Q05 |
| 07 | **BLOCKED** | Delete leaves zero defaults `UserProfileService.java:100-107`; test `UserProfileServiceTest.java:208-219` | Existing behavior is an unapproved product policy. Must not call accepted until Q02. | Q02 |
| 08 | **CÓ NHƯNG THIẾU** | All default queries scoped by `userId` (`AddressRepository.java:14,16,19-20`) | No concurrent two-user integration test. | Chưa chạy tests/DB |
| 09 | **CÓ NHƯNG THIẾU** | UI only sets notice after await success and retains edits on catch: `account/page.tsx:77-105,147-170`; service maps DB violation conflict `UserProfileService.java:47-51,75-80` | No timeout/dependency test; profile `load()` error handling may make page `ready=true` but cannot prove reload truth without runtime. | Chưa chạy runtime |
| 10 | **CÓ NHƯNG THIẾU** | JWT security config `SecurityConfig.java:35-45,73-90`; frontend refresh behavior was not in BE-18 source audit detail | No E2E token expiry/revoke/account-switch test; initial parallel fetch could expose stale UI transiently until requests settle. | Runtime auth environment |
| 11 | **CÓ NHƯNG THIẾU** | React/Next JSX renders fields normally; `account/page.tsx:185-186`; i18n uses `useTranslations` `:2,34` | No security/browser test for stored markup, locale switch while failed form retained. | Chưa chạy browser |
| 12 | **CÓ NHƯNG THIẾU** | Server list returns repository list (empty valid) `UserProfileService.java:61-64`; missing edit/delete gives `RESOURCE_NOT_FOUND` `:86-87,103-104`; client starts `addresses=[]` `account/page.tsx:39` | Need inspect/render runtime for explicit empty state and just-deleted edit behavior; no separate GET-by-id API. | Contract Q03; chưa chạy browser |
| 13 | **CÓ NHƯNG THIẾU** | Shape has six required fields `dto/ApiError.java:7-15`; handler catches validation/auth/business `GlobalExceptionHandler.java:29-74`; catalog policy `contracts/README.md:18-33` | Gateway error parity and actual response shape unverified; validation detail not specific as AC asks. | Chưa chạy runtime; Q04 |
| 14 | **CÓ NHƯNG THIẾU** | Gateway strips/reinjects headers `IdentityHeaderPropagationFilter.java:36-71`; `CurrentActor` ignores headers `CurrentActor.java:9-17`; `/internal/**` denyAll `SecurityConfig.java:85` | Direct-to-service network exposure and Gateway route behavior need runtime/infrastructure verification. | Runtime deployment topology |
| 15 | **CÓ NHƯNG THIẾU** | FE reads server on load and reloads after mutation `account/page.tsx:51-68,96-100,112-116`; no profile/address localStorage key in this page | Mobile/focus/vi-en/loading/empty/error and reload after failures not verified; account page still contains unrelated password demo UI (`:46-50,191,340+`). | Chưa chạy browser; password scope ambiguity Q06 |

## 5. Code hiện có đáng chú ý

| File / class | Hiện trạng và khả năng tái sử dụng |
|---|---|
| `backend/identity-service/.../controller/UserController.java` | API thật, không còn template: profile (`GET/PUT`) và address CRUD. Mapping/role annotation tái sử dụng được. |
| `.../service/UserProfileService.java` | Implements allowlist, server-derived actor, scoped reads/writes, default clear/set, hard-delete. Cần review against PM policies, không viết lại. |
| `.../dto/UpdateProfileRequest.java`, `AddressRequest.java`, `UserResponse.java`, `AddressResponse.java` | DTO boundaries exist. `AddressResponse` exposes `userId`; not an ownership bypass but product/API owner should decide whether a self-service client needs this field. |
| `.../repository/AddressRepository.java` | Owner-scoped operations exist; list order is stable `isDefault DESC, id ASC`; clear default bulk update exists. |
| `.../db/migration/V2__domain_schema.sql` | Applied domain schema: PostgreSQL, address hard-delete (no deleted column), `BIGSERIAL` IDs and stated length limits. Do not modify. |
| `.../db/migration/V5__address_default_unique_index.sql` | Existing PostgreSQL partial unique index enforces at most one default. Reusable only if confirmed applied; lacks deterministic repair for existing violations. |
| `backend/api-gateway/.../IdentityHeaderPropagationFilter.java` and `config-repo/api-gateway.yml` | Gateway routes `/api/users/**` and provides zero-trust identity header propagation. |
| `frontend/nextjs/app/account/page.tsx` | Calls `profileApi` and reloads after success; retains form on catches. Does not use localStorage mock for profile/address. |
| `.../UserProfileServiceTest.java` | Has in-memory fixtures A/B, service allow/deny/default tests. Useful baseline but cannot prove database constraints/concurrency/Gateway/HTTP validation. |

## 6. Khó khăn & rủi ro kỹ thuật

| ID | Mô tả | Mức | AC ảnh hưởng | Giảm thiểu đề xuất |
|---|---|---|---|---|
| R01 | V5 `CREATE UNIQUE INDEX` sẽ fail nếu historical addresses có hơn một `is_default=true` cho cùng user; migration không backfill. | **CAO** | 06, 07, 08 | Trước index mới/repair migration, query audit duplicates in non-production copy; decide deterministic survivor (e.g. lowest ID) with PM; backfill then add index in same reviewed migration. Không chạy DB thật trong task này. |
| R02 | Race unit test is an in-memory sequential simulation, not a concurrent PostgreSQL proof; `clear` then `save` across transactions can yield conflict depending on interleaving. | **CAO** | 06, 08 | Add PostgreSQL-backed integration/concurrency test after GO; define expected conflict/retry response and transactional strategy. |
| R03 | Product policies for first/default deletion and phone/email verification remain unapproved but current code embeds choices. | **BLOCKER** | 01, 05, 07 | PM/Identity owner must answer Q01/Q02/Q04 before altering or accepting affected behavior. |
| R04 | Runtime behavior cannot be established from source: Config Server/Gateway/Eureka route, JWT revocation, Cookie/refresh, DB migration, and client failure state. | **CAO** | 09, 10, 13, 14, 15 | Execute controlled integration test plan only after authorization/environment availability. |
| R05 | Address `PUT` is full DTO replacement but API docs do not specify method semantics; concurrent edit can overwrite fields. | **TB** | 03, 05, 09 | Owner confirm PUT-full vs PATCH; retain exact contract and add validation/readback tests. |
| R06 | Account page embeds a password tab marked demo, which may confuse BE-18 demo and violates "server source of truth" if presented as functional password change. | **TB** | 15 | Keep out of BE-18 scope or hide/label it pending its owning task; product/UI owner confirms. |

## 7. Mâu thuẫn phát hiện

| ID | Đặc tả nói | Code/AGENTS.md nói | Đề xuất |
|---|---|---|---|
| C01 | `BE-18.md:29-34` snapshot (03/11) says templates and account localStorage/demo; current task prompt repeats templates as start points. | Current tree has `UserController`, `UserProfileService`, real API client and V5 migration; no `UserControllerTemplate.java`. | Treat task doc as historical snapshot, current repository source as implementation baseline; do not recreate templates. |
| C02 | BE-18 says phone format requires approved policy, and Q01 says phone/email verification is open. | `AddressRequest` imposes regex; profile accepts any nonblank ≤30; UI imposes a different client pattern. | PM/Identity owner must define canonical phone rules and verification effects; then unify API/UI. |
| C03 | Q02 explicitly prohibits inventing default-deletion policy. | Current service sets first address default and leaves zero defaults on delete (`UserProfileService.java:71-74,106`). | Keep status BLOCKED pending owner decision; if accepted, document it explicitly. |
| C04 | User requested report under `docs/scan-reports`. `AGENTS.md` calls `docs` source of truth. | Repository documentation currently resides in misspelled `architechture/docs`; root `docs` was absent. | Created required `docs/scan-reports` only for this report; no existing product documents were moved or altered. |

## 8. Câu hỏi cho PM / Owner cần xác minh

| ID | Câu hỏi | Vì sao cần (bằng chứng trong code) | Các phương án | Đề xuất mặc định* | AC bị chặn nếu chưa trả lời | Ai nên trả lời |
|---|---|---|---|---|---|---|
| Q01 | Customer có được đổi email/phone không? Nếu có, đổi email/phone có bắt buộc OTP/re-verification, và email nào được dùng đăng nhập trong giai đoạn pending? | Current `PUT /me` only changes `fullName/phone`; email excluded (`UpdateProfileRequest.java:7-13`). | Keep email immutable; phone no verification; phone OTP; email change verification workflow. | Giữ email immutable; cho phone update không đổi `emailVerified` cho đến khi product chốt. | 01, 02, 05 | Identity/Product owner |
| Q02 | Khi xóa địa chỉ default (bao gồm địa chỉ cuối), policy chính thức là gì? | Current behavior leaves zero default (`UserProfileService.java:100-107`), but BE-18 forbids self-invented policy. | Leave zero default; forbid deletion until replacement chosen; promote deterministic address. | Leave zero default, require checkout user selection later. | 07 | Product owner |
| Q03 | Contract có cần `GET /api/users/me/addresses/{id}` không, và `PUT` là full replace hay partial update? | No detail endpoint exists; current `PUT` requires all address fields. API doc only shows collapsed CRUD route (`Đặc tả API.md:39-40`). | List + PUT-full (current); add GET/{id}; PATCH partial. | Retain list + PUT-full unless UI/integration has a real need for detail endpoint. | 03, 04, 05, 12 | PM/API owner |
| Q04 | Canonical phone rule cho **profile** và **address** là gì? Có normalize E.164/VN number, trim-only, hoặc allow regex hiện tại? | Profile has only `@Size`; address regex `[0-9+()\-\s]{6,30}`; frontend text suggests a different 9-15 rule. | Minimal length/charset; E.164; Vietnamese 10-digit; product-defined national/international. | Use a single documented backend policy; do not derive it from UI. | 05, 11, 15 | Product/Identity owner |
| Q05 | Khi hai request cùng đặt default conflict tại DB, response/outcome mong muốn là retry server-side, `409 RESOURCE_CONFLICT`, hay last-write-wins with locking? | Current catches `DataIntegrityViolationException` as conflict, no retry (`UserProfileService.java:75-80,93-97`). | 409/reload; transactional retry; per-user lock/serialized last-write-wins. | 409 + client reload/retry only after policy/UX confirmation. | 06, 08, 09 | PM/Identity owner |
| Q06 | BE-18 frontend handoff có bao gồm tab Change Password đang có trên `/account` không? | Account page renders password tab but BE-18 scope says password change out of scope. | Hide/defer; keep explicitly disabled/demo; implement under separate task. | Exclude/hide from BE-18 demo until owned endpoint exists. | 15 | PM/UI owner |

\* Đề xuất mặc định chỉ là gợi ý; chưa có xác nhận PM/owner thì không phải quyết định và AC liên quan vẫn BLOCKED.

## 9. Rủi ro dữ liệu & migration

- **DBMS:** PostgreSQL. Evidence: `BIGSERIAL`, `TIMESTAMPTZ` in `V2__domain_schema.sql`; partial unique predicate in `V5__address_default_unique_index.sql` is PostgreSQL syntax.
- Address uses hard delete: table/entity have no `deleted_at`/`deleted` field; service calls `addresses.delete(address)`.
- Schema has `addresses.user_id` internal FK to `identity_service.users`, not cross-service. Address ID is `BIGSERIAL`/`Long`; columns have max lengths receiver 160, phone 30, province/district/ward 100, detail 255.
- Seed V3 inserts one default only for user 4 (`V3__seed_sample_identity_data.sql:12-14`), so repository seed does not itself demonstrate duplicates. Live/shared historical data was not queried and cannot be assumed clean.
- **Existing V5 concern:** `CREATE UNIQUE INDEX IF NOT EXISTS` does not repair duplicates. If V5 is not yet applied and duplicates exist, Flyway fails and blocks deployment. If V5 is applied, data constraint is present but runtime state is unknown.
- **Post-GO migration plan only if needed:** do not edit V2/V5. First PM approves survivor policy; then create the next Flyway migration (e.g. `V6__repair_duplicate_default_addresses.sql`) that deterministically clears default on non-surviving rows, verifies zero duplicate groups, and only then adds/recreates the unique index if missing. Rollback is operationally forward-only: restore from pre-migration backup or a separately reviewed correction migration; do not drop data/index opportunistically.

## 10. Kế hoạch triển khai đề xuất

> Không triển khai trong Giai đoạn 1. Danh sách sau là kế hoạch sau `GO` và chỉ cho phần chưa đủ.

1. **Chốt Q01–Q06** and write decisions/source into this report. Mark all unanswered ACs BLOCKED.
2. **Inspect migration history in approved non-production environment** before any schema change; only add a new repair migration if duplicate-default audit demands it and Q02/Q05 determine behavior. Never edit V2/V5.
3. **Backend minimal changes:** retain controller/service/repository/DTO implementations that already meet contract; adjust only policy/validation/error behavior confirmed by PM (phone canonical validation, unknown JSON behavior, conflict handling).
4. **Tests:** extend current `UserProfileServiceTest`; add HTTP/controller tests and PostgreSQL-backed migration/race test if project has an approved test-container/integration convention. Do not claim in-memory proxy as DB concurrency proof.
5. **Frontend:** retain `profileApi` and server reload pattern; fix only contract-confirmed behavior (field-level errors/empty state/phone input) and preserve failed form. Keep frontend using Gateway.
6. **Likely affected files after GO (only if required):** `UserProfileService.java`, `AddressRepository.java`, request DTO(s), `GlobalExceptionHandler.java` or error catalog/generated files, `account/page.tsx`, vi/en locale files, `UserProfileServiceTest.java`, new test(s), and possibly `V6__...sql`. Existing `UserController.java`, V5 and Gateway filter should remain unchanged unless verified gap demands it.

## 11. Kế hoạch test & fixture

| AC | Loại test đề xuất | Fixture / evidence |
|---|---|---|
| 01–02 | Service + MVC/controller request-deserialization test | User A with known immutable role/store/status/email; send only allowlist plus crafted unknown/server fields; read back DB/DTO. |
| 03–04 | Service + controller integration | Customer A addresses A1/A2; Customer B B1; owner allow update/delete/read list, B ID mutation returns scoped `RESOURCE_NOT_FOUND`; assert B1 unchanged. |
| 05 | MVC validation + service atomicity | blank, whitespace, 161/31/101/256 chars, malformed ID, phone variants defined by Q04; assert API error shape and no persisted partial mutation. |
| 06, 08 | PostgreSQL-backed concurrent integration | Barrier/latch starts two transactions setting A1/A2; repeat for different users A/B; query committed rows and assert max one per user plus policy-defined outcome. In-memory proxy is insufficient. |
| 07 | Service/controller integration after Q02 | Default and sole address fixtures; delete; reload list and assert exact approved policy. |
| 09 | Repository exception/timeout simulation + frontend component/e2e if authorized | Force `DataIntegrityViolationException`/network rejection; assert no success notice, form remains and subsequent GET reflects actual state. |
| 10 | JWT integration/E2E | expired/revoked A token, then B token; assert no A address survives state transition. Needs real auth/Redis/Gateway. |
| 11, 15 | Browser/i18n test if authorized | Store markup as receiver/detail; vi/en switch while form error visible; assert escaped text, keyboard/focus, mobile. |
| 12–14 | Gateway + service integration | Empty A list; deleted-before-edit; missing ID; forged X-User headers through Gateway vs direct internal path denied; assert common error contract. |
| 13 | Contract test at Gateway/service | validation, 401, 403, 404, 409, dependency 5xx all contain `timestamp/status/error/code/message/path`, no raw exception. |

**Fixture constraint:** Existing `UserProfileServiceTest` uses JDK `Proxy` repositories and maps, not JPA/PostgreSQL, so it is suitable only for service decision tests. It cannot validate Flyway DDL, row locking, unique index enforcement, Spring validation, Security filter/Gateway, or real transaction isolation.

## 12. Chưa kiểm chứng được

- Whether V5 has applied successfully to the actual target DB and whether any historical user has duplicate defaults.
- Config Server-delivered route, Eureka discovery, Gateway forwarding, CORS and direct-service network exposure.
- JWT signature/issuer/audience, expiry/revocation lifecycle, role authorization and actor propagation at runtime.
- Real HTTP status/body for validation/mass-assignment and full `ApiError` shape through Gateway.
- PostgreSQL concurrency behavior and exact default conflict outcome.
- Next.js browser behavior: empty/loading/error states, responsive/mobile layout, keyboard/focus, screen-reader state, XSS rendering, locale switching and data persistence after network failure.
- No test/build/lint/typecheck/browser verification was performed in this Giai đoạn 1, per user instruction and `AGENTS.md`.

