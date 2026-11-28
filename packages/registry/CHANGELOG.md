# @schema-engine/registry

## 0.6.0

### Minor Changes

- [#451](https://github.com/schema-engine/schema-engine/pull/451) [`479f41b`](https://github.com/schema-engine/schema-engine/commit/479f41b3891666cf8da2c949b71b2e8295aca59f) Thanks [@andeeplus](https://github.com/andeeplus)! - A child path can say its slot holds a list: `{ keys, accepts?, list: true }`. With `list`, `safeParseTree` reports a value at the path that is not an array as the issue `registry/not-a-list` (message `Expected a list of nodes.`, at the path), instead of reading one object as one child. `exportTreeSchema` and `replaceChildSlot` write an open slot as an array of the accepted nodes (an object slot of such a path is an unreachable slot, since the schema would refuse the list), and `NodeData` types an opaque slot as an array of the children. `createRegistry` and `createMutableRegistry` accept `list` and throw `RegistryError` `'invalid-child-paths'` for a value other than `true`, and the type-level check knows the property: `list: true` over a slot the schema types as no array (an object, a string) is the error `listPathNotAnArray`, with the `$type` and the keys. An array slot that declares only array keywords gets `type: 'array'`, so the JSON Schema refuses an object where `safeParseTree` does.

    ```ts
    // A slot that is a list
    createRegistry('Node', [
    	{ $type: 'row', schema: RowSchema, metadata, childPaths: [{ keys: ['cells'], list: true }] },
    ]);
    safeParseTree(nodes, { $type: 'row', cells: { $type: 'text' } });
    // issue: { code: 'registry/not-a-list', path: ['cells'], message: 'Expected a list of nodes.' }
    ```

- [#439](https://github.com/schema-engine/schema-engine/pull/439) [`5addcce`](https://github.com/schema-engine/schema-engine/commit/5addcceecabfc0d94580435217ce13fc566a3410) Thanks [@andeeplus](https://github.com/andeeplus)! - Building and binding errors are `RegistryError` with a stable `code` (`RegistryErrorCode`), `kind` (absent when the lookup is not a registry, as a function is), `$type` and, where the code needs them, `key`, `childPath` and `outerChildPath`; messages unchanged.

- [#443](https://github.com/schema-engine/schema-engine/pull/443) [`612d332`](https://github.com/schema-engine/schema-engine/commit/612d33213af7d9a1d2a71ebf7ccddf8279c492c7) Thanks [@andeeplus](https://github.com/andeeplus)! - `exportTreeSchema(lookup, options)` writes the JSON Schema of a whole tree of registrations, composed at the JSON Schema level so it does not depend on the validator.

    ```ts
    const schema = exportTreeSchema(nodes, { accepts: ['page'] });
    // { $schema, $defs: { page, section, ... }, anyOf: [{ $ref: '#/$defs/page' }] }
    ```

    - One definition per `$type` under `$defs`. Each child path replaces only its slot, by the union of its `accepts` (every `$type` of the lookup without one): an array slot gets `items`, an object slot becomes the union, and an open slot becomes a child or a list of children. `required`, `minItems`, `maxItems` and the sibling keys stay.
    - Each schema is read by `options.resolve`, by default its `~standard.jsonSchema`; a schema it cannot read is listed by an open object that holds its `$type` and child paths. Options: `accepts` (the root), `io` (`'input'` by default), `target` and `resolve`. `lookup` is a registry or a list of registries.
    - A slot the export cannot reach (behind `allOf`, a `$ref` or a union, or inside a schema with an `$id` (`id` for draft-04) of its own), a `$type` a child path accepts that the lookup lacks, and a lifted definition that takes the name of a `$type` throw a `RegistryError` with the new codes `'unreachable-child-path'`, `'unknown-accepted-type'` and `'definition-name-clash'`.
    - A schema written as a document of its own is moved into the document with its names written per owner, so two owners never write the same name. Its `$defs` are lifted as `<owner>.<name>` with each `.` and `_` of the `$type` written as `_2e_` and `_5f_` (`a.b` with `c` is `a_2e_b.c`; `a` with `b.c` is `a.b.c`). Its anchors (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#name'`, a draft-04 `id: '#name'`) become `<owner part>.<name>`, where the owner part is `o` and the `$type` with every character outside `[A-Za-z0-9-]` written as `_<hex>_` (`ui/button` with `x` is `oui_2f_button.x`, `my-card` is `omy-card.x`), valid in every dialect. A name that is still taken throws `'definition-name-clash'` and nothing is overwritten, whether `exportTreeSchema` or the embedder writes it.
    - The new subpath `@schema-engine/registry/json-schema` exports `readStandardJSONSchema`, for a `resolve` that falls back to a schema's `~standard.jsonSchema`, and `createJSONSchemaEmbedder`, for a domain package that writes JSON Schema itself (forms uses both).

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`8608803`](https://github.com/schema-engine/schema-engine/commit/860880328679a5226b96d2cdb03064f9a9403ed3) Thanks [@andeeplus](https://github.com/andeeplus)! - `CheckChildPaths` is exported, the type `createRegistry` and `register` apply to a registration so a child path its schema does not declare (`childPathNotInSchema`) or a list path over a slot that is no array (`listPathNotAnArray`) is a compile error. A domain package applies it to its own element declarations: `defineInput` and `defineInputContract` of `@schema-engine/forms` do.

    `RegistryErrorCode` has a new code, `'invalid-declaration'`, when a domain package refuses a declaration of a registration other than its child paths.

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`0930f0a`](https://github.com/schema-engine/schema-engine/commit/0930f0a8cab9d4e6e8d78bb36e92c32f01a6ed25) Thanks [@andeeplus](https://github.com/andeeplus)! - Export `isStandardSchema`, the check `createRegistry` runs on a registration's schema, so a domain package can test a schema of its own and throw a `RegistryError`.

- [#447](https://github.com/schema-engine/schema-engine/pull/447) [`b75f9bb`](https://github.com/schema-engine/schema-engine/commit/b75f9bb5b6e158a846773c394660450e00fa26ca) Thanks [@andeeplus](https://github.com/andeeplus)! - JSON Schema targets are one closed set, the Standard JSON Schema names, and each API throws for a target it does not write before it converts a schema. `@schema-engine/registry/json-schema` also exports the step `exportTreeSchema` takes for each child path.

    - `JSONSchemaTarget` is `'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0'`. It no longer accepts any string.
    - `exportTreeSchema` writes `'draft-2020-12'` (the default) and `'draft-07'`: its `target` option, and the `target` a `resolve` function is told, are typed to those two. Any other value, a misspelling or `'openapi-3.0'` included, throws an `Error` instead of writing a document without `$schema`.
    - `createJSONSchemaEmbedder(target, placement)` takes a `JSONSchemaTarget` and throws for any other string.
    - New `assertJSONSchemaTarget(target)` throws unless a string is a `JSONSchemaTarget`, and narrows it to one. Use it for the `target` of a Standard JSON Schema converter's options, which the Standard type leaves open.
    - New `replaceChildSlot(definition, { $type, keys, list? }, union, { target })` replaces the slot a child path names in a registration's JSON Schema, and only the slot: `required`, list bounds, annotations and sibling keys stay. An unreachable slot (behind a reference, `allOf` or a union, inside a schema with an `$id` (`id` for draft-04) of its own between the definition and the slot, or nullable) throws `RegistryError` `'unreachable-child-path'`, and a path without keys throws `'invalid-child-paths'`. The `$id` of the definition's own root is the caller's to check (`exportTreeSchema` throws for it; a collection entry, whose `$id` is its address, is no obstacle). An open slot becomes a child or a list of children, or an array when the path sets `list`. Code that writes JSON Schema itself composes child slots with it, as `exportTreeSchema` does.
    - New `idKeyword(target)` is the keyword a target writes a schema's identifier under (`'id'` for `'draft-04'`, `'$id'` otherwise), and `startsResource(schema, target)` is whether a schema sets it to something other than a fragment, which makes it a resource of its own. The embedder, `replaceChildSlot` and `exportTreeSchema` read resources and anchors through them, so a draft-04 schema's `id` (and `id: '#node'` anchors) are handled as `$id` is for the other targets.
    - New `definitionRef(target, name)` writes the `$ref` to the definition of a name (`#/$defs/<name>` for `'draft-2020-12'`, `#/definitions/<name>` for any other target), with the name as a JSON Pointer token percent-encoded only for what a URI fragment does not allow, and `definitionsKeyword(target)` is the keyword it writes. The embedder gains `embedDefinition(own, name)`, which writes a schema that refers into itself at its own definition of a document (with `#` pointing there and its definitions lifted beside it) or as an entry of a collection, so the container of a slot is the schema and not a reference to a hoisted one. A schema with an `$id` (`id` for draft-04) of its own keeps its base: a collection entry for it is `{ allOf: [{ $ref: <its $id> }], $defs: { <name>: <the schema> } }`, so the entry keeps the collection's URI and other entries' references to it resolve. `exportTreeSchema` and the embedder write every reference with it, so a `$type` such as `element:tab` or `user@host` stays as written, where `:` and `@` were percent-encoded before (`#/$defs/element%3Atab`): the references still resolve to the same definition.

    ```ts
    import { assertJSONSchemaTarget, definitionRef, replaceChildSlot } from '@schema-engine/registry/json-schema';

    assertJSONSchemaTarget(options.target); // throws for 'draft-7'; narrows to JSONSchemaTarget
    replaceChildSlot(
    	definition,
    	{ $type: 'group', keys: ['elements'] },
    	{ anyOf: [{ $ref: definitionRef('draft-2020-12', 'input') }] },
    	{ target: 'draft-2020-12' },
    );
    ```

- [#446](https://github.com/schema-engine/schema-engine/pull/446) [`80e9cab`](https://github.com/schema-engine/schema-engine/commit/80e9cab742178fddd421b754a4f368b5ce4b7f26) Thanks [@andeeplus](https://github.com/andeeplus)! - `BaseRegistry` is replaced by `createMutableRegistry`, and both kinds of registry have one read interface. Build a registry that takes registrations at runtime with `createMutableRegistry<PluginRegistration>('Plugin')` instead of a `BaseRegistry` subclass. It returns a `MutableRegistry`: the read side of a `createRegistry` result (`get`, `has`, `all`, `keys`, `size`, `kind`) plus `register` and `clear`, so it goes wherever a registry is read: `safeParseNode`, `safeParseTree` and `exportTreeSchema` take either kind.

    - `getAll()` is `all()` and `getAllKeys()` is `keys()`. Both return frozen arrays in first-registration order, the same array until the next `register` or `clear`, so copy one before sorting it.
    - `registryName` is the `kind` argument, and `get` and `has` take a `string`. The `TKey` type parameter is gone: a registration's `$type` is its key.
    - `register` checks a registration as `createRegistry` does and throws a `RegistryError` (`'invalid-schema'`, `'invalid-child-paths'`, `'duplicate-child-path'`, `'nested-child-path'`); the registry is unchanged when it throws. In the types, a child path the schema does not declare is a `childPathNotInSchema` error, as for `createRegistry`.
    - A repeated `$type` replaces the earlier registration without a warning and keeps its position, or throws `'duplicate-type'` with `createMutableRegistry('Plugin', { duplicates: 'error' })`. The registry logs nothing: call `has` before `register` to warn about an override. `@ecopages/logger` is no longer a dependency of the package.
    - `get` returns a frozen copy of the registration.
    - The key is always `$type`. A subclass that overrode `getItemKey` or `getItemName`, or read the protected `items`, has no replacement, and one that added methods wraps the registry instead.

    ```ts
    // before
    class Plugins extends BaseRegistry<string, PluginRegistration> {
    	get registryName() {
    		return 'Plugin';
    	}
    }
    const plugins = new Plugins();
    plugins.getAll();
    plugins.getAllKeys();
    // after
    const plugins = createMutableRegistry<PluginRegistration>('Plugin');
    plugins.all();
    plugins.keys();
    ```

    `createRegistry` and `createMutableRegistry` take a `hint` option, exposed as the optional `hint` of a registry, so a registry is a `NodeLookup` with its hint: the sentence that ends the message of an unregistered `$type`, such as where to register it.

    The lookup types are one set: `ReadOnlyRegistry`, `MutableRegistry`, `NodeLookup` (find one registration, what `safeParseNode` and `safeParseTree` take) and `ExportLookup` (list them all, what `exportTreeSchema` takes). A registry of either kind is all of them.

- [#450](https://github.com/schema-engine/schema-engine/pull/450) [`7e86306`](https://github.com/schema-engine/schema-engine/commit/7e86306754c0e1689205c33cafba9fdc07d37aff) Thanks [@andeeplus](https://github.com/andeeplus)! - `safeParseTree` returns the nodes that parsed when a document has issues. The failure result has `tree`, a `PartialNode`, when the root's own schema passed. It holds every node whose own schema passed, with `output`, its schema output, and `children`, the children that parsed, in document order. A partial node has no `data`: the parsed document exists only when there are no issues. Read a node's children from `children`, never from a slot of `output`, which holds what the document had there. Use it to run your own checks on what parsed, so one call reports every issue.

    ```ts
    import { safeParseTree } from '@schema-engine/registry';

    const parsed = safeParseTree(registry, document, { accepts: ['page'] });
    if (!parsed.success) {
    	parsed.issues; // every issue, as before
    	parsed.tree?.output; // the root's own schema output, when the root parsed
    	parsed.tree?.children; // [{ keys: ['sections'], nodes: [/* children that parsed */] }]
    }
    ```

- [#442](https://github.com/schema-engine/schema-engine/pull/442) [`56381d9`](https://github.com/schema-engine/schema-engine/commit/56381d9d82a9b50a6ac5d9723354a82984de8609) Thanks [@andeeplus](https://github.com/andeeplus)! - A child path says which `$type`s it accepts, and `safeParseTree` returns the parsed document. This breaks the `childPaths`, `safeParseNode` and `safeParseTree` APIs of 0.5:

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
        const controls = tree.children.find(
        	({ keys }) => keys.length === 2 && keys[0] === 'engine' && keys[1] === 'controls',
        )?.nodes;
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
    - A child path is compared key by key. In 0.5 `['a.b']` and `['a', 'b']` counted as one path declared twice; now they are two different paths. `createRegistry` also throws `'invalid-child-paths'` for an entry with a property other than `keys` and `accepts` (a type error too, `childPathUnknownProperty`, for an inline list), and for an empty or repeating `accepts`.

### Patch Changes

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`b3302bf`](https://github.com/schema-engine/schema-engine/commit/b3302bff07ae32a812aae17b1ffa4a67a81ed077) Thanks [@andeeplus](https://github.com/andeeplus)! - The published packages resolve under `node16` and `nodenext` module resolution, and declare what they are.

    - The declaration files write their relative imports with an extension (`./types.js`), so a consumer on `node16` or `nodenext` finds the exports of `@schema-engine/actions`, `forms`, `forms-react`, `layout` and `forms-radiant`, where the entry resolved to no exports. `@schema-engine/forms-radiant` no longer writes `export * from './recipes/index.d.ts'`, which was an error (TS2846) for a project with `skipLibCheck: false`.
    - `@schema-engine/actions` has an `exports` map (`.` and `./package.json`), as the other packages do, and `@schema-engine/registry` exports `./package.json`.
    - No package declares an `engines` field.
    - `@schema-engine/forms-radiant` no longer lists `@schema-engine/actions` as a dependency, which nothing imported.

- [#451](https://github.com/schema-engine/schema-engine/pull/451) [`2ddce15`](https://github.com/schema-engine/schema-engine/commit/2ddce1566bd4a1812557ddbf65c1af693da5e28f) Thanks [@andeeplus](https://github.com/andeeplus)! - The built package shares its code between entries (the build of every package splits its output now), so `RegistryError` is one class. Each file of `dist` used to be bundled with its own copy of what it imports, so an error thrown through `@schema-engine/registry/json-schema` (`replaceChildSlot`) was not an `instanceof` the `RegistryError` imported from `@schema-engine/registry`.

- [#455](https://github.com/schema-engine/schema-engine/pull/455) [`42a3f6f`](https://github.com/schema-engine/schema-engine/commit/42a3f6fcd76339ad4641d77208095714be63fe36) Thanks [@andeeplus](https://github.com/andeeplus)! - `JSONSchemaEmbedder.embedDefinition` reads a `$ref` whose fragment percent-encodes the definitions keyword (`#/%24defs/title`) as the keyword, as RFC 6901 section 6 requires, so it points at the lifted definition (`#/$defs/text.title`) instead of dangling at `#/$defs/text/%24defs/title`.

## 0.5.2

### Patch Changes

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`67e2556`](https://github.com/schema-engine/schema-engine/commit/67e25562959cc0242a56a59ec8d982f6e21fc93b) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `bindRegistry(contracts, bindings)`, which builds a renderer's registry from one registry of contracts (the `$type`, schema and metadata) and one binding per `$type` (a `render` function, a tag name: renderer-only data). It is built with `createRegistry`, so the result is frozen, keeps the contracts' order, checks every schema again and shares each `schema` with the other renderers by identity. For contracts typed by literal `$type`, a missing binding, a binding for a `$type` no contract has and a binding that sets a key of its contract are compile errors, and `get('card')` returns that registration without `undefined`; for contracts typed only as `BaseRegistration` the build throws naming the kind and the `$type` (`Widget 'badge' has no binding.`, `Widget binding 'crad' names no registration.`, `Widget 'card' binding sets 'schema', which the contract defines.`). `RegistryBindings`, `BoundRegistration` and `BoundRegistry` are exported; `RegistryBindings<typeof contracts, ReactBinding>` with `satisfies` fixes the binding shape of a renderer.

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`bdff897`](https://github.com/schema-engine/schema-engine/commit/bdff897952056ea0a4033e014692f5afc78c96d0) Thanks [@andeeplus](https://github.com/andeeplus)! - Add a third argument to `createRegistry(kind, registrations, options?)`: `{ duplicates: 'override' | 'error' }`. `'override'` is the default and the behaviour until now (a later registration of a `$type` replaces the earlier one). `'error'` throws `<kind> '<$type>' is registered twice.` when a `$type` repeats, before any schema is checked, for a catalog where a repeat is always a mistake. `CreateRegistryOptions` is exported.

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`40a3d6f`](https://github.com/schema-engine/schema-engine/commit/40a3d6f8f111ebcd00cad0e72d056d5aa3710488) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `safeParseTree(registry, root, path?)`, which checks a whole document of `$type` nodes in one call. A registration says where its children are with the new optional `childPaths`, a list of key paths into the node: `childPaths: [['blocks'], ['engine', 'controls']]` means children at `node.blocks` and at `node.engine.controls`, each one node or an array of nodes. Every node goes through `safeParseNode` with its full path, so every issue is at the position it has in the document (`formatIssuePath` writes it), a node whose schema fails is not walked further but its siblings still are, a value at a child path that is no node is `Expected a node or a list of nodes.` at that path, and a node that contains itself is `A node cannot contain itself.` instead of a stack overflow. It returns `{ success: true, tree }` or `{ success: false, issues }` with all of them and no tree; a `tree` node is `{ $type, registration, data, path, children }` with `data` typed by the registration's schema output, narrowed by `$type`, and `children` keyed by the child path joined with dots. `ParsedNode` and `SafeParseTreeResult` are exported.

    `createRegistry` checks `childPaths` when it builds and throws naming the kind and the `$type` for a path that is not a non-empty list of non-empty keys , for a path declared twice, or for a path that runs through another (`[['engine'], ['engine', 'controls']]`, which would reach inside the `engine` child). `safeParseNode` is unchanged.

- [#427](https://github.com/schema-engine/schema-engine/pull/427) [`a719ba4`](https://github.com/schema-engine/schema-engine/commit/a719ba4e773cd3223bb7e4e6723e82a1006d1874) Thanks [@andeeplus](https://github.com/andeeplus)! - Type the success of `safeParseNode` by the registry's registrations. `SafeParseNodeResult` now has one success member per registration, with `data` typed as that registration's schema output (`StandardSchemaV1.InferOutput`), so a registry typed by its registrations gives `data` its real type with no cast. A registry typed as `ReadOnlyRegistry<BaseRegistration>` still gives `unknown`.

    The success also carries `$type`, the node's `$type`, because TypeScript narrows a union only by a property of the union itself: `if (parsed.success && parsed.$type === 'card')` narrows `parsed.registration` and `parsed.data` to the `card` registration, while `parsed.registration.$type === 'card'` does not narrow `parsed.data`.

    `createRegistry` now declares its type parameter `const`, so an inline list keeps the literal `$type` of each registration (`$type: 'card'`, not `string`) without `as const`.

    An existing `data as X` cast to a type unrelated to the schema output of a typed registry can now be a compile error; the cast was wrong before.

- [#415](https://github.com/schema-engine/schema-engine/pull/415) [`e1813af`](https://github.com/schema-engine/schema-engine/commit/e1813af3efa2c20e93f3a790651dc29a5115d2d0) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `safeParseNode(registry, node, path?)`, which checks one node against the registration its `$type` names without throwing. `registry` is anything whose `get(key)` returns a registration with a `schema`. It returns `{ success: true, registration, data }` or `{ success: false, issues }`, and every issue's `path` starts with the `path` you pass, so a walk over a tree reports each issue by its position in the document. A node that is not an object is `Expected an object with a string $type.` at `path`; an object without a string `$type` is `Expected a string $type.` and a `$type` no registration answers is `No registration for $type '<type>'.` followed by a space and the lookup's optional `hint`, a string such as `Register it with defineBadge.`, both at `[...path, '$type']`. `unregisteredTypeMessage(type, hint?)` writes that message, for a caller that has to throw for the same case.

    Add `standardSchema(validate)`, which builds a Standard Schema from a function that returns `{ value }` or `{ issues }`, for a registration whose check is not a schema library's.

    Add `formatIssuePath(path, source?)`, which writes the `path` of an issue as text: keys joined by dots, indexes in brackets (`children[1].label`), and the empty string for a missing or empty path. A segment may be a key or a Standard Schema `{ key }` object. Given the document as `source`, an array item with a string `id` is followed by it: `children[1] (hero).label`.

- [#429](https://github.com/schema-engine/schema-engine/pull/429) [`46a3f34`](https://github.com/schema-engine/schema-engine/commit/46a3f34fc66d99468d776c98e0352274c41bed75) Thanks [@andeeplus](https://github.com/andeeplus)! - `standardSchema` takes a second type parameter for the input the schema accepts, `standardSchema<TOutput, TInput = unknown>(validate)`, so a hand-written Standard Schema can state its authoring type. It only types the schema: `validate` still receives `unknown`, and every existing `standardSchema<TOutput>` call is unchanged.

## 0.5.1

### Patch Changes

- [#396](https://github.com/schema-engine/schema-engine/pull/396) [`2b4943d`](https://github.com/schema-engine/schema-engine/commit/2b4943d205b8202767819ce98c1cd575ddc45b39) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the `typescript` peer dependency. JavaScript projects no longer install TypeScript with Schema Engine, and TypeScript 6 and later no longer warn.
