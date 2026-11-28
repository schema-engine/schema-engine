---
'@schema-engine/registry': minor
---

`CheckChildPaths` is exported, the type `createRegistry` and `register` apply to a registration so a child path its schema does not declare (`childPathNotInSchema`) or a list path over a slot that is no array (`listPathNotAnArray`) is a compile error. A domain package applies it to its own element declarations: `defineInput` and `defineInputContract` of `@schema-engine/forms` do.

`RegistryErrorCode` has a new code, `'invalid-declaration'`, for a domain package that refuses what a registration declares other than its `childPaths`. Forms throws it for an element that states no `kind`, an input that declares neither `value` nor `childPaths`, and a container that declares a `value`.
