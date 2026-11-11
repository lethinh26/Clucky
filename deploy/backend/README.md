# Full-stack deployment

Pipeline source: `.github/workflows/frontend-ci.yml`, display name **Clucky full-stack CI/CD**. Runs on merge/push main or manual Run workflow on main. PR frontend checks remain unchanged; deployment is never run for PRs. No workflows or checks were executed while adding this configuration.

## Scope and startup order

1. PostgreSQL 16, Redis 7 (AOF), Kafka 3.9 (persistent KRaft logs).
2. Config Server with the exact release's config-repo snapshot, then Eureka.
3. Identity, Catalog/Store, Cart/Order, Payment, Promotion/Loyalty, Shipping, Notification, Review/Report and Audit.
4. API Gateway after all nine business-service health checks, then wait for Eureka registrations.
5. Customer Next.js and staff/admin React, using the same commit as backend.

Total: 17 containers, including 12 Java services. Every source release rebuilds/packages all application images on the GitHub runner; Docker Compose reuses unchanged infra instead of resetting data. VPS does not compile Java/Node. Health checks confirm runtime readiness, not completion of every business task: services that still contain templates remain templates, and missing email/payment/S2S integrations do not become implemented through deployment.

**Per owner request, sample accounts and fixed sample passwords remain unchanged. No disabling, randomization, password reset or seed deletion is performed. Those credentials are in repository migrations; an Internet-accessible demo using them must not contain real customer/payment data.**

## GitHub configuration

Use repository Secrets/Variables so both packaging and deploy jobs see the same values. The full-stack deploy job retains the existing environment name `frontend-production` to avoid losing existing environment permissions/secrets; it now protects the entire stack. Configure its approval/access rules accordingly.

Existing SSH settings: VPS_HOST, VPS_PORT (default 8686), VPS_USER, VPS_WORKDIR (default /opt/clucky), Secret VPS_SSH_KEY, and **Secret VPS_SSH_KNOWN_HOSTS** with verified host public key. StrictHostKeyChecking=yes is used for all transfers, including private credentials.

Public Repository Variables:
- NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID: same Firebase project as the server credential. Local Next.js env does not populate these Variables.
- FRONTEND_API_URL: leave unset/empty for same-origin `/api` through the existing Nginx Gateway proxy. Browser URLs must not point to localhost on the user's machine or Docker DNS names.
- NEXT_PUBLIC_M3_DEMO_ENABLED: defaults false for real API integration; setting true explicitly packages UI demo mode. This flag does not change seeded database accounts/passwords.

Secrets:
- FIREBASE_SERVICE_ACCOUNT_JSON: full service-account JSON. Project ID is derived and compared with public Firebase project before deploying.
- **BACKEND_ENV_JSON**: JSON object of string values. Minimal example (replace placeholders; this is not usable secret data):

```json
{
  "POSTGRES_PASSWORD": "<random-database-password-at-least-16-bytes>",
  "JWT_SECRET": "<random-jwt-secret-at-least-32-bytes>"
}
```

FRONTEND_CUSTOMER_URL and FRONTEND_ADMIN_URL may be omitted or empty. The workflow passes the configured VPS_HOST to preflight, frontend configuration extraction and the remote backend environment writer; they derive `http://<VPS_HOST>` and `http://<VPS_HOST>:8081`, matching the repository's Nginx example. VPS_HOST must be a hostname or IPv4 address without a scheme, port or path; VPS_PORT is only the SSH port and never becomes a browser port. Updating VPS_HOST and redeploying updates the derived origins and email links, without editing the JSON.

Explicit frontend URLs take precedence, so remove old IP-valued entries to enable automatic defaults. For HTTPS domains or different public ports, supply the desired URLs explicitly. Google popup login on a public HTTP IP is not a supported production setup: use an authorized HTTPS domain for Firebase. AUTH_COOKIE_SECURE defaults true when both resolved origins use HTTPS, false otherwise; remove a stale explicit cookie flag when changing schemes or update it accordingly. No trailing slash/path/wildcard in origins. CORS/CSRF still use the exact resolved values, not a wildcard or a request-supplied Host header. This does not configure Nginx/TLS, DNS, Firebase authorized domains or Mapbox URL restrictions for you.

Do not use the documented sample passwords as database/JWT credentials. These infrastructure secrets are separate from user account passwords, which are preserved as requested. Use cryptographically random values, e.g. locally generate with `openssl rand -hex 32` and paste directly into the GitHub Secret, not into chat/Git.

The workflow validates `BACKEND_ENV_JSON` before building images. Errors identify only documented field names and validation rules, never secret values. A manually dispatched run on a non-main branch performs this preflight only; it does not deploy. VPS filesystem, Firebase provisioning and unchanged database credential checks still run during deployment.

