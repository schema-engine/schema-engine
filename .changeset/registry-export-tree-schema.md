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
- A slot the export cannot reach (behind `allOf`, a `$ref` or a union), a `$type` a child path accepts that the lookup lacks, and a lifted definition that takes the name of a `$type` throw a `RegistryError` with the new codes `'unreachable-child-path'`, `'unknown-accepted-type'` and `'definition-name-clash'`.
- `createJSONSchemaEmbedder` and `readStandardJSONSchema`, which `@schema-engine/forms` used internally, are exported for domain packages that compose JSON Schema themselves.
