# @schema-engine/registry

Shared registry primitives for building typed registration systems across the Schema Engine workspace.

This package provides two abstract base classes:

- `BaseRegistry` for storing and retrieving typed registrations by `$type`
- `ComponentRegistry` for registries that manage renderable component registrations

It is used by higher-level packages such as `@schema-engine/forms` and `@schema-engine/actions`, but it is also usable on its own for plugin systems and internal extension points.

## Installation

```bash
bun add @schema-engine/registry zod
```

## Core Types

### `BaseRegistration`

Every registry entry must provide:

- `$type`: stable key used inside the registry
- `schema`: [Standard Schema](https://standardschema.dev/) (`StandardSchemaV1`) for config validation and inference
- `metadata`: display metadata such as `name` and `description`

```typescript
import { z } from 'zod';
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
import { z } from 'zod';
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
	schema: z.object({ enabled: z.boolean() }),
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
- `getMap()`

## Using `ComponentRegistry`

Extend `ComponentRegistry` when registrations must include a `render` function.

```typescript
import { z } from 'zod';
import { ComponentRegistry } from '@schema-engine/registry';
import type { ComponentRegistration } from '@schema-engine/registry';

type WidgetRegistration = ComponentRegistration<string, { title: string }, { id: string }>;

class WidgetRegistry extends ComponentRegistry<string, WidgetRegistration> {
	get registryName(): string {
		return 'WidgetRegistry';
	}
}

const widgets = new WidgetRegistry();

widgets.register({
	$type: 'card',
	schema: z.object({ title: z.string() }),
	metadata: {
		name: 'Card Widget',
	},
	render: ({ id }) => ({ id }),
});
```

## Registering Schemas Into Zod Metadata

`registerSchemas(...)` publishes registrations whose schemas implement Zod's `register()`
helper into a shared `z.registry()` instance. This supports JSON Schema metadata in
`FormEngine` today.

**Note:** `registerSchemas` is deprecated for new integrations. Prefer validating configs
through each registration's Standard Schema directly.

```typescript
import { z } from 'zod';

const schemaRegistry = z.registry();

registry.registerSchemas(schemaRegistry, (item) => ({
	id: item.$type,
	title: item.metadata.name,
	description: item.metadata.description,
}));
```

Registrations without a Zod `register()` helper are skipped.

## Package Exports

```typescript
export * from '@schema-engine/registry';
```

Main exports:

- `BaseRegistry`
- `ComponentRegistry`
- `BaseRegistration`
- `ComponentRegistration`
- `ComponentMetadata`
- `RegistrationMetadata`
- `Brand`