Optional BACKEND_ENV_JSON keys:
- NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN / VITE_MAPBOX_ACCESS_TOKEN: public `pk.` tokens for Next.js and React. Both are required by the frontend image packaging job, which reads them from this same Secret; separate GitHub Variables are not used. Preflight rejects secret tokens and whitespace without printing their values. These two fields are excluded from the backend runtime.env.
- POSTGRES_USER / DB_NAME (default clucky), JWT_ISSUER / JWT_AUDIENCE (clucky-identity / clucky-api), AUTH_COOKIE_SECURE.
- MAPBOX_GEOCODING_TOKEN: server-side Mapbox token supplied only to Catalog for `/api/locations/search` and `/api/locations/reverse`. Add it to BACKEND_ENV_JSON for address lookup; omitted/empty leaves those endpoints unavailable. Use a separate least-privilege token suitable for server requests, not a browser URL-restricted token. The validator accepts nonempty `pk.` or `sk.` tokens without whitespace; it does not verify their API permissions or validity with Mapbox.
- Internal service authentication uses the existing JWT_SECRET/JWT_ISSUER/JWT_AUDIENCE. Order and Promotion/Loyalty generate short-lived service JWTs automatically; no separate service token is configured. Remove the retired CATALOG_SERVICE_TOKEN, PROMOTION_SERVICE_TOKEN and LOYALTY_INTERNAL_TOKEN fields from BACKEND_ENV_JSON; the validator rejects unsupported keys. Remove their local env entries as well if present; Compose no longer passes them to containers.
- SEPAY_WEBHOOK_SECRET: passed only to Payment; webhook business implementation is still its separate task.
- CLOUDINARY_ENABLED / CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET: supplied only to Catalog; enabled requires the three credentials.
- MAIL_SENDER_ENABLED / MAIL_SENDER_USERNAME / MAIL_SENDER_APP_PASSWORD: supplied only to Notification; enabled requires both credentials. This remains the system mailbox/App Password, not customer Google credentials.
- REPORT_REVENUE_EVENT: supplied only to Review/Report; defaults to `false` (listener disabled). Enable `order.completed` or `payment.confirmed` only after the INT-45 revenue/refund policy, producer contract and projection baseline are approved; see `backend/review-report-service/README.md`.

Values must be strings with no newline/control character/single quote; JSON standard quoting is required. Dollar signs, hashes, equals signs and double quotes are preserved as literal Compose env values. Unknown keys are rejected rather than silently injecting arbitrary process options.

Firebase JSON never goes into images/artifacts. It is transmitted over pinned SSH stdin and installed at `$VPS_WORKDIR/secrets/firebase-service-account.json` (0600). Backend runtime.env is created directly on VPS inside the private release (0600), not uploaded as an artifact. Spring services use Config Server/Eureka; only Identity receives the Firebase file, only relevant services receive integration secrets.

### Mapbox setup

1. In GitHub Repository Settings → Secrets and variables → Actions → Secrets, edit the existing repository Secret `BACKEND_ENV_JSON`. Keep the database, JWT, SMTP and other entries, then add all three Mapbox fields; no separate Mapbox Variables are needed:

```json
{
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": "pk.<customer-browser-token>",
  "VITE_MAPBOX_ACCESS_TOKEN": "pk.<admin-browser-token>",
  "MAPBOX_GEOCODING_TOKEN": "<server-mapbox-token>"
}
```

2. The image job validates the JSON, masks the two public token values in logs and exports only those two fields as frontend build arguments. Database/JWT/SMTP credentials and the server geocoding token are never forwarded to frontend builds. The backend runtime file excludes the two frontend fields. The browser fields can share one public token if it allows both application origins; public tokens remain visible in the shipped JavaScript even when stored in a GitHub Secret. Use the repository Secret consistently; an environment override would not be available to the image packaging job.
3. Browser tokens should allow the actual Customer and Admin URLs in Mapbox. With the automatic defaults and repository Nginx example, these are `http://<VPS_HOST>` and `http://<VPS_HOST>:8081`; update restrictions when changing VPS_HOST or moving to HTTPS domains. Server geocoding requests have no browser Referer, so do not reuse a URL-restricted browser token for the backend.
4. Publish the workflow changes to main before deploying. Changing the GitHub Secret or a VPS runtime env alone cannot update tokens already embedded in JavaScript: build a new Customer/Admin image release. Local equivalents are already wired in `compose.local.yml` and `.env.docker`; local env values are not copied to GitHub automatically. `.env.docker` remains a `KEY=VALUE` file, not JSON.

