---
'@schema-engine/layout': patch
'@schema-engine/forms': patch
'@schema-engine/forms-react': patch
'@schema-engine/forms-radiant': patch
---

The slot schemas of a recipe spec can be any Standard Schema that validates synchronously: Zod Mini, Valibot or one you write with `standardSchema`. `defineProtocolRecipeSpec` and `defineRecipeSpec` build the view schema themselves, so a spec no longer needs `zod/mini`. A recipe registration carries the slot schemas as `slotSchemas`, and `createRecipeRegistry` (so `createFormEngine`) throws when they do not list exactly the recipe's `slots`, or one is not a Standard Schema. `bindRecipe`, `readSlotConfig`, `getSlotConfig`, `defineFormRecipe`, `defineRecipe` (React and Radiant), `useViewConfig` and `RadiantRecipePayload` take any Standard Schema instead of a Zod one. Specs with Zod Mini slot schemas need no change: the same call gives the same types for `view`, `slotDefaults` and `getSlotConfig`, and the same JSON Schema. In the JSON Schema export, a slot whose schema is not Zod is listed as an open object (`additionalProperties: {}`) with the `appearance` values the recipe declares for it; a Zod slot is exported in full. `@schema-engine/forms-react` and `@schema-engine/forms-radiant` now depend on `@standard-schema/spec` for these types.

Breaking, and shipped as a patch while the packages have no users outside this repository:

- `spec.schema` and `recipe.schema` are no longer Zod schemas, so `.parse`, `.safeParse`, `.shape` and passing them to `z.toJSONSchema`, `z.extend` or `z.safeExtend` fail. Validate with `safeParseStandardSchema(spec.schema, view)` from `@schema-engine/registry` (or `safeParseNode`), get a JSON Schema from the forms engine (`describeRecipe`, `generateJSONSchemaCollection`), and compose from `spec.slotSchemas`.
- `RecipeViewSchema<TType, TSlots>` is now a `StandardSchemaV1<Input, Output>`, not a `ZodMiniObject`. Read its types with `StandardSchemaV1.InferInput` and `InferOutput`.
- `appearanceAxes` on a slot whose schema input has no `appearance` key is a compile error, for every slot schema and not only strict Zod objects. The runtime check that probed the schema for the key is gone, since Standard Schema reports no issue codes to probe with, and `resolveRecipeView` removes `appearance` before the slot schema parses. A spec cast past the types now fails only at compile time. Add `appearance: z.optional(...)` (or the library's equivalent) to the slot schema.
- Messages changed. A key the recipe does not declare is an issue at that key (`Recipe 'x' does not accept view key 'y'. Allowed: ...`) and not an `unrecognized_keys` issue at the view. A bad `slotDefaults` entry reads `slotDefaults.<slot> is invalid: <path>: <message>`, with the message of the slot library.
