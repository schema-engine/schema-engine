---
'@schema-engine/forms': patch
---

The checks of an element, a view recipe and a validation rule use `safeParseNode` from `@schema-engine/registry`, like the actions of a form, so each says the same thing about a `$type` it cannot use, and keeps its hint on where to register it:

- An element `$type` nothing registers is `No registration for $type 'phone'. Register it with createFormEngine({ elements: [...] }).` (it was `Unknown element type 'phone'. Register it with createFormEngine({ elements: [...] }).`), at the same path.
- A `view.$type` nothing registers is `No registration for $type 'nope'. Register it with createFormEngine({ recipes: [...] }).` (it was `Unknown view recipe 'nope'. Register it with createFormEngine({ recipes: [...] }).`), at the same path. An empty `view.$type` is now reported as an unregistered type; it was `Must be a non-empty string.`.
- A rule `$type` nothing registers is `No registration for $type 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...` (it was `Unknown validation rule 'postalcode'. Register it with createFormEngine({ validations: [...] }). Registered rules: required, ...`), at the same path, and the error `createSchema` throws for it says the same.
- An action `$type` nothing registers in a form or a step says `Register it with createFormEngine({ actions: [...] }).` at the end of its message.
- `validateElement` and `validateElementConfig` given a value that is not an object report `Expected an object with a string $type.` at `[]` (it was `Invalid element configuration: missing $type.` at `['$type']`), and an object without a string `$type` reports `Expected a string $type.` at `['$type']` (it was `Invalid element configuration: missing $type.`, at the same path). The same applies to a child of an element, but the form's own schema already reports a child that is not an object or has no `$type`, so those issues are unchanged.

The other issues, their paths and the normalized result are unchanged.
