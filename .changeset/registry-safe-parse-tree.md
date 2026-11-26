---
'@schema-engine/registry': patch
---

Add `safeParseTree(registry, root, path?)`, which checks a whole document of `$type` nodes in one call. A registration says where its children are with the new optional `childPaths`, a list of key paths into the node: `childPaths: [['blocks'], ['engine', 'controls']]` means children at `node.blocks` and at `node.engine.controls`, each one node or an array of nodes. Every node goes through `safeParseNode` with its full path, so every issue is at the position it has in the document (`formatIssuePath` writes it), a node whose schema fails is not walked further but its siblings still are, a value at a child path that is no node is `Expected a node or a list of nodes.` at that path, and a node that contains itself is `A node cannot contain itself.` instead of a stack overflow. It returns `{ success: true, tree }` or `{ success: false, issues }` with all of them and no tree; a `tree` node is `{ $type, registration, data, path, children }` with `data` typed by the registration's schema output, narrowed by `$type`, and `children` keyed by the child path joined with dots. `ParsedNode` and `SafeParseTreeResult` are exported.

`createRegistry` checks `childPaths` when it builds and throws naming the kind and the `$type` for a path that is not a non-empty list of non-empty keys or for a path declared twice. `safeParseNode` is unchanged.
