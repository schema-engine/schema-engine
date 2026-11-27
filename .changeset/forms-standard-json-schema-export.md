---
'@schema-engine/forms': patch
---

The JSON Schema export reads the schema of every registration kind (an element, an action, a validation rule and a recipe slot) by one rule. A Zod schema, classic or Mini, goes through the Zod converter as before. Any other schema that provides Standard JSON Schema (`~standard.jsonSchema`), such as ArkType or a schema you write, is now exported as exactly what its `input()` or `output()` returns for the `io` and `target` you ask for; a schema that provides neither is still listed by its shape. Valibot and Effect Schema do not provide `~standard.jsonSchema`, so they are still listed by shape.
