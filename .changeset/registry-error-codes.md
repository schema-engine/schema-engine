---
'@schema-engine/registry': minor
---

Building and binding errors are `RegistryError` with a stable `code` (`RegistryErrorCode`), `kind` (absent when the lookup is not a registry, as a function is), `$type` and, where the code needs them, `key`, `childPath` and `outerChildPath`; messages unchanged.
