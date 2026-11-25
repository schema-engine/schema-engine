---
'@schema-engine/registry': patch
---

`NodeLookup` takes an optional `hint(type)`, a sentence that `safeParseNode` appends to the message of a `$type` the lookup does not answer, so a domain can say where to register it. With `hint: () => 'Register it with defineBadge.'`, an unregistered `chip` is `No registration for $type 'chip'. Register it with defineBadge.` (it is `No registration for $type 'chip'.` without a `hint`). A lookup that has no `hint`, such as a registry, is unchanged.
