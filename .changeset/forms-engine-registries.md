---
'@schema-engine/forms': minor
---

`FormEngine` exposes its registries as readonly properties, and the 13 methods that read them are removed. `engine.elements`, `engine.recipes`, `engine.actions` and `engine.validations` are the read-only registries the engine already held (`ElementRegistry`, `RecipeRegistry`, `ActionRegistry` and `ValidationRegistry`), so each has `get`, `has`, `all`, `keys`, `size` and `kind`.

| Before                                                   | After                                                    |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `getElement(id)`, `getRecipe(id)`, `getAction(id)`       | `elements.get(id)`, `recipes.get(id)`, `actions.get(id)` |
| `hasElement(id)`, `hasRecipe(id)`, `hasAction(id)`       | `elements.has(id)`, `recipes.has(id)`, `actions.has(id)` |
| `getAllElements()`, `getAllRecipes()`, `getAllActions()` | `elements.all()`, `recipes.all()`, `actions.all()`       |
| `getElementIds()`, `getRecipeIds()`, `getActionTypes()`  | `elements.keys()`, `recipes.keys()`, `actions.keys()`    |
| `getValidationRegistry()`                                | `validations`                                            |

`getAll*()` and `get*Ids()` returned mutable copies. `all()` and `keys()` return frozen arrays, so copy one (`[...engine.elements.all()]`) before sorting or changing it.

`engine.elements`, `engine.recipes` and `engine.actions` carry the hint of an unregistered `$type` (`Register it with createFormEngine({ actions: [...] }).`), so `parseActions(engine.actions, input)` reports it.

`getViewRecipe(engine, config)` from `@schema-engine/forms/recipes` takes `{ readonly recipes: RecipeRegistry }` instead of `{ getRecipe(id) }`: a `FormEngine` still works, and a hand-written `{ getRecipe }` adapter breaks.

`engine.actions` is a lookup the actions package takes as it is: `ActionDispatcher` and `parseActions` no longer take the engine itself, but its registry.

```ts
// before
const types = engine.getAllElements().map(({ $type }) => $type);
const registry = engine.getValidationRegistry();
const dispatcher = new ActionDispatcher(engine);
// after
const types = engine.elements.all().map(({ $type }) => $type);
const registry = engine.validations;
const dispatcher = new ActionDispatcher(engine.actions);
```

A test that replaced a method with `vi.spyOn(engine, 'getAction')` registers the action it needs with `createFormEngine({ actions: [...] })` instead: the registries are frozen.
