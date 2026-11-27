---
'@schema-engine/actions': minor
'@schema-engine/forms': minor
---

The issues the registry creates reach the callers of `parseActions` and `validateForm` with their namespaced `code`. An unregistered `$type`, a node that is not an object and a node without a `$type` have the code `registry/unregistered-type`, `registry/not-an-object` and `registry/missing-type`. `ParseActionsResult` types its issues as the registry's `RegistryIssue`, and a form issue from the registry has `code` and `params` (`{ received }` for an unregistered `$type`), so an editor can localize it like a schema issue. Messages and paths are unchanged, and an issue the actions or forms engine finds itself still has no code.
