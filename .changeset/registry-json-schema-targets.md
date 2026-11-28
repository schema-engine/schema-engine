---
'@schema-engine/registry': minor
---

JSON Schema targets are one closed set, the Standard JSON Schema names, and each API throws for a target it does not write before it converts a schema. `@schema-engine/registry/json-schema` also exports the step `exportTreeSchema` takes for each child path.

- `JSONSchemaTarget` is `'draft-2020-12' | 'draft-07' | 'draft-04' | 'openapi-3.0'`. It no longer accepts any string.
- `exportTreeSchema` writes `'draft-2020-12'` (the default) and `'draft-07'`: its `target` option, and the `target` a `resolve` function is told, are typed to those two. Any other value, a misspelling or `'openapi-3.0'` included, throws an `Error` instead of writing a document without `$schema`.
- `createJSONSchemaEmbedder(target, placement)` takes a `JSONSchemaTarget` and throws for any other string.
- New `assertJSONSchemaTarget(target)` throws unless a string is a `JSONSchemaTarget`, and narrows it to one. Use it for the `target` of a Standard JSON Schema converter's options, which the Standard type leaves open.
- New `replaceChildSlot(definition, { $type, keys, list? }, union)` replaces the slot a child path names in a registration's JSON Schema, and only the slot: `required`, list bounds, annotations and sibling keys stay. An unreachable slot (behind a reference, `allOf` or a union, inside a schema with an `$id` of its own between the definition and the slot, or nullable) throws `RegistryError` `'unreachable-child-path'`, and a path without keys throws `'invalid-child-paths'`. The `$id` of the definition's own root is the caller's to check (`exportTreeSchema` throws for it; a collection entry, whose `$id` is its address, is no obstacle). An open slot becomes a child or a list of children, or an array when the path sets `list`. Code that writes JSON Schema itself composes child slots with it, as `exportTreeSchema` does.
- New `definitionRef(target, name)` writes the `$ref` to the definition of a name (`#/$defs/<name>` for `'draft-2020-12'`, `#/definitions/<name>` for any other target), with the name as a JSON Pointer token percent-encoded only for what a URI fragment does not allow, and `definitionsKeyword(target)` is the keyword it writes. The embedder gains `embedDefinition(own, name)`, which writes a schema that refers into itself at its own definition of a document (with `#` pointing there and its definitions lifted beside it) or as an entry of a collection, so the container of a slot is the schema and not a reference to a hoisted one. A schema with an `$id` of its own keeps its base: a collection entry for it is `{ allOf: [{ $ref: <its $id> }], $defs: { <name>: <the schema> } }`, so the entry keeps the collection's URI and other entries' references to it resolve. `exportTreeSchema` and the embedder write every reference with it, so a `$type` such as `element:tab` or `user@host` stays as written, where `:` and `@` were percent-encoded before (`#/$defs/element%3Atab`): the references still resolve to the same definition.

```ts
import { assertJSONSchemaTarget, definitionRef, replaceChildSlot } from '@schema-engine/registry/json-schema';

assertJSONSchemaTarget(options.target); // throws for 'draft-7'; narrows to JSONSchemaTarget
replaceChildSlot(
	definition,
	{ $type: 'group', keys: ['elements'] },
	{ anyOf: [{ $ref: definitionRef('draft-2020-12', 'input') }] },
);
```
