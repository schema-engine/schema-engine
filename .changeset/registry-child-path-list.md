---
'@schema-engine/registry': minor
---

A child path can say its slot holds a list: `{ keys, accepts?, list: true }`. With `list`, `safeParseTree` reports a value at the path that is not an array as the issue `registry/not-a-list` (message `Expected a list of nodes.`, at the path), instead of reading one object as one child. `exportTreeSchema` and `replaceChildSlot` write an open slot as an array of the accepted nodes (an object slot of such a path is an unreachable slot, since the schema would refuse the list), and `NodeData` types an opaque slot as an array of the children. `createRegistry` and `createMutableRegistry` accept `list` and throw `RegistryError` `'invalid-child-paths'` for a value other than `true`, and the type-level check knows the property.

```ts
// A slot that is a list
createRegistry('Node', [{ $type: 'row', schema: RowSchema, metadata, childPaths: [{ keys: ['cells'], list: true }] }]);
safeParseTree(nodes, { $type: 'row', cells: { $type: 'text' } });
// issue: { code: 'registry/not-a-list', path: ['cells'], message: 'Expected a list of nodes.' }
```
