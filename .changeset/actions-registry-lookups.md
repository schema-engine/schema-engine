---
'@schema-engine/actions': minor
---

Actions read a registry from `@schema-engine/registry`. `ActionRegistry` is removed: build the registry with `createRegistry('Action', [...])`, or `createMutableRegistry<MyAction>('Action')` for actions that register at runtime, both from `@schema-engine/registry` (add it to your dependencies).

- `ActionRegistryProvider` and `ActionSchemaLookup` are removed. `parseActions` and `ActionDispatcher` take any lookup with `get($type)` (a `NodeLookup`): a registry of either kind, or `{ get }` over a store of your own. `getAction(type)` is `get(type)` and `getActionTypes()` is `keys()`. A `FormEngine` is no longer a lookup: pass `{ get: (type) => engine.getAction(type) }`.
- The hint of an unregistered `$type` moves from `parseActions(registry, input, { hint })` to the lookup: `parseActions({ get, hint }, input)`. `ParseActionsOptions` keeps only `triggers`.
- `ActionDispatcher` infers the context and trigger types from the registrations, which fix them through `defineAction<Context, Trigger>()`, so `new ActionDispatcher<Context, Trigger>(registry)` is `new ActionDispatcher(registry)`. A `dispatch` with another context or trigger is still a type error.
- The log for an action with no registration names the action `id` and the registry's `kind`, and no longer lists the registered types.

```ts
// before
import { ActionDispatcher, ActionRegistry, parseActions } from '@schema-engine/actions';

const registry = new ActionRegistry<Context, Trigger>([notify]);
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
import { ActionDispatcher, parseActions } from '@schema-engine/actions';

const registry = createRegistry('Action', [notify]);
const parsed = parseActions(registry, input);
const dispatcher = new ActionDispatcher(registry);

// A store of your own, with a domain hint
parseActions({ get: (type) => store.find(type), hint: 'Register it in plugins.ts.' }, input);
```
