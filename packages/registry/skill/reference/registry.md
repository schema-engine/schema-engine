# @schema-engine/registry

The registration contract and the read-only registry every other package builds on, and the YAML subpath for documents authored as text. The terms are defined in the router (`SKILL.md`). How the forms engine registers elements, recipes, actions and rules is in `forms.md`.

## A registration

Every registration is `{ $type, schema, metadata }`: `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`. A package adds what it needs to the type (`BaseRegistration`; a component's metadata, `ComponentMetadata`, adds optional `icon`, `tags` and `version`): a renderable one is a `ComponentRegistration` with `render`, an action adds `execute`, a validation rule adds `category` and `handler`. The registry has no schema-library dependency: install the provider you prefer.

## createRegistry

`createRegistry(kind, registrations, options?)` builds a frozen registry once, from a list. `kind` is the label in errors.

```ts title="registry/widgets.ts"
import * as z from 'zod/mini';
import { createRegistry, type BaseRegistration } from '@schema-engine/registry';

const defaults: BaseRegistration[] = [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
	{ $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } },
];

const custom: BaseRegistration = {
	$type: 'card',
	schema: z.object({ title: z.string(), tone: z.string() }),
	metadata: { name: 'Tonal card' },
};

export const widgets = createRegistry('Widget', [...defaults, custom]);
```

- A later registration with the same `$type` replaces the earlier one with no warning, so `[...defaults, custom]` is how you override. The key keeps its first position.
- `createRegistry(kind, registrations, { duplicates: 'error' })` makes a repeated `$type` a build error instead (`Widget 'card' is registered twice.`, thrown before any schema is checked). Use it for a catalog where a repeat is always a mistake, such as component keys; the default is `'override'`.
- Each winning `schema` is checked at build: a value without `~standard.validate` throws a `RegistryError` with code `'invalid-schema'`, naming the `kind` and the `$type`.
- The result has `get`, `has`, `all`, `keys` and `size`, and no `register` or `clear`. It holds a frozen shallow copy of each winner taken at build, so patch a registration before building, or build a new registry from a new list.
- Type it with `ReadOnlyRegistry<TRegistration>`.

`bindRegistry(contracts, bindings)` builds a renderer's registry from one registry of contracts (the `$type`, schema and metadata) and one binding per `$type` (a `render`, a tag name: renderer-only data). Two renderers bind the same contracts and share each `schema` by identity:

```ts title="registry/bound-widgets.ts"
import * as z from 'zod/mini';
import { bindRegistry, createRegistry } from '@schema-engine/registry';

const contracts = createRegistry('Widget', [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
	{ $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } },
]);

export const reactWidgets = bindRegistry(contracts, {
	card: { render: (props: { title: string }) => `<h1>${props.title}</h1>` },
	badge: { render: (props: { label: string }) => `<b>${props.label}</b>` },
});

export const radiantWidgets = bindRegistry(contracts, {
	card: { tag: 'se-card' },
	badge: { tag: 'se-badge' },
});
```

- The result is a `BoundRegistry`, a frozen registry built with `createRegistry`: the contracts' order, every schema checked again. For contracts typed by literal `$type` (an inline list), `get('card')` returns that registration (a `BoundRegistration`, the contract with its binding) without `undefined`, and a missing binding, an extra one (`crad`) and a binding that sets a contract key (`schema`, `metadata`) are compile errors. `RegistryBindings<typeof contracts, ReactBinding>` with `satisfies` fixes the shape every binding of a renderer takes.
- Whatever the typing, the build throws a `RegistryError` (codes `'missing-binding'`, `'unknown-binding'` and `'binding-overrides-contract'`) naming the `kind`: `Widget 'badge' has no binding.`, `Widget binding 'crad' names no registration.` and `Widget 'card' binding sets 'schema', which the contract defines.`

Errors while building or binding, and a tree parse whose schema contradicts its registration, are a `RegistryError` (`error.code` of type `RegistryErrorCode`, always with `$type`, and `kind` unless a parse went through a lookup that is no registry). Branch on the code, not on the message, which may be reworded:

- `'invalid-schema'`: a `schema` without `~standard.validate`.
- `'invalid-child-paths'`: `childPaths` is not a list, or an entry is not `{ keys, accepts? }` (another property such as `accept`, empty or non-string `keys`, an empty `accepts`, a name that is empty or listed twice).
- `'duplicate-child-path'`: the same child path (`childPath`, the same keys) twice. `'nested-child-path'`: a child path (`childPath`) that runs through another (`outerChildPath`).
- `'duplicate-type'`: a repeated `$type` with `duplicates: 'error'`.
- `'unknown-binding'`: a binding key no contract answers (`$type` is that key). `'missing-binding'`: a contract with no binding. `'binding-overrides-contract'`: a binding that sets a key (`key`) its contract defines.
- `'unreachable-child-path'` (`childPath`): `exportTreeSchema` found no slot for a child path in a registration's JSON Schema. `'unknown-accepted-type'` (`childPath`, `key`): a child path accepts a `$type` the lookup lacks. `'definition-name-clash'` (`key`): a definition a schema brought along takes the name of a `$type`.
- `'schema-changes-type'` and `'schema-breaks-child-path'` (`childPath`): `safeParseTree` parsed a node whose schema returned an output without the node's own `$type`, or that does not keep a child path as the document has it. They are bugs of the registration, never issues of the document.

`assertStandardSchema` on its own and errors while parsing (`safeParseStandardSchema` and `safeParseNode` with an asynchronous schema) are plain `Error`s, and `parseYaml` throws `YamlDocumentError`.

`safeParseStandardSchema(schema, value)` runs a registration's schema without throwing and returns `{ success: true, data }` or `{ success: false, error: { issues } }` (it throws for a schema that validates asynchronously). Form validation and `parseActions` both go through it; `assertStandardSchema` is the build-time check on its own. `standardSchema(validate)` builds a Standard Schema from a function that returns `{ value }` or `{ issues }`, for a registration whose check is not a schema library's.

`safeParseNode(registry, node, options?)` checks one node of a document: it looks `node.$type` up in the registry (anything with `get(key)`, and optionally `hint`, a sentence added to the message of an unregistered `$type`, such as where to register it), validates the node with the registration's schema and returns `{ success: true, $type, registration, data }` or `{ success: false, issues }`. For a registry typed by its registrations (`createRegistry` keeps the literal `$type` of an inline list), checking `parsed.$type` narrows `registration` and `data` to that registration's schema output with no cast; `data` is `unknown` for a registry typed as `BaseRegistration`. A node that is not an object with a string `$type`, and a `$type` no registration answers, are issues, not throws; the second reads `No registration for $type '<type>'.` and then the hint, and `unregisteredTypeMessage(type, hint?)` writes the same text for a caller that throws instead. Every issue's `path` starts with `options.path`, the position of the node in its document, so a walk over a tree passes each child its own. `options.accepts` is a non-empty list of the `$type`s the node may have: another `$type` is the issue `registry/not-accepted` (with `expected` and `received`), checked before the lookup. The issues the engine creates carry a namespaced `code`: `registry/not-an-object`, `registry/missing-type`, `registry/unregistered-type`, `registry/not-accepted`, `registry/not-a-node` and `registry/contains-itself`; an issue from a schema is its library's own.

```ts title="registry/draw-node.ts"
import { formatIssuePath, safeParseNode } from '@schema-engine/registry';
import { widgets } from './widgets';

export function nodeIssues(node: unknown, index: number): string[] {
	const parsed = safeParseNode(widgets, node, { path: ['children', index] });
	return parsed.success ? [] : parsed.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`);
}
```

`safeParseTree(registry, root, options?)` checks a whole document in one call. A registration says where its children are with `childPaths`, a list of `{ keys, accepts? }`: `keys` is the list of keys from the node to the slot (`['sections']`, or `['engine', 'controls']`), relative and without indexes, and `accepts` is a closed, non-empty list of the `$type`s allowed there (leave it out and the slot puts no limit on the `$type`). The slot holds one node or an array of nodes. Keep the slot opaque in the parent's schema (`z.array(z.unknown())`) and declare every child key there: `accepts` is the only way to restrict a slot, and `createRegistry` fails to compile a child path whose key the schema output does not declare. `options.accepts` restricts the root and `options.path` is where it sits in a larger document. Every node goes through `safeParseNode` at its full path and the `accepts` of its position, a node whose schema fails is not walked further but its siblings still are, a value at a child path that is no node (`null`, a primitive) is `registry/not-a-node` at that path, and a node that contains itself is `registry/contains-itself`, not an overflow. It returns `{ success: true, tree }` or `{ success: false, issues, tree? }` with every issue and the nodes that parsed. `tree.data` is the parsed document, typed per child path, with defaults and transforms of every level applied; a `tree` node is a `ParsedNode`, `{ $type, registration, data, path, children }`, whose `data` is that node's composed data and whose `children` is a list of `{ keys, nodes }`, one per declared path in declaration order (find one with `children.find(({ keys }) => ...)`, never by index). On failure, `tree` is a `PartialNode` when the root's own schema passed (absent when the root failed): every node whose own schema passed and whose parent was kept, `{ $type, registration, output, path, children }`, with `output` the node's own schema output and no `data` (reading `tree.data` there is a type error). A failed node is left out and not walked, as are a rejected `accepts` and a cycle edge; `children` keeps one `{ keys, nodes }` per path with the kept children in document order, each with its own `path`. Read children from `children`, never from a slot of `output`, which holds what the document had there. The parent schema must keep `$type` and the slot the way the document has it, or `safeParseTree` throws a `RegistryError`. The root narrows from a literal `accepts`. Two registries in one parse go through one lookup: `{ get: (type) => a.get(type) ?? b.get(type) }`, and the first that answers wins.

```ts title="registry/check-tree.ts"
import * as z from 'zod/mini';
import { createRegistry, formatIssuePath, safeParseTree } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export function documentIssues(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document, { accepts: ['page'] });
	return parsed.success
		? []
		: parsed.issues.map((issue) => `${formatIssuePath(issue.path, document)}: ${issue.message}`);
}

