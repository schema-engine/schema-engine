---
'@schema-engine/forms': patch
---

The JSON Schema export reads the schema of every registration kind (an element, an action, a validation rule and a recipe slot) by one rule. A Zod schema, classic or Mini, goes through the Zod converter as before. Any other schema that provides Standard JSON Schema (`~standard.jsonSchema`), such as ArkType or a schema you write, is now exported as what its `input()` or `output()` returns for the `io` and `target` you ask for, where it used to be listed by its shape. A schema that provides neither is still listed by its shape; Valibot and Effect Schema do not provide `~standard.jsonSchema`, so they still are.

How such a schema is embedded: its `$schema` is dropped; a schema whose `$ref`s point into itself (ArkType's recursive types) is moved to the document's definitions as `embedded-1` and so on, or to a collection entry of its own, so its references still resolve; a document keeps the catalog metadata (`title`, `description`, `componentType`, `category`) beside the schema's keywords where it does not set them; and a converter that throws for the target (ArkType for `openapi-3.0`) lists the schema by its shape and logs a warning instead of failing the export.

`submissionSchema(config)` reads its value schemas by the same rule. A classic Zod value schema now goes through the Zod converter like a Zod Mini one, so a type JSON Schema cannot represent (a date) is written as `{}` instead of throwing. A value schema's `$schema` is dropped and a recursive one is moved to the submission schema's definitions.
