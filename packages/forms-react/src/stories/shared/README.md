# Storybook shared utilities

Shared story helpers use the same per-composer registration model as the
public API. Register elements, recipes, and actions explicitly; the resulting
engine exposes only those registrations.

```ts
const engine = createFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });
```

Multi-step stories select a view recipe with `view.$type`, such as `wizard` or
`card-wizard`. Recipe slot configuration is inferred from the recipe schemas.
