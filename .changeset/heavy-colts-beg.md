---
'@schema-engine/registry': minor
'@schema-engine/actions': minor
'@schema-engine/forms': minor
---

Consolidate action execution into `ActionDispatcher.dispatch` and `dispatchSync`.
Replace `ActionExecutor.execute` calls with `ActionDispatcher.dispatch`, and remove
constructor `debug` options; logging follows the host's Ecopages logger settings.
Explicit trigger mismatches now skip unregistered actions without a failed result.

Remove `ComponentRegistry` and `getMap()`. Extend `BaseRegistry` with the
`ComponentRegistration` type and use `getAll()` or `getAllKeys()` for snapshots.
Engine construction builds Maps directly and checks each schema once.
Import `ActionExecutionResult` from `@schema-engine/forms` when using `redirectUrl`;
the generic actions result no longer includes browser navigation.
