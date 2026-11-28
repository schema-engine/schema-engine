---
'@schema-engine/actions': minor
---

Actions read a registry from `@schema-engine/registry`. `ActionRegistry` is removed: build the registry with `createRegistry('Action', [...])`, or `createMutableRegistry<MyAction>('Action')` for actions that register at runtime, both from `@schema-engine/registry` (add it to your dependencies).

- `ActionRegistryProvider` and `ActionSchemaLookup` are removed. `parseActions` and `ActionDispatcher` take any lookup with `get($type)` (a `NodeLookup`): a registry of either kind, or `{ get }` over a store of your own. `getAction(type)` is `get(type)` and `getActionTypes()` is `keys()`. A `FormEngine` is no longer a lookup: pass `engine.actions`, which `@schema-engine/forms` now exposes.
- The hint of an unregistered `$type` moves from `parseActions(registry, input, { hint })` to the lookup: `parseActions({ get, hint }, input)`. `ParseActionsOptions` keeps only `triggers`.
- `ActionDispatcher` infers the context and trigger types from the registrations, which fix them through `defineAction<Context, Trigger>()`, so `new ActionDispatcher<Context, Trigger>(registry)` is `new ActionDispatcher(registry)`. A `dispatch` with another context or trigger is still a type error.
- An action registered inline must be wrapped in `defineAction<Context, Trigger>()(...)`. In 0.5, `new ActionRegistry<Context, Trigger>([{ $type, schema, metadata, execute: (ctx) => ... }])` typed the inline registration from the class parameters. `createRegistry('Action', [{ ... }])` has no such parameters, so an inline `execute` does not compile: write `createRegistry('Action', [defineAction<Context, Trigger>()({ ... })])`, or `defineAction<Context, Trigger>()` once and call it for each action.
- A registry that holds actions of several configs, such as a mutable one, is typed `AnyActionRegistration<Context, Trigger>`, which the package now exports: `createMutableRegistry<AnyActionRegistration<Context, Trigger>>('Action')`.
- The log for an action with no registration names the action `id` and the registry's `kind`, and no longer lists the registered types.

```ts
// before
import { ActionDispatcher, ActionRegistry, parseActions } from '@schema-engine/actions';

const registry = new ActionRegistry<Context, Trigger>([
	{ $type: 'log', schema, metadata, execute: (ctx) => ({ success: true }) },
	notify,
]);
const parsed = parseActions(registry, input, { hint: 'Register it in plugins.ts.' });
const dispatcher = new ActionDispatcher<Context, Trigger>(registry);

class Store implements ActionRegistryProvider<Context, Trigger> {
	getAction(type: string) {
		/* ... */
	}
	getActionTypes() {
		/* ... */
	}
}
// after
import { createRegistry } from '@schema-engine/registry';
import { ActionDispatcher, defineAction, parseActions } from '@schema-engine/actions';

const defineLog = defineAction<Context, Trigger>();
const registry = createRegistry('Action', [
	defineLog({ $type: 'log', schema, metadata, execute: (ctx) => ({ success: true }) }),
	notify,
]);
const parsed = parseActions(registry, input);
const dispatcher = new ActionDispatcher(registry);

// A store of your own, with a domain hint
parseActions({ get: (type) => store.find(type), hint: 'Register it in plugins.ts.' }, input);
```
