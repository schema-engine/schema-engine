---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

Give validation handlers the form context

A validation handler's second argument is now a `ValidationContext` — the form's
nested `values`, the field's rendered `fieldPath`, and `resolve(fieldRef)` — in
place of the optional flat `formData` map. References resolve exactly as
constraint fields do: a bare name is a sibling, a dotted name is absolute from
the form root, and a rule authored inside an array reads its own row.

This fixes two live defects in the built-in `async` rule. Dependencies were read
off a flat map, so a dotted dependency (`billing.country`) always resolved to
`undefined` — which also made the rule skip its request entirely — and a
dependency inside an array row always read row zero. Radiant never passed form
values at all, so every cross-field rule was inert there.

Breaking, for consumers who registered their own validations or called the
builders directly:

- `handler: (rule, formData?)` becomes `handler: (rule, context)`. Read other
  fields with `context.resolve('otherField')` rather than
  `formData?.otherField`.
- `createZodSchemaFromRules(rules, context)` and
  `ValidationRegistry.createSchema(rule, context)` now require the context.
  Build it with `createValidationContext({ values, fieldPath })`, or
  `createValidationContext()` when there are no values to offer. It is required
  rather than optional because an omitted context is invisible: that is how
  cross-field rules came to pass silently on one renderer.
- `category` gains `'cross-field'`.
- `@schema-engine/forms-radiant`'s `toFieldRules(rules, fieldType)` becomes
  `toFieldRules(element)`, taking `{ rules, $type, name }`, because resolving a
  reference needs the field's rendered path.

Cross-field rules are not revalidated when a field they read changes; that is
tracked separately.
