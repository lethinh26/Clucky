# Database files

- `schema.sql`: PostgreSQL schema for the eight bounded contexts.
- `sample_data.sql`: repeatable local/demo seed with Clucky sample data, real Unsplash image URLs, demo accounts, menu, stores, vouchers, orders, payment, shipping, notifications and review.

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
