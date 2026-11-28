# @schema-engine/actions

Registered behaviour that runs from plain data. You define an action once in code. A workflow is a JSON array of action entries that name registered actions by `$type`: entries run in order, an entry that is a list runs in parallel, and a failure can stop the rest and cancel the group. `parseActions` checks a workflow against the registrations before anything runs. The package knows no domain and has no UI.

## Install

```bash
pnpm add @schema-engine/actions @schema-engine/registry zod
```

Install the [Standard Schema](https://standardschema.dev/) validator you prefer. The example uses `zod/mini`.

## Example

```ts
import * as z from 'zod/mini';
import { createRegistry } from '@schema-engine/registry';
import { ActionDispatcher, defineAction, parseActions, type ActionConfigBase } from '@schema-engine/actions';

type Trigger = 'save';

interface Context {
	readonly sent: string[];
}

interface NotifyConfig extends ActionConfigBase<'notify'> {
	channel: string;
}

const defineNotify = defineAction<Context, Trigger>();

const notify = defineNotify<NotifyConfig>({
	$type: 'notify',
	schema: z.object({ channel: z.string() }),
	metadata: { name: 'Notify', defaultTriggers: ['save'] },
	execute: async ({ config, sent, signal }) => {
		if (signal.aborted) return { success: false, error: 'Cancelled' };
		sent.push(config.channel);
		return { success: true };
	},
});

const registry = createRegistry('Action', [notify]);

export async function run(input: unknown, sent: string[]) {
	const parsed = parseActions(registry, input);
	if (!parsed.success) return { issues: parsed.issues };
	const dispatcher = new ActionDispatcher(registry);
	return { results: await dispatcher.dispatch({ actions: parsed.data, trigger: 'save', context: { sent } }) };
}
```

`run([{ "id": "a", "$type": "notify", "channel": "ops" }], sent)` checks the entry, dispatches it for the `save` trigger and returns one result per action that ran. `parseActions` checks `id`, `$type`, `enabled` and `triggers` itself, so a schema lists only an action's own arguments.

## Exports

The package has one entry, `@schema-engine/actions`: `ActionDispatcher`, `parseActions`, `defineAction` and the registration, entry and result types. The registry is the one from `@schema-engine/registry`, and `parseActions` and `ActionDispatcher` take any lookup with `get($type)`.

## Documentation

- [Actions](https://schema-engine.com/docs/actions/overview): register actions, check a workflow and dispatch it.
- [Concepts](https://schema-engine.com/docs/actions/concepts): the registration, the context, trigger matching and results.
- [Sequences, parallel groups, cancellation](https://schema-engine.com/docs/actions/sequences-and-cancellation): ordering and stopping a workflow.
- [Writing actions](https://schema-engine.com/docs/actions/writing-actions): `defineAction`, a service call and testing.
- [Serialized workflows](https://schema-engine.com/docs/actions/serialized-workflows): a workflow as JSON.
- [API reference](https://schema-engine.com/docs/actions/api-reference): every export.
- [For AI agents](https://schema-engine.com/docs/schema-engine/agent-skill): the package ships its part of the agent skill.

## License

MIT
