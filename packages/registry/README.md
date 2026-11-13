# @schema-engine/registry

Shared registry primitives for building typed registration systems across the Schema Engine workspace.

This package provides one registry mechanism for typed registrations keyed by `$type`:

- `createRegistry(kind, registrations)` builds a read-only, frozen registry from a list. The forms engine stores its elements, recipes, actions and validation rules with it, and `@schema-engine/actions` builds `ActionRegistry` on it. `ValidationRegistry` in `@schema-engine/forms` is a read-only registry of this kind with a few validation lookups added; it has no `register`.
- `BaseRegistry` is the mutable opt-in for runtime plugin systems that register after construction.
- The `@schema-engine/registry/yaml` subpath parses YAML documents and validates them with errors that point at a line of the file; see [YAML documents](#yaml-documents-schema-engineregistryyaml).

Use the `ComponentRegistration` type when entries must include a render function.

It is used by higher-level packages such as `@schema-engine/forms`, `@schema-engine/actions` and `@schema-engine/layout` (which stores appearance axes in it), but it is also usable on its own for plugin systems and internal extension points.

## Installation

```bash
pnpm add @schema-engine/registry
```

## Core Types

The registry itself has no schema-library dependency. Install the Standard Schema provider your application prefers; the examples below use `zod/mini` and therefore require the `zod` package in the consuming application.

### `BaseRegistration`

Every registry entry must provide:

- `$type`: stable key used inside the registry
- `schema`: [Standard Schema](https://standardschema.dev/) (`StandardSchemaV1`) for config validation and inference
- `metadata`: display metadata such as `name` and `description`

```typescript
import * as z from 'zod/mini';
import type { BaseRegistration } from '@schema-engine/registry';

interface FeatureRegistration extends BaseRegistration {
	$type: string;
	execute: () => void;
}
```

### `ComponentRegistration`

For visual or renderable registrations, use `ComponentRegistration`.

```typescript
import type { ComponentRegistration } from '@schema-engine/registry';

type WidgetRegistration = ComponentRegistration<string, { title: string }, { id: string }>;
```

## Using `createRegistry`

`createRegistry(kind, registrations)` builds a registry once, from a list.

```typescript
import * as z from 'zod/mini';
import { createRegistry } from '@schema-engine/registry';
import type { BaseRegistration } from '@schema-engine/registry';

const defaults: BaseRegistration[] = [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
];
const custom: BaseRegistration = {
	$type: 'card',
	schema: z.object({ title: z.string(), tone: z.string() }),
	metadata: { name: 'Tonal Card' },
};

const widgets = createRegistry('Widget', [...defaults, custom]);

widgets.get('card')?.metadata.name; // 'Tonal Card'
widgets.has('card');
widgets.all();
widgets.keys();
widgets.size;
```

- Last wins, silently: a later registration with the same `$type` replaces the earlier one, so `[...defaults, custom]` is how you override. The key keeps its first position.
- Each winning `schema` is checked at build; an overridden registration is not checked. A value without `~standard.validate` throws `Widget 'card' schema must implement Standard Schema (~standard.validate).`, naming the `kind` and the `$type`.
- The result is frozen and has no `register` or `clear`. `all()` and `keys()` return frozen arrays, and each stored registration is a frozen shallow copy of the winner. The copy is a snapshot taken at build: the objects you passed stay untouched, but assigning to them or spying on their methods afterwards does not reach the registry, so patch or spy before building, or build a new registry. Nested values such as `schema` are shared with the original. Build a new registry from a new list to change the contents.
- Type the result with `ReadOnlyRegistry<TRegistration>`.

`assertStandardSchema(schema, context)` is exported for code that needs the same check outside a registry.

## Using `BaseRegistry` (mutable opt-in)

Extend `BaseRegistry` only when registrations arrive at runtime, for example a plugin system. It is mutable, warns when `register` overrides a key, and does not check schemas.

```typescript
import * as z from 'zod/mini';
import { BaseRegistry } from '@schema-engine/registry';
import type { BaseRegistration } from '@schema-engine/registry';

interface PluginRegistration extends BaseRegistration {
	$type: string;
	execute: () => Promise<void>;
}

class PluginRegistry extends BaseRegistry<string, PluginRegistration> {
	get registryName(): string {
		return 'PluginRegistry';
	}
}

const registry = new PluginRegistry();

registry.register({
	$type: 'sync-cache',
	schema: z.strictObject({ enabled: z.boolean() }),
	metadata: {
		name: 'Sync Cache',
		description: 'Synchronizes cached content',
	},
	execute: async () => {
		return;
	},
});

const plugin = registry.get('sync-cache');
await plugin?.execute();
```

Available operations:

- `register(item)`
- `has(key)`
- `get(key)`
- `getAll()`
- `getAllKeys()`
- `size`
- `clear()`

## Storing renderable registrations

`createRegistry` and `BaseRegistry` both accept the `ComponentRegistration` type when registrations must include a `render` function. This example uses the mutable `BaseRegistry`.

```typescript
import * as z from 'zod/mini';
import { BaseRegistry } from '@schema-engine/registry';
import type { ComponentRegistration } from '@schema-engine/registry';

type WidgetRegistration = ComponentRegistration<string, { title: string }, { id: string }>;

class WidgetRegistry extends BaseRegistry<string, WidgetRegistration> {
	get registryName(): string {
		return 'WidgetRegistry';
	}
}

const widgets = new WidgetRegistry();

widgets.register({
	$type: 'card',
	schema: z.strictObject({ title: z.string() }),
	metadata: {
		name: 'Card Widget',
	},
	render: ({ id }) => ({ id }),
});
```

## YAML documents (`@schema-engine/registry/yaml`)

Schema Engine documents are plain data, so they can be authored in YAML. The `./yaml` subpath parses a YAML file, validates the value with any validator that reports Standard Schema issues, and points each issue at a line and column of the file. Forms is the first consumer; any domain built on this package can use the same three steps.

Install the optional peer dependency `yaml` (eemeli/yaml, 2.x) in the application that imports the subpath:

```bash
pnpm add yaml
```

The root entry `@schema-engine/registry` never imports `yaml`, so an application that does not import the subpath does not need it installed and does not bundle it. The subpath has no `node:` imports and runs in Node, Bun, Deno and the browser.

```typescript
import * as z from 'zod';
import { YamlDocumentError, parseYaml, safeParseYaml } from '@schema-engine/registry/yaml';
import type { YamlValidate } from '@schema-engine/registry/yaml';

const siteSchema = z.object({ title: z.string(), port: z.number() });

/** Wraps a synchronous Standard Schema as a validate function. */
function validateWith<T>(schema: z.ZodType<T>): YamlValidate<T> {
	return (value) => {
		const result = schema['~standard'].validate(value);
		if (result instanceof Promise) {
			throw new TypeError('Async schemas are not supported');
		}
		return result.issues ? { success: false, issues: result.issues } : { success: true, data: result.value as T };
	};
}

const text = ['title: Docs', 'port: eighty', ''].join('\n');

try {
	parseYaml(text, validateWith(siteSchema), { filename: 'site.yaml' });
} catch (error) {
	if (error instanceof YamlDocumentError) {
		console.error(error.message); // site.yaml:2:7 port: Invalid input: expected number, received string
		error.issues[0]; // { message, path: ['port'], line: 2, column: 7, filename: 'site.yaml' }
	}
}

const result = safeParseYaml(text, validateWith(siteSchema));
if (!result.success) {
	for (const issue of result.issues) {
		console.error(`${issue.line}:${issue.column} ${issue.message}`);
	}
}
```

- `parseYaml(text, validate, { filename? })` returns the data `validate` produced, or throws a `YamlDocumentError` whose `issues` are `YamlIssue[]`. `safeParseYaml` returns `{ success: true, data }` or `{ success: false, issues }` instead of throwing.
- `validate` is `YamlValidate<T>`: a synchronous function from the parsed value to `{ success: true, data }` or `{ success: false, issues }`, where each issue is `{ message, path? }`. `engine.safeValidateForm` from `@schema-engine/forms` fits as it is. For a Standard Schema, wrap `~standard.validate` as above. Path segments may be keys or `{ key }`, as Standard Schema allows.
- A `YamlIssue` is `{ message, path, line, column, filename? }`; line and column count from 1. A validation issue points at the start of the value its `path` names, or at the nearest ancestor that exists when the document lacks the key. A syntax error has an empty `path`; `validate` is not called when the text does not parse.
- The text is read as YAML 1.2 with the core schema, one document per text. Duplicate keys and multiple documents are syntax errors.
- `stringifyYaml(value, { schemaUrl? })` writes a value as YAML: a short map of scalars under a key in flow style (`grid: { width: half }`), every other collection in block style, and lines are not folded. `schemaUrl` adds a `# yaml-language-server: $schema=<url>` header that editors use for completion.

### Caveats

- `no`, `yes`, `on` and `off` are strings in YAML 1.2 and stay strings here. A YAML 1.1 reader, such as PyYAML or an older editor plugin, reads them as booleans, and `stringifyYaml` does not quote them.
- An unquoted `1.10` is the number `1.1` in every YAML version. Only quoting keeps it a string: write `version: "1.10"`. `stringifyYaml` quotes such strings for you.
- There is no loader, plugin or CLI, no multi-document files and no includes across files. Anchors and aliases work inside one file.

## Package Exports

```typescript
export * from '@schema-engine/registry';
```

Main exports:

- `createRegistry`, `assertStandardSchema`, `ReadOnlyRegistry`
- `BaseRegistry` (mutable)
- `BaseRegistration`
- `ComponentRegistration`
- `ComponentMetadata`
- `RegistrationMetadata`
- `Brand`

The `@schema-engine/registry/yaml` subpath exports `parseYaml`, `safeParseYaml`, `stringifyYaml`, `YamlDocumentError`, and the types `YamlIssue`, `YamlValidate`, `YamlParseResult`, `YamlParseOptions` and `StringifyYamlOptions`.

## Phantom brands

`Brand<T, TBrand>` optionally tags a value's type without adding runtime fields.
Plain `T` values remain assignable; differently branded values are incompatible
when both carry a brand. It is a type distinction, not a runtime validator.

```typescript
import type { Brand } from '@schema-engine/registry';

type ElementId = Brand<string, 'Element'>;
const id: ElementId = 'text';
```

`BaseRegistry.getAll()` and `getAllKeys()` return fresh arrays. Mutating them does not change
the registry; registration objects themselves are shared references. `BaseRegistry`
stores schemas as supplied; use `createRegistry` when the schemas must be checked.

The published registry uses a caret range for its logger dependency. Copied
widget sources live in the separate, private `registry-files` workspace.
