# Action feedback

Both independently runnable frontends use Sonner (the shadcn notification library) through their own `components/feedback.tsx` and one root `Toaster`.

- Call `notify.success/error/warning/info` after an action completes. Admin's existing `message` calls use the same adapter; keyed loading notifications update in place.
- For existing error state, use `useFeedback(localizedMessage)` instead of also notifying from the API client. One layer owns each failure. Identical active messages share an ID.
- Keep field validation, retry buttons and checkout blockers inline. Loading indicators, empty states, confirmation dialogs and the persistent notification inbox are not transient toasts.
- Translate API errors with `getErrorMessage`; never display raw stack traces, credentials or arbitrary server exception messages. Do not notify for normal session probes or successful background refreshes.
- Await writes and clipboard operations before reporting success. Failed writes must retain the user's inputs and must not fall back to a fake success.
- Customer regression checks: `node --test tests/cart.test.mjs` and the Playwright `tests/ui/feedback.spec.ts` (run only when requested).
