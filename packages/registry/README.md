# @schema-engine/registry

Shared registry primitives for building typed registration systems across the Schema Engine workspace.

This package provides `BaseRegistry` for storing and retrieving typed registrations by `$type`. Use the `ComponentRegistration` type when entries must include a render function.

It is used by higher-level packages such as `@schema-engine/forms` and `@schema-engine/actions`, but it is also usable on its own for plugin systems and internal extension points.

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

## Using `BaseRegistry`

Extend `BaseRegistry` when you need a typed lookup table keyed by `$type`.

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

Extend `BaseRegistry` with the `ComponentRegistration` type when registrations must include a `render` function.

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

- `BaseRegistry`
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

`getAll()` and `getAllKeys()` return fresh arrays. Mutating them does not change
the registry; registration objects themselves are shared references. `BaseRegistry`
stores schemas as supplied; validation belongs to the consuming domain boundary.
