---
'@schema-engine/forms': minor
'@schema-engine/layout': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

**Zod `^4.5.0` is required.** The peer range of `zod` was `^4.0.17`, which promised more than the packages work with: Zod before 4.2.0 has no Standard JSON Schema target names and no `~standard.jsonSchema`, and the JSON Schema export of the forms engine needs Zod 4.5.0, where the catalog ids of a schema are written as `$defs` entries (the document tests fail on 4.4.3). Update `zod` to 4.5.0 or later. A CI job runs the type checks and tests of every package that uses Zod against Zod 4.5.0 itself.

```json
// before
{ "peerDependencies": { "zod": "^4.0.17" } }
// after
{ "peerDependencies": { "zod": "^4.5.0" } }
```
