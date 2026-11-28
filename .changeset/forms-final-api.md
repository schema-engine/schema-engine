---
'@schema-engine/forms': minor
---

The root entry exports less, errors carry a code, and a container's child paths are checked in the types.

- `ActionRegistrationRegistry` is renamed `ActionRegistry`, beside `ElementRegistry` and `RecipeRegistry`. It is the type of `engine.actions`.
- `defineInput` and `defineInputContract` check `childPaths` as `createRegistry` does: a key the schema does not declare is the compile error `childPathNotInSchema`, and `list: true` over a slot the schema types as no array is `listPathNotAnArray`. A container whose schema is `z.object({ $type: z.literal('group') })` no longer compiles, where `generateFormConfigSchema` used to throw `'unreachable-child-path'` later. A schema that types `elements` as `z.unknown()` is not checked, since it can hold a list.
- The errors `createFormEngine` throws for an element registration are `RegistryError`s with a `code`, where they were plain `Error`s. `'invalid-child-paths'` covers `childPaths` on a static element, more than one path, a key other than `elements`, a path without `list: true`, and `containerKind` without `childPaths`. The new `'invalid-declaration'` of `@schema-engine/registry` covers an element that states no `kind`, an input that declares neither `value` nor `childPaths`, and a container that declares a `value`. The messages are unchanged.
- `ValidationRuleError`, which `ValidationRegistry.createSchema` throws for an unregistered rule `$type` or a handler that throws, is exported, so `instanceof` works.
- Import `ValidationStep` and `ValidationElement` from the root to type the read-only shapes accepted by value validation and participation.
- Recipe registration checks report `RegistryError` with `kind: 'Recipe'` and the recipe's `$type`. Branch on `'invalid-declaration'` for an invalid protocol or slot declaration and `'invalid-schema'` for a slot schema that does not implement Standard Schema.

Removed from the root entry:

| Removed                                                   | Instead                                                                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidateFormOptions`                                     | Nothing: it typed the options of `validateFormConfig`, which is not exported. Validate with `engine.validateForm` or `engine.safeValidateForm`. |
| `markNormalizedFormConfig`, `markNormalizedElementConfig` | `engine.defineForm`, `engine.validateForm` and `engine.validateElement`. Only an engine brands a config, after it validated it.                 |
| `validateRegistrationConfig(schema, config)`              | `safeParseStandardSchema(schema, config)` of `@schema-engine/registry`, which returns `{ success, data }` or `{ success, error }`.              |
| `ValidationElementTree`                                   | `readonly ValidationElement[]`                                                                                                                  |