Mapbox guidance: [token security](https://docs.mapbox.com/help/dive-deeper/how-to-use-mapbox-securely/) and [token URL restrictions](https://docs.mapbox.com/api/accounts/tokens/#url-restrictions).

## VPS prerequisites and exposure

- Linux with Docker Engine + Compose v2 supporting `up --wait`, Python >=3.9, flock, enough disk for current/previous images and PostgreSQL backups. SSH user must be allowed to use Docker and write VPS_WORKDIR. Pipeline does not install Docker or change host services/firewall.
- The configured memory caps total approximately 9.3 GiB, excluding host OS/Nginx; actual consumption varies. Ensure VPS capacity before deploying all Java services. Nothing is built on the VPS to avoid build-time spikes.
- Existing host Nginx should route customer to 127.0.0.1:3000, admin to 127.0.0.1:3001 and `/api/` to 127.0.0.1:8080. See `deploy/frontend/nginx.conf.example`. Pipeline does not replace live Nginx configuration or provision TLS without the deployment's domain/certificate details.
- Only those three loopback ports are published. PostgreSQL, Redis, Kafka, Config Server, Eureka and business services have no host/public ports. Both Compose projects share clucky-app; Customer SSR calls Gateway internally, not a business service.
- If the old `clucky-postgres` container exists, first deployment stops and asks for explicit data migration instead of silently creating a parallel empty database. This stack uses stable volumes clucky-backend-postgres-data, clucky-backend-redis-data and clucky-backend-kafka-data. It never runs down -v, volume prune, truncate or a database reset.
- Docker Java runtime currently runs as root, matching existing service images, so Identity can read the SSH-owned 0600 Firebase bind mount. Do not chmod 644/777 the key. Moving to non-root containers requires provisioned runtime UID/secret permissions as a separate hardening change.

## What happens on deployment

Images are tagged by commit/run/attempt; frontend and backend use one release ID. Manifests verify transferred files. Old main revisions are rejected before activation; production runs are serialized, including the standalone Firebase rotation workflow.

Firebase provision runs automatically, then backend env validation, then infrastructure. PostgreSQL is dumped in custom format to `$VPS_WORKDIR/backend/backups/<release>-<timestamp>.dump` before any new application/Flyway startup. Dump failure stops deployment. This is a point-in-time backup, not a zero-downtime restore strategy; writes made after the dump are not present in it. Keep/rotate backups under your retention policy; deployment does not silently delete old backups.

Config Server → Eureka → all business services → Gateway start with health gates. Migrations apply through each service's Flyway; sample seed migrations execute normally on fresh DBs. Backend current link changes only after health/Eureka readiness. The existing frontend activation then updates both frontends and retains its automatic frontend rollback behavior.

Before infrastructure startup, a disposable Kafka container assigns its data volume directory to Kafka's UID/GID 1000. Only the directory owner changes, not its contents; the broker still runs as the image's non-root user. This prevents fresh Docker volumes owned by root from failing KRaft initialization.

No automatic database rollback is attempted. If backend migration/readiness fails, the job fails and retains data, private release files, images and backup for diagnosis. Some services may already have switched to the new release: this is an in-place demo deployment, not blue/green or zero downtime. Frontends are not activated after a backend failure.

Database name/user/password must remain stable across redeploys. Changing POSTGRES_PASSWORD only changes a container environment, not an initialized PostgreSQL user password; prepare.py rejects that change. Rotate database credentials via an explicit procedure, not by replacing this Secret alone.

## Rerun, rotation and rollback

- Secret changes do not trigger a push: use Actions → Clucky full-stack CI/CD → Run workflow → main. Re-run all jobs for a fresh release ID if a partially activated release directory already exists.
- Full-stack deployment creates a newly tagged Identity container, so the atomically replaced Firebase file is re-mounted and the SDK reloads credentials. The standalone **Provision Firebase credential on VPS** workflow is manual-only, does not restart Identity and is not needed during full deployments.
- Frontend rollback remains `VPS_WORKDIR=/opt/clucky bash /opt/clucky/frontend/current/deploy.sh rollback`.
- Backend rollback is manual **only after confirming the old code is compatible with current schema**:

```bash
VPS_WORKDIR=/opt/clucky SCHEMA_COMPATIBLE_ROLLBACK=yes \
  bash /opt/clucky/backend/current/deploy.sh rollback <previous-release-id>
```

Backend rollback changes images/config, never restores/downgrades database. If schema is incompatible, fix forward or restore deliberately during maintenance after reviewing backup and post-backup writes. Do not restore over live data automatically. Secret rotation may also make old configuration inappropriate; review before rollback.

## Checks left for the owner (not executed by agent)

```text
python deploy/backend/test_prepare.py
python deploy/identity/test_firebase_secret.py
bash -n deploy/backend/deploy.sh
```

On the VPS, inspect Compose health/Eureka registration, then exercise Google/email, catalog, checkout and permissions separately. Healthy containers are not evidence that all Sprint 2 AC passed. The pipeline has not been pushed or run as part of this code change.
