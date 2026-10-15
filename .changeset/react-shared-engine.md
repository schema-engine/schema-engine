---
'@schema-engine/forms-react': patch
'@schema-engine/forms': minor
---

Use the shared engine validation, wizard step state, submission lifecycle and action contexts in React. Validate nested wizard fields, clear nested errors on revalidation, enforce require constraints, execute only the selected action and preserve elapsed step metadata without validating submission twice.

Action context form adapters must now implement getValue and validate alongside reset and setValue. Custom adapters must supply these four methods; renderer-specific methods are no longer part of this contract.
