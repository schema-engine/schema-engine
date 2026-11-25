---
'@schema-engine/registry': patch
---

Add `safeParseNode(registry, node, path?)`, which checks one node against the registration its `$type` names without throwing. `registry` is anything whose `get(key)` returns a registration with a `schema`. It returns `{ success: true, registration, data }` or `{ success: false, issues }`, and every issue's `path` starts with the `path` you pass, so a walk over a tree reports each issue by its position in the document. A node that is not an object is `Expected an object with a string $type.` at `path`; an object without a string `$type` is `Expected a string $type.` and a `$type` no registration answers is `No registration for $type '<type>'.` followed by the lookup's optional `hint(type)`, both at `[...path, '$type']`.

Add `formatIssuePath(path, source?)`, which writes the `path` of an issue as text: keys joined by dots, indexes in brackets (`children[1].label`), and the empty string for a missing or empty path. A segment may be a key or a Standard Schema `{ key }` object. Given the document as `source`, an array item with a string `id` is followed by it: `children[1] (hero).label`.
