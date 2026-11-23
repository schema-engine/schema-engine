# @schema-engine/registry

The registration contract and the read-only registry every other package builds on, and the YAML subpath for documents authored as text. The terms are defined in the router (`SKILL.md`). How the forms engine registers elements, recipes, actions and rules is in `forms.md`.

## A registration

Every registration is `{ $type, schema, metadata }`: `$type` is the stable key, `schema` is any Standard Schema (Zod, Zod Mini, Valibot, Effect Schema or a hand-written one) that describes the config, and `metadata` has a `name` and optionally a `description`. A package adds what it needs to the type (`BaseRegistration`): a renderable one is a `ComponentRegistration` with `render`, an action adds `execute`, a validation rule adds `category` and `handler`. The registry has no schema-library dependency: install the provider you prefer.

## createRegistry

`createRegistry(kind, registrations)` builds a frozen registry once, from a list. `kind` is the label in errors.

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
- Each winning `schema` is checked at build: a value without `~standard.validate` throws, naming the `kind` and the `$type`.
- The result has `get`, `has`, `all`, `keys` and `size`, and no `register` or `clear`. It holds a frozen shallow copy of each winner taken at build, so patch a registration before building, or build a new registry from a new list.
- Type it with `ReadOnlyRegistry<TRegistration>`.

`safeParseStandardSchema(schema, value)` runs a registration's schema without throwing and returns `{ success: true, data }` or `{ success: false, error: { issues } }` (it throws for a schema that validates asynchronously). Form validation and `parseActions` both go through it; `assertStandardSchema` is the build-time check on its own.

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
