# Clucky Agent Instructions

## Scope
Clucky is a Vietnamese fast-food ordering platform. Keep the two frontends and every backend service independently runnable. Follow `docs/` as the source of product, API, database, RBAC, architecture, and brand requirements.

## Repository layout
- `frontend/nextjs`: Customer-facing Next.js application.
- `frontend/react`: Staff, Store Manager, and Admin React application.
- `backend/*`: Config Server, Eureka Discovery Server, Gateway, and eight bounded-context services.
- `config-repo`: configuration consumed by Spring Cloud Config Server.
- `infrastructure`: local Docker Compose and supporting infrastructure.
- `docs`: requirements and architecture evidence; do not invent undocumented actors, integrations, or business rules.

## Architecture rules
- Startup order is infrastructure -> Config Server -> Eureka -> business services -> Gateway -> frontends.
- Services discover each other through Eureka and receive runtime configuration through Config Server. Do not duplicate service configuration in local `application.yml` unless it is bootstrap-only.
- Each service owns its database/schema. Never add cross-service SQL joins or foreign keys; use IDs, REST, or Kafka events.
- Gateway is the frontend entry point. Frontends call the Gateway, never a business service directly.
- Keep MVP and Phase 2 behavior explicit. Shipping assignment/tracking is Phase 2; MVP creates the shipment record only.
- Enforce ownership and `storeId` on the backend, not only in frontend route guards.
- Never commit secrets. `.env.example` files contain placeholders only. Gmail Mail Sender uses an App Password from environment/Config Server; never use a customer Gmail credential, log it, or store it in PostgreSQL.

## Code rules
- Prefer the smallest working change. Do not add abstractions with one implementation.
- Validate input at API boundaries and return the documented error shape.
- Use DTOs at HTTP boundaries; do not expose JPA entities directly.
- Use Flyway migrations per service. Do not edit an already-applied migration; add a new one.
- Keep Kafka consumers idempotent and include correlation/event identifiers according to the event contract.
- Use the Clucky palette and Fredoka/Quicksand typography from `docs/Brand_Guidelines.md`.
- Preserve `logo_primary.png` and `favicon.png` in both frontend public/static assets; update both applications when branding paths change.

## Verification
- Người dùng tự kiểm thử. Không tự chạy test, lint, typecheck, build hoặc kiểm thử qua trình duyệt; chỉ chạy khi người dùng yêu cầu rõ.
- Với công việc UI, không tự bật Docker, backend hoặc chạy các kiểm tra hạ tầng.
- Khi bàn giao, nêu rõ những phần đã sửa và việc chưa chạy kiểm thử theo yêu cầu; không tuyên bố đã test nếu chưa thực hiện.
