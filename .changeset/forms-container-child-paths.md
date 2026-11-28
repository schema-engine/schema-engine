---
'@schema-engine/forms': minor
---

Containers declare their children with `childPaths`, and forms checks an element tree with the registry's `safeParseTree`. An element that holds `elements` adds `childPaths: [{ keys: ['elements'] }]` to its registration. Add `accepts: ['tab']` to limit which elements it takes: an element outside the list is a `registry/not-accepted` issue at its `$type`. The schema still declares `elements`.

- `containerKind` only says how the children make the value (`'object'` or `'array'`), so a container written with a Valibot or a hand-written schema declares `childPaths` as well, and `containerKind` without `childPaths` throws when the engine is built (and is a type error). `value` is required exactly when there is no `childPaths`, for a schema of any Standard Schema library: a container that declares one throws.
- Only an input can be a container, and only under `elements`. `childPaths: undefined` is no declaration: the input still declares `value`. `createFormEngine` throws for a `static` element with `childPaths`, and for any other key or more than one path. In a form, an element without `childPaths` that holds `elements` is an issue at its `elements` key (`Element 'note' declares no child path, so it cannot hold elements.`); its children are not checked, and its other checks (rules, name, grid, appearance) still run. No step check sees them either: the retained config of such an element has no `elements`.
- A schema that declares `elements` and a registration without `childPaths` no longer compiles. The error names `elementsWithoutChildPaths` and the `$type`.
- Children are checked as the author wrote them, with the registry's rules. A container schema that drops, renames or resizes `elements`, or defaults it to a list that holds elements, now throws `RegistryError` with the code `'schema-breaks-child-path'`, and a transform that reorders the children is ignored: issues and the normalized form keep the authored order. A schema still never sees an element's `appearance`, which the engine resolves and writes back, so a strict schema supports axes.
- The default `fieldSet` and `arrayElements` contracts, and the elements of Forms React and Forms Radiant that spread them, declare `childPaths` already. A copied shadcn fieldset or array item spreads its contract and needs no change. A custom widget built on `ArrayElementConfigSchema` or `FieldSetConfigSchema` adds `childPaths`.
- `ElementChildPaths` is exported as a type.
- A form's issues are reported in one pass. Forms' checks (names, rules, grid, appearance) run on every element whose own schema passed, even when another element in the same container failed, and a node whose own check fails still has its children checked. The order for a top-level element is the registry's issues first, then forms', parent before children, in document order. The step checks see the same elements: an element with an issue still counts for grid placement, payload key collisions and the fields a later step's constraint may read. A top-level element that is not an object, or has no `$type`, is now an issue of that element (`registry/not-an-object` at the element, `registry/missing-type` at its `$type`) beside the issues of every other element, instead of an envelope issue that stopped the form, and a cycle is reported at its first repeat. The same holds for actions: an entry of `actions` (the form's or a step's) with no registered `$type`, an empty one included, is that entry's issue, and no longer an envelope issue that stopped every other check.
- An element whose schema drops or changes its `$type`, or returns something that is not an object, now throws `RegistryError` with the code `'schema-changes-type'` instead of being a document issue.
- A static element cannot be a container: a static layout element that holds `elements` becomes `defineInput` with `childPaths`, and `defineStatic` with a schema that declares `elements` does not compile (`elementsWithoutChildPaths`). Children that a schema adds to an element that declares no `childPaths` (a default, say) are the same issue at its `elements` key, and are never branded as checked.

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
