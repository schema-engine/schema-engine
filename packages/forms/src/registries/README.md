# Registries

The forms package has two component registries: `ElementRegistry` for field
registrations and `RecipeRegistry` for view recipes. Form actions use the
registry supplied by `@schema-engine/actions`.

Register components through `createFormEngine({ elements, recipes, actions })`.
Recipes own the
shell, header, progress, and action slots for a form view.

Input and static registrations may declare `containerKind: 'object' | 'array'`.
The [engine](../engine/README.md#schema-artifacts-and-extension) preserves this
metadata during normalization; it is independent of the widget name.
Runtime maps use the documented `AnyElementRegistration`,
`AnyRecipeRegistration` and `AnyActionRegistration` existential aliases.
