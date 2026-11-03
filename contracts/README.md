# Shared error contract and vi/en UI

## One source of truth

Edit **only `contracts/errors.json`** to add or change an API error. Each entry owns a stable uppercase code, `httpStatus`, and `messages.vi` / `messages.en`. One generic error per status has `defaultForStatus: true`; domain-specific errors with the same status must not set that flag.

From the repository root:

```powershell
node scripts/generate-errors.mjs
node scripts/generate-errors.mjs --check
```

The first command generates local `exception/ErrorCode.java` in the Gateway, eight business services and the independent Audit Service, plus code/status metadata in `error-codes.generated.ts` and translations in `locales/{vi,en}/errors.generated.json` in both frontends. Commit these outputs with the catalog so every app remains independently buildable/runnable. The second command detects drift without writing files; frontend CI includes it. The catalog check is included in the local verification; CI itself is only verified when the hosted pipeline runs.

Do not manually edit generated enums/translations, add another PromotionError list, introduce a shared Java module, or call an Error Service over the network.

## Backend contract

Throw `new ApiException(ErrorCode.VOUCHER_EXPIRED)` from the service owning the operation. Advice, JWT handlers and Gateway errors use the same generated catalog:

```json
{
  "timestamp": "2026-11-02T09:00:00Z",
  "status": 409,
  "error": "Conflict",
  "code": "VOUCHER_EXPIRED",
  "message": "This voucher has expired.",
  "path": "/api/promotions/vouchers/validate"
}
```

`message` is a safe English diagnostic from the catalog, not `Throwable.getMessage()`. Unexpected exceptions map to INTERNAL_ERROR. The frontend does not depend on `message`, HTTP reason text or translated text for branching. Unknown codes fall back by HTTP status and ultimately INTERNAL_ERROR. Clients must never display raw backend exception text. Transport/Firebase errors are mapped separately in each app's i18n core; they are not backend API codes.

## Locale and UI

- Customer Next.js uses **next-intl** (`NextIntlClientProvider`, `useTranslations`). `i18n/request.ts` reads the `clucky_locale` cookie per request; `next.config.ts` enables the plugin. There are no locale URL prefixes.
- Admin React uses **i18next + react-i18next** (`I18nextProvider`, `useTranslation`). `src/i18n/index.ts` registers bundled resources and synchronizes language changes to the cookie and HTML `lang`; Ant Design follows the selected locale.
- Only `vi` and `en`; default `vi`. The cookie is a preference, not authentication. Next.js switches via `router.refresh()` without a full page reload; React uses `i18n.changeLanguage()`. Do not key/remount the app on locale: cart and form state must survive.
- UI copy belongs in each app's `locales/vi/` and `locales/en/`, not in components or a custom translation engine. Next.js locales live at `frontend/nextjs/locales`; React locales at `frontend/react/src/locales`.

```text
locales/
  vi/
    common.json
    auth.json
    home.json
    menu.json
    admin.json
    orders.json
    business.json
    errors.generated.json
  en/
    ...same files and semantic keys...
```

### Adding UI copy

1. Add the same stable key in both languages, e.g. `login.title` inside `auth.json`. Never use the Vietnamese sentence as a key. Groups are nested objects; do not put literal dots in JSON property names.
2. In Next.js, call `const t = useTranslations('auth')`, then `t('login.title')`; or use `useTranslations()` with `t('auth.login.title')`. Server components use request-scoped `getTranslations` from `next-intl/server`.
3. In React, call `const { t } = useTranslation('auth')`, then `t('login.title')`; or use explicit namespaces such as `t('auth:login.title')`.
4. Next-intl uses ICU placeholders (`{email}`, `{count}`); i18next uses `{{email}}`, `{{count}}`. Pass values as the second argument. React escapes rendered strings; never render translated API messages with `dangerouslySetInnerHTML`.
5. A new group must be registered in `resources.ts` in that app, and in the React `ns` list if applicable. Each app bundles its own files and runs independently; no runtime dependency on the repository root.

API errors are different from UI copy: edit only `contracts/errors.json`, then regenerate. Do not hand-edit `errors.generated.json`. Backend messages remain safe English diagnostics. The frontend resolves known codes, then HTTP-status defaults, then `INTERNAL_ERROR`; raw exception text is never a translation key or a display fallback. Local form validation stores keys; API failures keep objects, so existing errors can be translated again after a language change.

`useLocaleTools()` only provides locale-aware error and native Intl money/number/date helpers; it is not a provider or translation engine. Money stays VND; dates use `Asia/Ho_Chi_Minh`. Do not use browser-cookie lookup during SSR to format UI.

### Coverage

- Customer: navigation, auth/OTP/reset/Google, home/menu/product details, account/address/password forms, cart, checkout, order history/details, payment/shipment/status components, stores, party bookings and accessible loading/control labels.
- Admin/Manager/Staff: dashboard, catalog/product/combo forms, stores, inventory, orders/refunds, payments/reconciliation, reports, reviews/replies, users/role labels, shared tables/modals and staff order screens.
- Detailed screen copy is grouped by feature inside `business.json`; shared navigation/auth copy stays in the existing group files. Only business keys used by an app are bundled in that app's business catalog.
- Product names/descriptions/options, store names/addresses, user input, customer reviews and already-recorded free-text history remain original domain data. New demo actions use the active language; stored historical prose is not retroactively machine-translated.
- Filters use stable values, not translated labels. Locale changes must not remount app providers or reset unsaved forms/cart state. Local account validation and voucher notices store message keys so existing messages update when language changes.

## Contributor checklist and automated checks

1. Add every UI message to **both** locale JSON files with the same semantic key and placeholder names. Use library interpolation, not concatenated Vietnamese template strings. Do not translate domain data or use it as a translation key.
2. For API errors, edit **only** `contracts/errors.json`, run `node scripts/generate-errors.mjs` from the repository root, and include generated outputs. Backend service code must use the generated enum.
3. Run `npm test` in **each** frontend. The tests check vi/en key and placeholder parity, explicit message-key references in source, untranslated Vietnamese literals, safe errors, central error-catalog consistency and VND/Vietnam-time formatting.
4. `tests/i18n-domain-data.json` is a reviewed exception list for original names, addresses, sample reviews/options and category identifiers. Do not add UI labels to that list to make a test pass. New mock datasets belong in the existing mock/data modules.
5. Run `node scripts/generate-errors.mjs --check` from the root, then lint/build both apps. Existing frontend PR CI runs these catalog checks, unit tests and builds; no extra translation service is required.
6. Run browser regressions from `frontend/nextjs`: `npm run test:ui -- tests/ui/i18n.spec.ts`. The configured harness starts only frontend production servers and a test fixture, not Docker or business services. Build both frontends first.

The i18n browser suite exercises language switching, reload persistence, unsaved account/auth/admin forms, local validation, mock API error retranslations, cart quantity/notes/currency, staff filters and bilingual route coverage. API responses are intercepted; these are frontend integration tests, not proof that live backend services are connected.

## Verification

See `docs/verification/i18n-2026-11-02.md` for the executed commands, results and limitations. The user explicitly authorized testing for this i18n completion. Backend tasks are not marked DONE merely because their files exist.
