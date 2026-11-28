---
'@schema-engine/registry': minor
---

`CheckChildPaths` is exported, the type `createRegistry` and `register` apply to a registration so a child path its schema does not declare (`childPathNotInSchema`) or a list path over a slot that is no array (`listPathNotAnArray`) is a compile error. A domain package applies it to its own element declarations: `defineInput` and `defineInputContract` of `@schema-engine/forms` do.

`RegistryErrorCode` has a new code, `'invalid-declaration'`, when a domain package refuses a declaration of a registration other than its child paths.
