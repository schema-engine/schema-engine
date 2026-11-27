# @schema-engine/registry

The registration contract and the read-only registry every other package builds on, and the YAML subpath for documents authored as text. The terms are defined in the router (`SKILL.md`). How the forms engine registers elements, recipes, actions and rules is in `forms.md`.

## A registration

Every registration is `{ $type, schema, metadata }`: `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`. A package adds what it needs to the type (`BaseRegistration`): a renderable one is a `ComponentRegistration` with `render`, an action adds `execute`, a validation rule adds `category` and `handler`. The registry has no schema-library dependency: install the provider you prefer.

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

- The result is a frozen registry built with `createRegistry`: the contracts' order, every schema checked again. For contracts typed by literal `$type` (an inline list), `get('card')` returns that registration without `undefined`, and a missing binding, an extra one (`crad`) and a binding that sets a contract key (`schema`, `metadata`) are compile errors. `RegistryBindings<typeof contracts, ReactBinding>` with `satisfies` fixes the shape every binding of a renderer takes.
- Whatever the typing, the build throws a `RegistryError` (codes `'missing-binding'`, `'unknown-binding'` and `'binding-overrides-contract'`) naming the `kind`: `Widget 'badge' has no binding.`, `Widget binding 'crad' names no registration.` and `Widget 'card' binding sets 'schema', which the contract defines.`

Errors while building or binding are a `RegistryError` (`error.code` of type `RegistryErrorCode`, always with `kind` and `$type`). Branch on the code, not on the message, which may be reworded:

- `'invalid-schema'`: a `schema` without `~standard.validate`.
- `'invalid-child-paths'`: `childPaths` is not a list, or an entry is not a non-empty list of non-empty keys.
- `'duplicate-child-path'`: the same child path (`childPath`) twice. `'nested-child-path'`: a child path (`childPath`) that runs through another (`outerChildPath`).
- `'duplicate-type'`: a repeated `$type` with `duplicates: 'error'`.
- `'unknown-binding'`: a binding key no contract answers (`$type` is that key). `'missing-binding'`: a contract with no binding. `'binding-overrides-contract'`: a binding that sets a key (`key`) its contract defines.

`assertStandardSchema` on its own and errors while parsing (`safeParseStandardSchema` and `safeParseNode` with an asynchronous schema) are plain `Error`s, and `parseYaml` throws `YamlDocumentError`.

`safeParseStandardSchema(schema, value)` runs a registration's schema without throwing and returns `{ success: true, data }` or `{ success: false, error: { issues } }` (it throws for a schema that validates asynchronously). Form validation and `parseActions` both go through it; `assertStandardSchema` is the build-time check on its own. `standardSchema(validate)` builds a Standard Schema from a function that returns `{ value }` or `{ issues }`, for a registration whose check is not a schema library's.

`safeParseNode(registry, node, path?)` checks one node of a document: it looks `node.$type` up in the registry (anything with `get(key)`, and optionally `hint`, a sentence added to the message of an unregistered `$type`, such as where to register it), validates the node with the registration's schema and returns `{ success: true, $type, registration, data }` or `{ success: false, issues }`. For a registry typed by its registrations (`createRegistry` keeps the literal `$type` of an inline list), checking `parsed.$type` narrows `registration` and `data` to that registration's schema output with no cast; `data` is `unknown` for a registry typed as `BaseRegistration`. A node that is not an object with a string `$type`, and a `$type` no registration answers, are issues, not throws. Every issue's `path` starts with `path`, the position of the node in its document, so a walk over a tree passes each child its own.

```ts title="registry/draw-node.ts"
import { formatIssuePath, safeParseNode } from '@schema-engine/registry';
import { widgets } from './widgets';

export function nodeIssues(node: unknown, index: number): string[] {
	const parsed = safeParseNode(widgets, node, ['children', index]);
	return parsed.success ? [] : parsed.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`);
}
```

`safeParseTree(registry, root, path?)` checks a whole document in one call. A registration says where its children are with `childPaths`, a list of key paths into the node (`[['sections']]`, or `[['blocks'], ['engine', 'controls']]`), each to one node or an array of nodes; `createRegistry` checks the paths when it builds. Every node goes through `safeParseNode` at its full path, a node whose schema fails is not walked further but its siblings still are, a value at a child path that is no node is `Expected a node or a list of nodes.` at that path, and a node that contains itself is an issue, not an overflow. It returns `{ success: true, tree }` or `{ success: false, issues }` with every issue and no tree. A `tree` node is `{ $type, registration, data, path, children }`, with `children` keyed by the child path joined with dots (`'engine.controls'`); checking `$type` narrows `data` as it does on `safeParseNode`.

```ts title="registry/check-tree.ts"
import * as z from 'zod/mini';
import { createRegistry, formatIssuePath, safeParseTree } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.looseObject({ $type: z.literal('page'), sections: z.array(z.looseObject({ $type: z.string() })) }),
		metadata: { name: 'Page' },
		childPaths: [['sections']],
	},
	{
		$type: 'section',
		schema: z.looseObject({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export function documentIssues(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document);
	return parsed.success
		? []
		: parsed.issues.map((issue) => `${formatIssuePath(issue.path, document)}: ${issue.message}`);
}

export function sectionTitles(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document);
	const sections = parsed.success ? [parsed.tree.children.sections ?? []].flat() : [];
	return sections.flatMap((section) => (section.$type === 'section' ? [section.data.title] : []));
}
```

`formatIssuePath(path, source?)` writes the `path` of an issue as text: keys joined by dots and indexes in brackets (`children[1].label`), the empty string for a missing or empty path. A segment may be a key or a Standard Schema `{ key }` object. Given the document as `source`, an array item with a string `id` is followed by it, `children[1] (hero).label`.

## BaseRegistry

`BaseRegistry` is the mutable opt-in for registrations that arrive at runtime, such as a plugin system: `register`, `has`, `get`, `getAll`, `getAllKeys`, `size` and `clear`. It warns when `register` overrides a key and does not check schemas. Use `createRegistry` unless the list is not known when the registry is built.

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
