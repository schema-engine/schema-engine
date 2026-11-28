---
'@schema-engine/registry': minor
---

Export `isStandardSchema`, the check `createRegistry` runs on a registration's schema, so a domain package can test a schema of its own and throw a `RegistryError`.