export function sectionTitles(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document, { accepts: ['page'] });
	return parsed.success ? parsed.tree.data.sections.map((section) => section.title) : [];
}
```

`formatIssuePath(path, source?)` writes the `path` of an issue as text: keys joined by dots and indexes in brackets (`children[1].label`), the empty string for a missing or empty path. A segment may be a key or a Standard Schema `{ key }` object. Given the document as `source`, an array item with a string `id` is followed by it, `children[1] (hero).label`.

`exportTreeSchema(lookup, options?)` writes the JSON Schema of the whole tree, composed at the JSON Schema level so it does not depend on the validator. `lookup` is a registry (anything with `all()`) or a list of registries, the first winning a `$type` both list. It returns `{ $schema, $defs, anyOf }`: one definition per `$type` under `$defs` (`definitions` for target `'draft-07'`), referred to by `#/$defs/<$type>` with `~` and `/` escaped as `~0` and `~1`, and the root as the union of `options.accepts`, or of every `$type`. Each schema is read by `options.resolve(schema, { io, target })`, by default its `~standard.jsonSchema`, and a schema it returns `undefined` for is listed by an open object that holds its `$type` and its child paths. `options.io` is `'input'` (the authored shape, the default) or `'output'`, and `options.target` the dialect: `'draft-2020-12'` (the default) or `'draft-07'`, and any other target (`'openapi-3.0'`, a misspelling, Zod's older spelling of draft-07) throws an `Error` before a schema is read. `JSONSchemaTarget`, the closed set of the Standard JSON Schema names `'draft-2020-12'`, `'draft-07'`, `'draft-04'` and `'openapi-3.0'`, is exported from the root. Each child path is then replaced, and only its slot, so `required`, `minItems`, `maxItems` and sibling keys stay: an array slot gets `items: U`, an object slot becomes `U`, an open slot (`{}`) becomes `{ anyOf: [U, { type: 'array', items: U }] }`, where `U` is `{ anyOf: [{ $ref }, ...] }` of the path's `accepts`, or of every `$type` without it. A slot behind `allOf`, a `$ref` or a union, inside a schema with an `$id` of its own, or one a schema does not declare, throws `RegistryError` `'unreachable-child-path'`. Definitions a schema wrote into its own `$defs` are lifted to the top as `<$type>.<name>` and their pointers follow; a `$type` with that name throws `'definition-name-clash'`. `@schema-engine/registry/json-schema` holds the pieces for code that writes JSON Schema itself: `readStandardJSONSchema(schema)` returns a schema's `~standard.jsonSchema` converter or `undefined` (what the default `resolve` reads, so a custom `resolve` can fall back to it: `readStandardJSONSchema(schema)?.[io]({ target })`), `createJSONSchemaEmbedder(target, placement)` embeds schemas written as documents of their own into one being written, as the forms export does (it takes a `JSONSchemaTarget` and throws for any other string), `assertJSONSchemaTarget(target)` throws unless a string is a `JSONSchemaTarget` and narrows it to one (for the open `target` of a Standard JSON Schema converter's options), and `replaceChildSlot(definition, { $type, keys }, union)` replaces, in place, the slot a child path names in a registration's JSON Schema, which is the step `exportTreeSchema` takes per child path (an unreachable slot throws `RegistryError` `'unreachable-child-path'`). A registry user needs only `exportTreeSchema`.

