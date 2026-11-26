---
'@schema-engine/forms-react': patch
---

Breaking rename shipped as a patch, because `useFormInstanceActions` was released in 0.5.0: `useFormInstanceActions` is now `useFormWizard`, with no alias, and it returns `FormWizard` from `@schema-engine/forms`. The `FormInstanceContextValue` type of `@schema-engine/forms-react/hooks` is removed; use `FormWizard`.
