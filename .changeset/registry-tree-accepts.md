---
'@schema-engine/registry': minor
---

A child path says which `$type`s it accepts, and `safeParseTree` returns the parsed document. This breaks the `childPaths`, `safeParseNode` and `safeParseTree` APIs of 0.5:

- A child path is an object, `{ keys, accepts? }`, not a list of keys. `accepts` is a closed, non-empty list of `$type`s; without it, any `$type` the lookup answers is accepted.

    ```ts
    // before
    childPaths: [['sections'], ['engine', 'controls']];
    // after
    childPaths: [{ keys: ['sections'], accepts: ['section'] }, { keys: ['engine', 'controls'] }];
    ```

- `path` moved into an options object, and `accepts` joined it. `{ accepts }` restricts the node, or the root of a tree; an empty list throws.

    ```ts
    // before
    safeParseNode(registry, node, ['children', index]);
    safeParseTree(registry, root, ['doc']);
    // after
    safeParseNode(registry, node, { path: ['children', index] });
    safeParseTree(registry, root, { path: ['doc'], accepts: ['page'] });
    ```

- `ParsedNode.data` holds the data of its children at each child path, and `tree.data` is the parsed document, typed per path (the root narrows from a literal `accepts`). `ParsedNode.children` is a list of `{ keys, nodes }`, one per declared path in declaration order, not a record keyed by the dotted path.

    ```ts
    // before
    const controls = tree.children['engine.controls'];
    // after
    const controls = tree.children.find(({ keys }) => keys.join('.') === 'engine.controls')?.nodes;
    // or read the typed data
    const same = tree.data.engine.controls;
    ```

- The parent schema declares every child key, and a tree schema keeps `$type` in its output and the slot as the document has it. `createRegistry` reports a key its schema does not declare as a type error (`childPathNotInSchema`), and `safeParseTree` throws a `RegistryError` with the new codes `'schema-changes-type'` and `'schema-breaks-child-path'` (`childPath`) when a schema contradicts its registration. `safeParseTree` also reports a registration whose output declares no `$type` (`schemaOutputWithoutType`) and an `accepts` name the lookup lacks (`acceptsUnknownType`) as type errors.

    ```ts
    // before: the slot passed through a loose schema, or its $type was restricted there
    schema: z.looseObject({ $type: z.literal('page') }),
    childPaths: [['sections']],
    // after: the slot declared and opaque, restricted by accepts
    schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
    childPaths: [{ keys: ['sections'], accepts: ['section'] }],
    ```

- The issues the engine creates carry a namespaced `code`: `registry/not-an-object`, `registry/missing-type`, `registry/unregistered-type` (`received`), `registry/not-accepted` (`expected`, `received`), `registry/not-a-node` and `registry/contains-itself`, typed as the new `RegistryIssue`. Messages are unchanged, and an issue from a schema is untouched.
- `RegistryErrorDetails.kind` and `RegistryError.kind` are optional: a lookup that is no registry has none. Read it as `string | undefined`.
- `['a.b']` and `['a', 'b']` are two different child paths now (paths are compared key by key), so `'duplicate-child-path'` no longer joins keys with dots. `createRegistry` also throws `'invalid-child-paths'` for an entry with a property other than `keys` and `accepts` (a type error too, `childPathUnknownProperty`, for an inline list), and for an empty or repeating `accepts`.
