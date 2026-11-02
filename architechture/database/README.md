# Database files

- `schema.sql`: PostgreSQL schema for nine bounded contexts, including the separate Audit Service.
- `sample_data.sql`: repeatable local/demo seed with Clucky sample data, real Unsplash image URLs, demo accounts, menu, stores, vouchers, orders, payment, shipping, notifications and review.

## Centralized audit

The system has exactly one audit table: `audit_service.audit_logs`, owned by the separate Audit Service, not Review & Report. It records every successful state-changing operation in the management application by Staff, Store Manager and Admin. Domain services publish audit events from trusted backend operations, not from client-supplied actor/role values; they never write directly to the audit schema.

BE-43 owns the Audit Service base, entity/repository and `GET /api/audit-logs` through Gateway. INT-48 owns event publishing integration and idempotent consumption; unique `event_id` prevents replay duplicates. Records include the actor and role at the time of the action, affected store, source service, action, target, occurrence time and correlation ID. `detail.before` and `detail.after` contain only allowlisted changed fields; `detail.reason` captures a required business reason where applicable. Never copy passwords, hashes, OTPs, tokens or provider secrets into snapshots.

Admin can query all roles system-wide; Store Manager can only query Staff actions within their own store, enforced by the backend according to the existing RBAC matrix. Recording a role's actions does not grant that role access to audit logs. There is no user-facing API to create, edit or delete audit records.

Domain histories (`order_status_history`, `shipment_status_history`) and delivery logs (`email_logs`) retain their own purposes; they are not duplicate audit tables.

`schema.sql` is the fresh-install reference schema, not evidence of the live database state. This design change does not deploy Audit Service or move existing records. If `review_report_service.audit_logs` already exists in a running database, preserve it until a reviewed migration/export-import plan transfers and verifies all records, switches producers/readers, and safely retires the old table. Do not drop it, invent missing historical actor/event metadata, or rewrite applied Flyway migrations. The new service's schema must be managed by its own Flyway migrations.

## Local demo accounts

All demo accounts use password `123456789`:

- `admin@clucky.local` — ADMIN
- `manager.d1@clucky.local` — STORE_MANAGER
- `staff.d1@clucky.local` — STAFF
- `customer1@clucky.local` — CUSTOMER
- `customer2@clucky.local` — CUSTOMER

This password is intentionally weak for local demo only. Never reuse it in staging or production.

## Import

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/sample_data.sql
```

The schema uses separate PostgreSQL schemas and does not create cross-service foreign keys. Image URLs point to Unsplash source images for realistic local/demo previews; production media should be uploaded to Cloudinary through the backend media flow.
