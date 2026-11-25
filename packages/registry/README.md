# @schema-engine/registry

The registration contract and the read-only registries that hold registrations by `$type`. It is the base of Schema Engine's common language: a document names registrations by `$type`, a registry resolves each one, and the registration's schema validates its configuration. It has no UI and no schema-library dependency.

## Install

```bash
pnpm add @schema-engine/registry zod
```

Install the [Standard Schema](https://standardschema.dev/) validator you prefer. The example uses `zod/mini`.

## Example

```typescript
import * as z from 'zod/mini';
import { createRegistry, safeParseNode, type BaseRegistration } from '@schema-engine/registry';

z.config(z.locales.en());

interface Badge extends BaseRegistration {
	render(config: unknown): string;
}

const badgeSchema = z.object({ $type: z.literal('badge'), label: z.string() });

const badge: Badge = {
	$type: 'badge',
	schema: badgeSchema,
	metadata: { name: 'Badge', description: 'A short status label.' },
	render: ({ label }: z.output<typeof badgeSchema>) => `<span class="badge">${label}</span>`,
};

const badges = createRegistry('Badge', [badge]);

export function resolve(node: unknown): string {
	const parsed = safeParseNode(badges, node);
	return parsed.success
		? parsed.registration.render(parsed.data)
		: parsed.issues.map((issue) => issue.message).join('; ');
}
```

## Entry points

| Import                         | Holds                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/registry`      | `createRegistry`, `BaseRegistry`, the registration types, `safeParseNode`, `safeParseStandardSchema` and `assertStandardSchema`     |
| `@schema-engine/registry/yaml` | `parseYaml`, `safeParseYaml` and `stringifyYaml`, which report errors by line and column. Needs the optional peer dependency `yaml` |

## Documentation

- [Registry](https://schema-engine.com/docs/registry/overview): install, build a registry and resolve a JSON node.
- [Read-only and mutable registries](https://schema-engine.com/docs/registry/registries): `createRegistry` and `BaseRegistry`.
- [Resolve a document](https://schema-engine.com/docs/registry/resolve-a-document): walk a tree of nodes through registries.
- [API reference](https://schema-engine.com/docs/registry/api-reference): every export.
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
