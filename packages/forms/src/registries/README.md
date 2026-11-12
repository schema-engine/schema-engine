# Registries

The engine stores its registrations in three read-only registries built with
`createRegistry` from `@schema-engine/registry`:

- `ElementRegistry`: field and static element registrations.
- `RecipeRegistry`: view recipes that own the shell, header, progress, and
  action slots of a form view.
- `ActionRegistrationRegistry`: form action registrations. Execution uses the
  actions package's `ActionDispatcher`.

These are type aliases of `ReadOnlyRegistry<AnyElementRegistration>`,
`ReadOnlyRegistry<AnyRecipeRegistration>` and
`ReadOnlyRegistry<AnyActionRegistration>`; they are not classes to instantiate.
`buildFormEngine` builds them: later duplicates win without a warning, each
schema is checked as a Standard Schema, and the registrations are frozen. There
is no `register` or `clear`.

Register components through `createFormEngine({ elements, recipes, actions })`.
Per-engine typing comes from the registration tuples you pass, not from these
runtime registries.

Input and static registrations may declare `containerKind: 'object' | 'array'`.
The [engine](../engine/README.md#schema-artifacts-and-extension) preserves this
metadata during normalization; it is independent of the widget name.
Runtime registries use the documented `AnyElementRegistration`,
`AnyRecipeRegistration` and `AnyActionRegistration` existential aliases.
