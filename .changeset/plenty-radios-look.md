---
'@schema-engine/forms-react': major
---

The root entry now exposes renderer components only; move hook, adapter, and primitive imports to their dedicated subpaths. Import `rhfAdapter` from `/adapters/react-hook-form`, which keeps `react-hook-form` optional. Replace `useFormInstance` with `useFormContext` from `/adapters`, and replace the removed consent and tracker hooks with `GDPRConsent` and `GTMTracker` from `@schema-engine/forms/browser`. `createFormEngine` is no longer re-exported; import it from `@schema-engine/forms`. The `./registries/builder-registry` subpath is removed for the same reason. Styling utilities and Tailwind class names are no longer part of the package's runtime API, so consumers can remove Tailwind scanning of this package and style the exposed `se-*` hooks themselves.
