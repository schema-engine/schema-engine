# @schema-engine/registry

Shared registry primitives for building typed registration systems across the Schema Engine workspace.

This package provides one registry mechanism for typed registrations keyed by `$type`:

- `createRegistry(kind, registrations)` builds a read-only, frozen registry from a list. The forms engine stores its elements, recipes, actions and validation rules with it, and `@schema-engine/actions` builds `ActionRegistry` on it. `ValidationRegistry` in `@schema-engine/forms` is a read-only registry of this kind with a few validation lookups added; it has no `register`.
- `BaseRegistry` is the mutable opt-in for runtime plugin systems that register after construction.

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
