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

## Errors

Building or binding a registry from registrations that break a rule throws a `RegistryError`. Branch on its `code`, not on the message: the message is for people and may be reworded, the codes stay. Every `RegistryError` carries `kind`, the registry's label (`Widget`), and `$type`, the registration at fault; a code that needs more to describe the mistake sets it too, so a message can be written again, in another language say, from the error's fields alone.

| Code                           | Thrown when                                                                       | Details besides `kind` and `$type` |
| ------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------- |
| `'invalid-schema'`             | A registration's `schema` has no `~standard.validate` function                    |                                    |
| `'invalid-child-paths'`        | `childPaths` is not a list, or an entry is not a non-empty list of non-empty keys |                                    |
| `'duplicate-child-path'`       | A registration declares the same child path twice                                 | `childPath`                        |
| `'nested-child-path'`          | A child path runs through another child path of the same registration             | `childPath`, and `outerChildPath`  |
| `'duplicate-type'`             | A `$type` is registered twice with `duplicates: 'error'`                          |                                    |
| `'unknown-binding'`            | `bindRegistry` got a binding whose key is no contract's `$type`                   | None; `$type` is the binding key   |
| `'missing-binding'`            | `bindRegistry` got no binding for a contract                                      |                                    |
| `'binding-overrides-contract'` | A binding sets a key its contract already defines                                 | `key`, the key the binding sets    |

`assertStandardSchema` on its own throws a plain `Error`: its caller is not building a registry. Errors raised while parsing a node or a document, such as a Standard Schema that validates asynchronously, are plain `Error`s too, and `parseYaml` still throws `YamlDocumentError`.

## Entry points

| Import                         | Holds                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/registry`      | `createRegistry`, `bindRegistry`, `BaseRegistry`, `RegistryError`, `RegistryErrorCode`, the registration types, `safeParseNode`, `safeParseTree`, `safeParseStandardSchema`, `assertStandardSchema`, `standardSchema` and `formatIssuePath` |
| `@schema-engine/registry/yaml` | `parseYaml`, `safeParseYaml` and `stringifyYaml`, which report errors by line and column. Needs the optional peer dependency `yaml`                                                                                                         |

## Documentation

- [Registry](https://schema-engine.com/docs/registry/overview): install, build a registry and resolve a JSON node.
- [Read-only and mutable registries](https://schema-engine.com/docs/registry/registries): `createRegistry` and `BaseRegistry`.
- [Resolve a document](https://schema-engine.com/docs/registry/resolve-a-document): validate a whole tree of nodes with `safeParseTree` and render it.
- [API reference](https://schema-engine.com/docs/registry/api-reference): every export.
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
