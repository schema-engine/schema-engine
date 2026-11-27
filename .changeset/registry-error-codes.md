---
'@schema-engine/registry': patch
---

Building and binding errors are `RegistryError` with a stable `code` (`RegistryErrorCode`), `kind`, `$type` and, where the code needs them, `key`, `childPath` and `outerChildPath`; messages unchanged.
