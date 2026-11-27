---
'@schema-engine/registry': patch
---

Add a third argument to `createRegistry(kind, registrations, options?)`: `{ duplicates: 'override' | 'error' }`. `'override'` is the default and the behaviour until now (a later registration of a `$type` replaces the earlier one). `'error'` throws `<kind> '<$type>' is registered twice.` when a `$type` repeats, before any schema is checked, for a catalog where a repeat is always a mistake. `CreateRegistryOptions` is exported.