```ts title="registry/export-tree.ts"
import * as z from 'zod/mini';
import { createRegistry, exportTreeSchema } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export const documentSchema = exportTreeSchema(nodes, {
	accepts: ['page'],
	resolve: (schema, { io, target }) =>
		schema instanceof z.core.$ZodType ? z.toJSONSchema(schema, { io, target }) : undefined,
});
```

## createMutableRegistry

`createRegistry` and `createMutableRegistry` take `{ hint }`: the sentence that ends the message of an unregistered `$type`, exposed as the registry's optional `hint`, so a registry is a `NodeLookup` with its hint (`parseActions` and `safeParseNode` report it). `createMutableRegistry<MyRegistration>('Plugin')` is the mutable opt-in for registrations that arrive at runtime, such as a plugin system. It returns a `MutableRegistry`: the read side of a `createRegistry` result (`get`, `has`, `all`, `keys`, `size`, `kind`) plus `register` and `clear`, so either kind goes wherever a registry is read. `register` checks a registration as `createRegistry` does (`RegistryError` `'invalid-schema'`, `'invalid-child-paths'`), a repeated `$type` replaces the earlier one and keeps its position (or throws `'duplicate-type'` with `{ duplicates: 'error' }`), and nothing is logged. `all()` and `keys()` return the same frozen array until the next change. A function that finds a registration takes a `NodeLookup`, one that lists them takes an `ExportLookup`, and a registry of either kind is both. Use `createRegistry` unless the list is not known when the registry is built.

