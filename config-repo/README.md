# Clucky `config-repo`

Central runtime configuration consumed by the **Spring Cloud Config Server**
(`backend/config-server`). The Config Server runs with the **`native` profile** and
reads `.yml` files from this directory (see `search-locations` in
`backend/config-server/src/main/resources/application.yml`).

This is a **plain directory**, not a Git repository. Keep it inside the Clucky
monorepo so each environment's config ships alongside the code it configures.

## Layout

```
config-repo/
  application.yml                    # shared defaults for every service
  application-dev.yml                # overrides for the `dev` profile
  application-prod.yml               # overrides for the `prod` profile
  <service-name>.yml                 # per-service config (api-gateway, identity-service, ...)
```

- `application.yml` — infra wiring shared by all services (Eureka `defaultZone`,
  Postgres, Redis, Kafka) with `${VAR:default}` placeholders. **No secrets.**
- `<service-name>.yml` — loaded when a service whose `spring.application.name`
  matches requests its config.
- `application-{profile}.yml` — environment-specific overrides activated by the
  `spring.profiles.active` a client requests from the Config Server.

## How services read config

Each business service bootstraps with:

```yaml
spring:
  application:
    name: <service-name>
  config:
    import: optional:configserver:${CONFIG_SERVER_URL:http://localhost:8888}
```

At startup the service asks `http://<config-server>:8888/<service-name>/<profile>`
and merges `application.yml` + `application-<profile>.yml` + `<service-name>.yml`
(+ `<service-name>-<profile>.yml`).

## Required environment variables

The Config Server and each service resolve secrets/hosts from the environment at
runtime. Provide them via `.env` (see `backend/.env.example`) or your orchestrator.
If a required variable is missing, Spring fails fast at startup with a clear
"could not resolve placeholder" error — check these keys first:

| Variable | Used by | Required |
|---|---|---|
| `CONFIG_SERVER_URL` | every service | yes (default `http://localhost:8888`) |
| `CONFIG_SERVER_NATIVE_SEARCH_LOCATIONS` | config-server | yes |
| `EUREKA_URL` | every service | yes (default `http://localhost:8761/eureka/`) |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `DB_NAME` | services with a DB | yes |
| `REDIS_HOST` / `REDIS_PORT` | services using Redis | when used |
| `KAFKA_BOOTSTRAP_SERVERS` | services using Kafka | when used |
| `MAIL_SENDER_ENABLED` / `MAIL_SENDER_USERNAME` / `MAIL_SENDER_APP_PASSWORD` | notification-service | when mail enabled |
| `CLOUDINARY_ENABLED` / `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `CLOUDINARY_FOLDER` | media upload | when Cloudinary enabled |

> [!WARNING]
> **Never commit real secrets.** `*_PASSWORD`, `*_API_SECRET`, `APP_PASSWORD` and
> private keys must only come from environment variables / a secret manager.
> `config-repo` files keep `${VAR:}` placeholders only.

## Per-service files

Add one `<service-name>.yml` per bounded context. Keep service-owned settings
(datasource schema, Kafka topics, feature flags) in that file — not duplicated in
the service's own `application.yml`, which should stay bootstrap-only.

## Automatic schema migrations

Flyway is explicitly enabled in `application.yml`. All eight business services
have Flyway dependencies, their own `schemas` / `default-schema`, and
`create-schemas: true`. When a service starts against an existing empty database,
Flyway creates its schema and applies its migrations from
`src/main/resources/db/migration` (`V1`, `V2`, then any new versions).
Each schema has its own `flyway_schema_history`; subsequent starts apply only
pending versioned migrations. Hibernate uses `ddl-auto: validate`, including
the `dev` profile, rather than changing tables outside Flyway.

Create the PostgreSQL database first and point the service's `DB_NAME` at it.
For the local Docker database, keep `DB_NAME` aligned with `POSTGRES_DB`.
The migration user needs permission to create the service schema and modify
its objects. Restart the service after changing its database/configuration;
this does not watch for or migrate every new database on the PostgreSQL server.

Keep `baseline-on-migrate: false`: a fresh database or empty schema does not
need a baseline. An existing non-empty schema without Flyway history requires
an explicit, reviewed adoption plan, not automatic baselining or deletion.
Do not edit applied migrations; add a new version instead. Config Server,
Discovery and Gateway do not gain domain tables from this setting, and the
Audit Service now has a separate `audit-service.yml`, module and V1 migration
for `audit_service.audit_logs`. Its read API is implemented in source; domain
producers/ingestion and runtime verification are still pending. See
[logging and audit setup](../docs/observability.md) for log levels, Docker rotation,
the read-only base and manual verification commands.

