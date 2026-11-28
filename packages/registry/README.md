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

## A whole document

A document is a tree of nodes. A registration says where its children are with `childPaths`, `{ keys, accepts?, list? }` each, and which `$type`s each place accepts (and `list: true` when it holds only a list). `safeParseTree` checks the whole document in one call, collecting every issue with its path, and gives the parsed document as `tree.data`, typed per place:

```typescript
import * as z from 'zod/mini';
import { createRegistry, safeParseTree } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({ $type: z.literal('section'), title: z._default(z.string(), 'Untitled') }),
		metadata: { name: 'Section' },
	},
]);

export function titles(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document, { accepts: ['page'] });
	if (!parsed.success) throw new Error(parsed.issues.map((issue) => issue.message).join('\n'));
	return parsed.tree.data.sections.map((section) => section.title);
}
```

When the document has issues, the failure also carries `tree`, a `PartialNode`, when the root's own schema passed: every node whose own schema passed, with `output` (its own schema output) and `children` (the children that parsed, in document order), and no `data`. Use it to run your own checks on what parsed. The parent's schema keeps the slot opaque (`z.array(z.unknown())`) and declares every child key; `accepts` is the only way to restrict it. The parent's schema keeps `$type` and the slot's shape in its output, or `safeParseTree` throws a `RegistryError`. The issues the engine creates carry a namespaced `code` (`registry/not-accepted`, `registry/unregistered-type`, `registry/missing-type`, `registry/not-an-object`, `registry/not-a-node`, `registry/not-a-list`, `registry/contains-itself`); an issue from a schema keeps whatever its library wrote.

## JSON Schema of a whole document

`exportTreeSchema` writes the JSON Schema of the same tree, composed from each registration's own JSON Schema, so Zod, Valibot, ArkType and a hand-written schema export the same way and the registry depends on none of them. Each registration's schema is read from `~standard.jsonSchema`; pass `resolve` for a library that does not provide it, or to prefer another converter:

```typescript
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

The result is `{ $schema, $defs, anyOf }`: one definition per `$type`, and the root as the union of `accepts` (every `$type` without it). Only the slot of each child path is replaced, by the union of what it accepts, so `required`, `minItems` and `maxItems` stay. A slot the walk cannot reach (behind `allOf`, a `$ref` or a union, or inside a schema with an `$id` of its own) throws a `RegistryError`.

## Errors

Building or binding a registry from registrations that break a rule throws a `RegistryError`, and so does `safeParseTree` when a schema contradicts its registration, and `exportTreeSchema` when it cannot write a registration's slot. Branch on its `code`, not on the message: the message is for people and may be reworded, the codes stay. Every `RegistryError` carries `$type`, the registration at fault, and `kind`, the registry's label (`Widget`), which a parse leaves out when its lookup is no registry; a code that needs more to describe the mistake sets it too, so a message can be written again, in another language say, from the error's fields alone.

| Code                           | Thrown when                                                                                                                                                                                          | Details besides `kind` and `$type`                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `'invalid-schema'`             | A registration's `schema` has no `~standard.validate` function                                                                                                                                       |                                                                  |
| `'invalid-child-paths'`        | `childPaths` is not a list, or an entry is not `{ keys, accepts?, list? }` with non-empty `keys`, when present a non-empty `accepts` of non-empty names without repeats, and a `list` that is `true` |                                                                  |
| `'duplicate-child-path'`       | A registration declares the same child path (the same keys) twice                                                                                                                                    | `childPath`                                                      |
| `'nested-child-path'`          | A child path runs through another child path of the same registration                                                                                                                                | `childPath`, and `outerChildPath`                                |
| `'duplicate-type'`             | A `$type` is registered twice with `duplicates: 'error'`                                                                                                                                             |                                                                  |
| `'unknown-binding'`            | `bindRegistry` got a binding whose key is no contract's `$type`                                                                                                                                      | None; `$type` is the binding key                                 |
| `'missing-binding'`            | `bindRegistry` got no binding for a contract                                                                                                                                                         |                                                                  |
| `'binding-overrides-contract'` | A binding sets a key its contract already defines                                                                                                                                                    | `key`, the key the binding sets                                  |
| `'schema-changes-type'`        | `safeParseTree` parsed a node whose schema returned an output without the node's own `$type`                                                                                                         |                                                                  |
| `'schema-breaks-child-path'`   | `safeParseTree` parsed a node whose schema returned an output that does not keep a child path as the document has it                                                                                 | `childPath`                                                      |
| `'unreachable-child-path'`     | `exportTreeSchema` found no slot for a child path in a registration's JSON Schema: not declared, behind `allOf`, a `$ref` or a union, inside an `$id` of its own, or not an object, an array or open | `childPath`                                                      |
| `'unknown-accepted-type'`      | `exportTreeSchema` got a lookup that lacks a `$type` a child path accepts                                                                                                                            | `childPath`, and `key`, the `$type`                              |
| `'definition-name-clash'`      | A definition a schema brought along takes the name of a `$type` or of another definition                                                                                                             | `key`, the name; `$type`, the owner (absent for a hoisted embed) |

`assertStandardSchema` on its own throws a plain `Error`: its caller is not building a registry. Other errors raised while parsing a node or a document, such as a Standard Schema that validates asynchronously, are plain `Error`s too, and `parseYaml` still throws `YamlDocumentError`.

## Entry points

| Import                                | Holds                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/registry`             | `createRegistry`, `createMutableRegistry`, `bindRegistry`, `RegistryError`, `RegistryErrorCode`, the registration types (`ChildPath` among them), `safeParseNode`, `safeParseTree`, `exportTreeSchema`, `safeParseStandardSchema`, `assertStandardSchema`, `standardSchema` and `formatIssuePath` |
| `@schema-engine/registry/json-schema` | `readStandardJSONSchema`, `createJSONSchemaEmbedder`, `assertJSONSchemaTarget`, `replaceChildSlot`, `definitionRef` and `definitionsKeyword`, for code that writes JSON Schema itself: a `resolve` that falls back to Standard JSON Schema, or a domain package's own export                      |
| `@schema-engine/registry/yaml`        | `parseYaml`, `safeParseYaml` and `stringifyYaml`, which report errors by line and column. Needs the optional peer dependency `yaml`                                                                                                                                                               |

## Documentation

- [Registry](https://schema-engine.com/docs/registry/overview): install, build a registry and resolve a JSON node.
- [Read-only and mutable registries](https://schema-engine.com/docs/registry/registries): `createRegistry` and `createMutableRegistry`.
- [Resolve a document](https://schema-engine.com/docs/registry/resolve-a-document): validate a whole tree of nodes with `safeParseTree`, render it and write its JSON Schema with `exportTreeSchema`.
- [API reference](https://schema-engine.com/docs/registry/api-reference): every export.
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
