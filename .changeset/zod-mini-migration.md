---
'@schema-engine/actions': patch
'@schema-engine/forms': patch
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
'@schema-engine/registry': patch
---

Migrate first-party schemas and JSON Schema generation to Zod Mini. Built-in schema exports now use the functional `zod/mini` API; consumer registrations continue to accept any Standard Schema implementation.

Form authors may omit `inputType` on `input` fields; it defaults to `text`. Renderers still receive the parsed output type.

Move phone-number validation from the Forms defaults to the phone-input integrations. The React registry item and the Radiant phone-input registration provide the validator and attach it through `defineInput({ validations })` when the element is added to a form engine.
