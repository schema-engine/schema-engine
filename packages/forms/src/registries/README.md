# Registries

`ElementRegistry` and `RecipeRegistry` are optional typed `BaseRegistry`
containers for field registrations and view recipes. They store registrations
without validating schemas. Engine construction builds its own Maps directly
and checks each supplied schema at that boundary. Form actions are also stored
in a Map; execution uses the actions package's `ActionDispatcher`.

Register components through `createFormEngine({ elements, recipes, actions })`.
Recipes own the
shell, header, progress, and action slots for a form view.

Input and static registrations may declare `containerKind: 'object' | 'array'`.
The [engine](../engine/README.md#schema-artifacts-and-extension) preserves this
metadata during normalization; it is independent of the widget name.
Runtime maps use the documented `AnyElementRegistration`,
`AnyRecipeRegistration` and `AnyActionRegistration` existential aliases.
