---
'@schema-engine/registry': patch
---

The built package shares its code between entries, so `RegistryError` is one class. Each file of `dist` used to be bundled with its own copy of what it imports, so an error thrown through `@schema-engine/registry/json-schema` (`replaceChildSlot`) was not an `instanceof` the `RegistryError` imported from `@schema-engine/registry`.
