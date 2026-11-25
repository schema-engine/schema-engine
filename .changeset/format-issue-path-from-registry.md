---
'@schema-engine/forms': patch
---

`formatIssuePath` now lives in `@schema-engine/registry`; import it from there. `@schema-engine/forms` still re-exports it, so existing imports keep working. Its output for the paths it already took is unchanged, and it now also takes a missing path and the `{ key }` segments of a Standard Schema issue.

An action of a form or of a step whose `$type` no registration answers is now reported as `No registration for $type '<type>'. Register it with createFormEngine({ actions: [...] }).` (it was `Unknown action type '<type>'. Register it in the action registry.`), at the same path, because `parseActions` now checks each entry with `safeParseNode`.
