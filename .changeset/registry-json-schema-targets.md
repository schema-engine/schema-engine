---
'@schema-engine/registry': minor
---

JSON Schema targets are one closed set, the Standard JSON Schema names, and each API throws for a target it does not write before it converts a schema. `@schema-engine/registry/json-schema` also exports the step `exportTreeSchema` takes for each child path.

- `JSONSchemaTarget` is `'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0'`. It no longer accepts any string.
- `exportTreeSchema` writes `'draft-2020-12'` (the default) and `'draft-07'`: its `target` option, and the `target` a `resolve` function is told, are typed to those two. Any other value, a misspelling or `'openapi-3.0'` included, throws an `Error` instead of writing a document without `$schema`.
- `createJSONSchemaEmbedder(target, placement)` takes a `JSONSchemaTarget` and throws for any other string.
- New `assertJSONSchemaTarget(target)` throws unless a string is a `JSONSchemaTarget`, and narrows it to one. Use it for the `target` of a Standard JSON Schema converter's options, which the Standard type leaves open.
- New `replaceChildSlot(definition, { $type, keys }, union)` replaces the slot a child path names in a registration's JSON Schema, and only the slot: `required`, list bounds, annotations and sibling keys stay. An unreachable slot (behind a reference, `allOf` or a union, inside a schema with an `$id` of its own, or nullable) throws `RegistryError` `'unreachable-child-path'`, and a path without keys throws `'invalid-child-paths'`. Code that writes JSON Schema itself composes child slots with it, as `exportTreeSchema` does.

```ts
import { assertJSONSchemaTarget, replaceChildSlot } from '@schema-engine/registry/json-schema';

assertJSONSchemaTarget(options.target); // throws for 'draft-7'; narrows to JSONSchemaTarget
replaceChildSlot(definition, { $type: 'group', keys: ['elements'] }, { anyOf: [{ $ref: '#/$defs/input' }] });
```
