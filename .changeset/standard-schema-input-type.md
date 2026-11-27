---
'@schema-engine/registry': patch
---

`standardSchema` takes a second type parameter for the input the schema accepts, `standardSchema<TOutput, TInput = unknown>(validate)`, so a hand-written Standard Schema can state its authoring type. It only types the schema: `validate` still receives `unknown`, and every existing `standardSchema<TOutput>` call is unchanged.
