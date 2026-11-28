---
'@schema-engine/registry': minor
---

`safeParseTree` returns the nodes that parsed when a document has issues. The failure result has `tree`, a `PartialNode`, when the root's own schema passed. It holds every node whose own schema passed, with `output`, its schema output, and `children`, the children that parsed, in document order. A partial node has no `data`: the parsed document exists only when there are no issues. Read a node's children from `children`, never from a slot of `output`, which holds what the document had there. Use it to run your own checks on what parsed, so one call reports every issue.

```ts
import { safeParseTree } from '@schema-engine/registry';

const parsed = safeParseTree(registry, document, { accepts: ['page'] });
if (!parsed.success) {
	parsed.issues; // every issue, as before
	parsed.tree?.output; // the root's own schema output, when the root parsed
	parsed.tree?.children; // [{ keys: ['sections'], nodes: [/* children that parsed */] }]
}
```
