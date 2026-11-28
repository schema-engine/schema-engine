---
'@schema-engine/forms': minor
---

**The engine no longer exposes its schema internals, and the JSON Schema export types the children of every container.** `engine.getSchemaArtifacts()`, `engine.getSchemaRegistry()` and `engine.getFormConfigSchema()` are removed: they returned Zod objects, so keeping them froze how the export is composed. Validate a form config with `engine.validateForm` or `engine.safeValidateForm`. Export JSON Schema with `generateFormConfigSchema`, `generateJSONSchemaCollection` or `generateActionConfigSchema`, or hand `getFormConfigStandardSchema()` to a tool that takes Standard JSON Schema. Read titles and descriptions with `getSchemaCatalog()`.

```ts
// before
engine.getFormConfigSchema().safeParse(config).success;
// after
engine.safeValidateForm(config).success;
```

In the export, the `elements` of every container are now typed by what the container accepts, whichever library wrote its schema. Before, only a Zod schema whose `elements` was a plain array, a pipe or a prefault was typed, so a Valibot or hand-written container, a Standard JSON Schema one, and a Zod container whose `elements` was `optional`, `default`, `nullable` or `readonly` listed children that accepted any object, and `accepts` was not in the export.

- Each child is `{ anyOf: [{ $ref }, ...] }` over the `accepts` of the container's `childPaths` (every element of the engine without `accepts`), in `generateFormConfigSchema()`, `generateJSONSchemaCollection()` and the Standard JSON Schema getters. The items of the list change, and its `required`, `minItems` and `maxItems` stay.
- An element whose schema the export cannot read (a Valibot schema, a hand-written one) is listed by an object that holds its `$type`, its appearance axes and, for a container, an optional `elements` list, typed the same way. Such an element is now an entry of `generateJSONSchemaCollection()` and a definition of the form config, as every other element is.
- Two mistakes throw a `RegistryError` when you export (not when the engine is built): `'unknown-accepted-type'` when `accepts` names a `$type` that no element registers, and `'unreachable-child-path'` when the container's `elements` is nullable or behind `allOf`, a union or a reference.
- The element union that children refer to is no longer a shared `__schema0` definition: each child refers to the definition of an element (`#/$defs/element:tab`, or its URI in a collection).
- An open slot is a list for every source: a container written as a Standard JSON Schema with an open `elements` (`{}`) exports `{ type: 'array', items: ... }`, not a child or a list of children. Forms reads `elements` only as a list, and `validateForm` now reports an issue at the `elements` key of a container whose schema let one object through, which was silently dropped before.
- An element, an action or a recipe whose schema the export cannot read is a definition of the form config and an entry of `generateJSONSchemaCollection()`, as one that exports itself is, instead of an inline object. `generateActionConfigSchema(type)` and `getActionConfigStandardSchema(type)` now answer for such an action with the object that holds its `$type`, where they returned `undefined`.

**`FormEngine` is a type, and `createFormEngine` is the one way to make an engine.** The class and its constructor were exported, and `new FormEngine(registries)` took the schema artifacts, so the removed internals stayed reachable. Use `createFormEngine`; to check an object a renderer received, use `assertFormEngine`.

```ts
// before
import { FormEngine } from '@schema-engine/forms';
const engine = new FormEngine(registries);
const isEngine = value instanceof FormEngine;
// after
import { createFormEngine, assertFormEngine, type FormEngine } from '@schema-engine/forms';
const engine = createFormEngine({ elements, recipes, actions });
assertFormEngine(value, config);
```
