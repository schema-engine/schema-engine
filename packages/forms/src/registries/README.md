# Registries

The engine stores its registrations in three read-only registries built with
`createRegistry` from `@schema-engine/registry`:

- `ElementRegistry`: field and static element registrations.
- `RecipeRegistry`: view recipes that own the shell, header, progress, and
  action slots of a form view.
- `ActionRegistry`: form action registrations. Execution uses the
  actions package's `ActionDispatcher`, which takes `engine.actions` as it is.

These are type aliases of `ReadOnlyRegistry<AnyElementRegistration>`,
`ReadOnlyRegistry<AnyRecipeRegistration>` and
`ReadOnlyRegistry<AnyActionRegistration>`; they are not classes to instantiate.
`buildFormEngine` builds them: later duplicates win without a warning, each
winning schema is checked as a Standard Schema, and the stored registrations are
frozen shallow copies of the ones you passed, which stay untouched. Recipes are
also checked against the forms recipe protocol (`createFormRecipeRegistry`) and
axis-checked, for winners only. There is no `register` or
`clear`.

Register components through `createFormEngine({ elements, recipes, actions })`.
Per-engine typing comes from the registration tuples you pass, not from these
runtime registries.

An input registration is a container when it declares `childPaths: [{ keys: ['elements'], list: true }]`, the registry's own
syntax (`accepts` limits the `$type`s it takes), and it may declare `containerKind: 'object' | 'array'` beside it
to say how its children make its value. A static registration declares neither.
The [engine](../engine/README.md#schema-artifacts-and-extension) preserves `containerKind`
during normalization; it is independent of the widget name.
Runtime registries use the documented `AnyElementRegistration`,
`AnyRecipeRegistration` and `AnyActionRegistration` existential aliases.
