---
'@schema-engine/registry': minor
---

`exportTreeSchema(lookup, options)` writes the JSON Schema of a whole tree of registrations, composed at the JSON Schema level so it does not depend on the validator.

```ts
const schema = exportTreeSchema(nodes, { accepts: ['page'] });
// { $schema, $defs: { page, section, ... }, anyOf: [{ $ref: '#/$defs/page' }] }
```

- One definition per `$type` under `$defs`. Each child path replaces only its slot, by the union of its `accepts` (every `$type` of the lookup without one): an array slot gets `items`, an object slot becomes the union, and an open slot becomes a child or a list of children. `required`, `minItems`, `maxItems` and the sibling keys stay.
- Each schema is read by `options.resolve`, by default its `~standard.jsonSchema`; a schema it cannot read is listed by an open object that holds its `$type` and child paths. Options: `accepts` (the root), `io` (`'input'` by default), `target` and `resolve`. `lookup` is a registry or a list of registries.
- A slot the export cannot reach (behind `allOf`, a `$ref` or a union, or inside a schema with an `$id` of its own), a `$type` a child path accepts that the lookup lacks, and a lifted definition that takes the name of a `$type` throw a `RegistryError` with the new codes `'unreachable-child-path'`, `'unknown-accepted-type'` and `'definition-name-clash'`.
- A schema written as a document of its own is moved into the document with its names written per owner, so two owners never write the same name. Its `$defs` are lifted as `<owner>.<name>` with each `.` and `_` of the `$type` written as `_2e_` and `_5f_` (`a.b` with `c` is `a_2e_b.c`; `a` with `b.c` is `a.b.c`). Its anchors (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#name'`, a draft-04 `id: '#name'`) become `<owner part>.<name>`, where the owner part is `o` and the `$type` with every character outside `[A-Za-z0-9-]` written as `_<hex>_` (`ui/button` with `x` is `oui_2f_button.x`, `my-card` is `omy-card.x`), valid in every dialect. A name that is still taken throws `'definition-name-clash'` and nothing is overwritten, whether `exportTreeSchema` or the embedder writes it. `RegistryError.$type` is optional: the clash of a schema the embedder hoisted for itself (`embedded-1`) has no owner.
- The new subpath `@schema-engine/registry/json-schema` exports `readStandardJSONSchema`, for a `resolve` that falls back to a schema's `~standard.jsonSchema`, and `createJSONSchemaEmbedder`, for a domain package that writes JSON Schema itself (forms uses both).
