---
'@schema-engine/actions': patch
'@schema-engine/forms': patch
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
'@schema-engine/registry': patch
---

Migrate first-party schemas and JSON Schema generation to Zod Mini. Built-in schema exports now use the functional `zod/mini` API; consumer registrations continue to accept any Standard Schema implementation.

Form authors may omit `inputType` on `input` fields; it defaults to `text`. Renderers still receive the parsed output type.

Phone-input integrations replace the core E.164 `phone` handler with a libphonenumber validator, attached through `defineInput({ validations })` and applied to `phone-input` by default.
