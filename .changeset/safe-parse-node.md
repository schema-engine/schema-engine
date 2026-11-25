---
'@schema-engine/registry': patch
---

Add `safeParseNode(registry, node, path?)`, which checks one node against the registration its `$type` names without throwing. It returns `{ success: true, registration, data }` or `{ success: false, issues }`, and every issue's `path` starts with the `path` you pass, so a walk over a tree reports each issue by its position in the document. A node without a string `$type` and a `$type` no registration answers are issues too.

Add `formatIssuePath(path, source?)`, which writes the `path` of an issue as text: keys joined by dots, indexes in brackets (`children[1].label`), and the empty string for a missing path. A segment may be a key or a Standard Schema `{ key }` object.
