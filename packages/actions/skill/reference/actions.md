# @schema-engine/actions

The domain-agnostic action package: a registration, a registry, `parseActions` and a dispatcher that runs a sequence for a trigger. A form uses it through its runtime (`forms-actions.md`). The terms are defined in the router (`SKILL.md`).

## The flow

Serialized actions are checked, then dispatched: `parseActions(registry, input)`, then `dispatcher.dispatch({ actions: parsed.data, trigger, context })`. `dispatch` takes only what `parseActions` returned, as a type, so dispatching an unchecked action does not type-check. `defineAction<Context, Trigger>()` fixes the context and the trigger of a domain once, so each registration states only its config.

```ts title="actions/dispatch.ts"
import * as z from 'zod/mini';
import {
	ActionDispatcher,
	ActionRegistry,
	defineAction,
	parseActions,
	type ActionConfigBase,
} from '@schema-engine/actions';

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
		return config.channel === 'broken'
			? { success: false, error: 'No such channel', shouldContinue: false }
			: { success: true };
	},
});

export const registry = new ActionRegistry<Context, Trigger>([notify]);

const dispatcher = new ActionDispatcher<Context, Trigger>(registry);

/** Parses a serialized sequence, then runs it for a trigger; the entry in brackets is a parallel group. */
export async function run(input: unknown, sent: string[]) {
	const parsed = parseActions(registry, input);
	if (!parsed.success) return { issues: parsed.issues };
	return { results: await dispatcher.dispatch({ actions: parsed.data, trigger: 'save', context: { sent } }) };
}
```

## An action

A registration is `{ $type, schema, metadata, execute }`; an instance is `{ $type, id, ...config, enabled?, triggers? }`. `schema` describes the action's own arguments: `parseActions` checks `id`, `$type`, `enabled` and `triggers` itself, so a schema never lists them. `metadata.defaultTriggers` says when it runs unless the instance sets its own `triggers`. `execute` receives the base context you pass to `dispatch` plus `config` (the instance), `trigger` and an abort `signal`, and returns `{ success, message?, error?, data?, shouldContinue? }`. `ActionRegistry` is built once from a list, like any registry (`registry.md`). A domain that registers at runtime implements `ActionRegistryProvider` instead.

`ActionRegistration`, `ActionHandler` (the `execute` function), `ActionRuntimeContext` (what it receives) and `ActionExecutionResult` (what it returns) type those parts. When a handler throws, the dispatcher turns it into a failed result whose `cause` is the thrown error.

## parseActions

`parseActions(registry, input, options?)` takes `input`, the sequence as it arrived, and `registry`, anything with `getAction($type)`. `options.triggers` lists the trigger names an entry's `triggers` may hold (any string without it), and `options.hint` replaces `Register it in the action registry.`, the sentence that ends the message of an unregistered `$type`. It returns `{ success: true, data }` or `{ success: false, issues }`. Each entry is validated with the schema of the registration its `$type` names, and `data` holds what the schema returned, so defaults and transforms apply. Every entry is checked, so two bad entries report both. An issue's `path` is the index of the entry, the index inside a group when the entry is one, then the path the schema reported (`[1, 0, 'channel']`); each entry is checked with `safeParseNode` of the registry, so an entry that is not an object is an issue at its own path, and one with no string `$type` or a `$type` no registration answers is an issue at `$type`.

## Sequences, groups and cancellation

Entries run in order. An inner array is a parallel group: its actions start together and the sequence waits for all of them before the next entry. An action that is disabled, or whose triggers do not include the current one, is skipped. A thrown handler is a failed result and the sequence continues. A result with `success: false` and `shouldContinue: false` stops the sequence; in a group it also aborts the `signal` of the siblings, waits for every started handler to settle, and stops what follows. A handler must observe `signal`: one that ignores it can keep the dispatcher waiting, and cancellation never undoes a remote side effect. `dispatch({ signal })` cancels the whole dispatch from outside.

`dispatch({ actions, trigger, context, triggeredBy?, metadata?, signal? })` passes `triggeredBy` on to each handler and merges `metadata` over the context's own `metadata`. It resolves one result per action that ran, in configuration order: the handler's result plus `actionId`, `sequenceIndex`, `groupIndex` (inside a group), `status` (`succeeded`, `failed` or `cancelled`) and `cancellationRequested`. Indexes are positions in the input, skipped actions included. `hasMatching(actions, trigger)` says whether a trigger would run anything, so a caller can skip building a context. `dispatchSync` starts the same dispatch and logs a rejection.
