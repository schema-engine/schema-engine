---
'@schema-engine/forms': minor
---

**JSON Schema targets use the Standard JSON Schema names, and an unsupported target throws.** Write `'draft-07'` and `'draft-04'` instead of `'draft-7'` and `'draft-4'` in `generateFormConfigSchema`, `generateJSONSchemaCollection` and `generateActionConfigSchema`. Their `target` is now `JSONSchemaTarget` from `@schema-engine/registry`: `'draft-2020-12'` (the default), `'draft-07'`, `'draft-04'` or `'openapi-3.0'`. Any other target, a misspelling included, throws before a schema is converted. The Standard converters of `getFormConfigStandardSchema()` and `getActionConfigStandardSchema()` throw the same way, where they used to hand the string to Zod, and `submissionSchema(config)` keeps writing `'draft-2020-12'`, `'draft-07'` and `'openapi-3.0'`.

```ts
// before
engine.generateFormConfigSchema({ target: 'draft-7' });
engine.generateJSONSchemaCollection({ target: 'draft-4' });
// after
engine.generateFormConfigSchema({ target: 'draft-07' });
engine.generateJSONSchemaCollection({ target: 'draft-04' });
```
