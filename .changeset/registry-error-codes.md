---
'@schema-engine/registry': patch
---

Building and binding errors are `RegistryError` with a stable `code` (`RegistryErrorCode`), plus `kind` and `$type` when known; messages unchanged.
