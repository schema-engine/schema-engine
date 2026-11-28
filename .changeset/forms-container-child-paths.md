---
'@schema-engine/forms': minor
---

Containers declare their children with `childPaths`, and forms checks an element tree with the registry's `safeParseTree`. An element that holds `elements` adds `childPaths: [{ keys: ['elements'] }]` to its registration. Add `accepts: ['tab']` to limit which elements it takes: an element outside the list is a `registry/not-accepted` issue at its `$type`. The schema still declares `elements`.

- `containerKind` only says how the children make the value (`'object'` or `'array'`), so a container written with a Valibot or a hand-written schema declares `childPaths` as well, and `containerKind` without `childPaths` throws when the engine is built (and is a type error). `value` is required exactly when there is no `childPaths`, for a schema of any Standard Schema library: a container that declares one throws.
- Only an input can be a container, and only under `elements`. `createFormEngine` throws for a `static` element with `childPaths`, and for any other key or more than one path. In a form, an element without `childPaths` that holds `elements` is an issue at its `elements` key (`Element 'note' declares no child path, so it cannot hold elements.`); its children are not checked.
- A schema that declares `elements` and a registration without `childPaths` no longer compiles. The error names `elementsWithoutChildPaths` and the `$type`.
- Children are checked as the author wrote them, with the registry's rules. A container schema that drops, renames or resizes `elements`, or defaults it to a list that holds elements, now throws `RegistryError` with the code `'schema-breaks-child-path'`, and a transform that reorders the children is ignored: issues and the normalized form keep the authored order. A schema still never sees an element's `appearance`, which the engine resolves and writes back, so a strict schema supports axes.
- The default `fieldSet` and `arrayElements` contracts, and the elements of Forms React and Forms Radiant that spread them, declare `childPaths` already. A copied shadcn fieldset or array item spreads its contract and needs no change. A custom widget built on `ArrayElementConfigSchema` or `FieldSetConfigSchema` adds `childPaths`.
- `ElementChildPaths` is exported as a type.
- A form's issues for the elements of one top-level element come in two passes: those of the schemas first, then the checks forms adds (names, rules, grid, appearance), which run only on a tree whose every schema passed. A grid or rule issue in one child no longer appears beside a schema issue in another child of the same top-level container.

```ts
// before
defineInput({ $type: 'group', schema: GroupSchema /* declares elements */, metadata, render: Group });
defineInput({ $type: 'v-group', schema: valibotGroup, containerKind: 'object', metadata, render });

// after
defineInput({ $type: 'group', schema: GroupSchema, childPaths: [{ keys: ['elements'] }], metadata, render: Group });
defineInput({
	$type: 'tabs',
	schema: TabsSchema,
	childPaths: [{ keys: ['elements'], accepts: ['tab'] }],
	metadata,
	render: Tabs,
});
defineInput({ $type: 'v-group', schema: valibotGroup, childPaths: [{ keys: ['elements'] }], metadata, render });
```