## YAML documents

`@schema-engine/registry/yaml` parses a YAML text, validates the value and points each issue at a line and column. It needs the optional peer `yaml`, which the root entry never imports. `validate` is a synchronous `YamlValidate<T>`: the value in, `{ success: true, data }` or `{ success: false, issues }` out, each issue `{ message, path? }`. `engine.safeValidateForm` from `@schema-engine/forms` fits as it is.

```ts title="registry/site-yaml.ts"
import * as z from 'zod/mini';
import { safeParseStandardSchema } from '@schema-engine/registry';
import { safeParseYaml, type YamlValidate } from '@schema-engine/registry/yaml';

const SiteSchema = z.object({ title: z.string(), port: z.number() });

const validateSite: YamlValidate<z.output<typeof SiteSchema>> = (value) => {
	const result = safeParseStandardSchema(SiteSchema, value);
	return result.success ? result : { success: false, issues: result.error.issues };
};

export function readSite(text: string) {
	return safeParseYaml(text, validateSite, { filename: 'site.yaml' });
}
```

`parseYaml` throws a `YamlDocumentError` (with `issues`) instead of returning, and `stringifyYaml(value, { schemaUrl? })` writes a value back. A `YamlIssue` is `{ message, path, line, column, filename? }`, counted from 1. The text is YAML 1.2 (core schema): `yes` and `no` stay strings, tags are issues, and duplicate keys and several documents are syntax errors.
