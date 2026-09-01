# Registries

The forms package has two component registries: `ElementRegistry` for field
registrations and `RecipeRegistry` for view recipes. Form actions use the
registry supplied by `@schema-engine/actions`.

Register components through `FormComposer.addElement(s)`,
`FormComposer.addRecipe(s)`, and `FormComposer.addAction(s)`. Recipes own the
shell, header, progress, and action slots for a form view.
