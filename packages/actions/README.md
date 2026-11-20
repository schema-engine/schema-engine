# @schema-engine/actions

Domain-agnostic action execution primitives for event-driven architectures.

## Overview

`@schema-engine/actions` provides a small, generic action system built around three pieces:

- `ActionRegistration`: describes an action type
- `ActionRegistry`: a read-only registry built from a list of action registrations
- `ActionDispatcher`: executes a sequence of actions or parallel action groups for a trigger

The package is intended to be reusable across different domains such as forms, workflows, UI interactions, and state transitions.

## Installation

```bash
pnpm add @schema-engine/actions
```

The package has no schema-library runtime dependency. Action registrations use the provider-neutral `StandardSchemaV1` contract, so applications can choose Zod Mini, Zod, Valibot, Effect Schema, or another Standard Schema implementation.

## Execution Model

The dispatcher separates the caller-provided base context from the runtime context seen by action handlers.

Provide base domain context to the dispatcher. Before each action runs, the dispatcher enriches that context with the action config, trigger and cancellation signal and passes the merged object to `execute()`.

At runtime the call shape is effectively:

```typescript
execute({
	...context,
	config: action,
	trigger,
	signal,
});
```

That means call sites stay simple, while handlers still receive a strongly typed runtime context.

Actions execute sequentially in their configured order; an inner array executes its actions concurrently and joins before the next entry. When an action fails,
execution stops only when its result sets `shouldContinue: false`; an omitted
value or `true` allows later actions to run. For forms, only an unsuccessful
action with `shouldContinue: false` makes the submission fail.

## Quick Start

```typescript
import * as z from 'zod/mini';
import {
	ActionDispatcher,
	type ActionConfigBase,
	type ActionExecutionResult,
	type ActionRegistration,
	type ActionRegistryProvider,
	ActionRegistry,
} from '@schema-engine/actions';

type MyTrigger = 'submit' | 'change';

interface BaseContext {
	id: string;
	data: Record<string, unknown>;
}

interface LogActionConfig extends ActionConfigBase<'log'> {
	message: string;
}

const logAction: ActionRegistration<LogActionConfig, BaseContext, MyTrigger> = {
	$type: 'log',
	schema: z.strictObject({
		id: z.string(),
		$type: z.literal('log'),
		message: z.string(),
		enabled: z.optional(z.boolean()),
		triggers: z.optional(z.array(z.string())),
	}),
	metadata: {
		name: 'Log Action',
		description: 'Logs a message',
		defaultTriggers: ['submit'],
	},
	execute: async (context): Promise<ActionExecutionResult> => {
		console.log(context.trigger, context.config.message, context.data);
		return { success: true };
	},
};

const registry = new ActionRegistry<BaseContext, MyTrigger>([logAction]);

const dispatcher = new ActionDispatcher<BaseContext, MyTrigger>(registry);

const baseContext: BaseContext = {
	id: 'ctx-1',
	data: { foo: 'bar' },
};

await dispatcher.dispatch({
	actions: [
		{
			id: 'log-1',
			$type: 'log',
			message: 'Hello world',
		},
	],
	trigger: 'submit',
	context: baseContext,
});
```

The handler receives `BaseContext & { config: LogActionConfig; trigger: MyTrigger }`. Nested dispatches also include the optional `triggeredBy` action. The runtime shape is injected by the dispatcher.

## Core Concepts

### ActionRegistration

Defines a reusable action type.

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';

interface ActionRegistration<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TBaseContext = unknown,
	TTrigger = string,
	TData = unknown,
> {
	$type: TConfig['$type'];
	schema: StandardSchemaV1;
	metadata: ActionMetadata<TTrigger>;
	execute: (
		context: ActionRuntimeContext<TConfig, TBaseContext, TTrigger>,
	) => Promise<ActionExecutionResult<TData>> | ActionExecutionResult<TData>;
}
```

### ActionConfigBase

Defines an action instance in a config array.

```typescript
interface ActionConfigBase<TType extends string = string> {
	id: string;
	$type: TType;
	enabled?: boolean;
	triggers?: readonly string[];
}
```

### Trigger Matching

An action executes when either:

1. The action instance has a `triggers` array that contains the current trigger.
2. Otherwise, the registration `metadata.defaultTriggers` contains the current trigger.

## Custom Registries

`ActionRegistry` is built once from a list: a later registration with the same `$type` wins without a warning, a winning schema that is not a Standard Schema throws at construction naming its `$type`, and the registry cannot be changed. Subclasses may add their own fields. To register actions at runtime, implement `ActionRegistryProvider` from the package root:

```typescript
class MyActionRegistry<TBaseContext, TTrigger> implements ActionRegistryProvider<TBaseContext, TTrigger> {
	private actions = new Map<string, ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>>();

	register(action: ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>) {
		this.actions.set(action.$type, action);
	}

	getAction(type: string) {
		return this.actions.get(type);
	}

	getActionTypes(): string[] {
		return Array.from(this.actions.keys());
	}
}
```

## API Reference

### ActionRegistry

```typescript
class ActionRegistry<TBaseContext, TTrigger> {
	constructor(registrations: readonly ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>[]);
	has(type: string): boolean;
	get(type: string): ActionRegistration<ActionConfigBase, TBaseContext, TTrigger> | undefined;
	getAction(type: string): ActionRegistration<ActionConfigBase, TBaseContext, TTrigger> | undefined;
	getActionTypes(): string[];
	all(): readonly ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>[];
	keys(): readonly string[];
	readonly size: number;
}
```

It is built on `createRegistry` from `@schema-engine/registry` and has no `register` or `clear`.

### ActionDispatcher

```typescript
class ActionDispatcher<TBaseContext = unknown, TTrigger = string> {
	constructor(registry: ActionRegistryProvider<TBaseContext, TTrigger>);

	dispatch<TConfig extends ActionConfigBase>(
		input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>,
	): Promise<ActionDispatchResult[]>;

	dispatchSync<TConfig extends ActionConfigBase>(input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): void;

	hasMatching<TConfig extends ActionConfigBase>(
		actions: readonly ActionSequenceEntry<TConfig>[],
		trigger: TTrigger,
	): boolean;
}
```

## Testing

Run the package test suite with pnpm:

```bash
pnpm test:all
```

## License

MIT

## Dispatch behavior

`ActionDispatcher` is the execution entry point. It skips disabled actions and
explicit trigger mismatches before looking up a registration. Matching actions run in sequence except within an inner array, with one registration lookup each. Missing registrations
produce a failed result. Thrown handlers become failed results and execution
continues; an unsuccessful result with `shouldContinue: false` stops the sequence.
`hasMatching(actions, trigger)` reports whether `dispatch` would run an action, or report a
missing handler, on that trigger, so a caller can skip building a context for a trigger
nothing answers.

`dispatch` merges optional metadata into object contexts without mutating the
caller. `dispatchSync` starts the same dispatch and logs unexpected rejections.
Logging uses `@ecopages/logger`; enable debug output through the host's log levels.
The former `ActionExecutor`, its `execute` method, and the `debug` constructor
option have been removed. Use `ActionDispatcher.dispatch` instead.
Browser redirects belong to the forms package's `ActionExecutionResult` type.

## Parallel groups and results

In `actions: [first, [second, third], last]`, `second` and `third` start together. A failure with `shouldContinue: false` requests cancellation of sibling handlers through their `signal`, waits for every started handler to settle, and stops the later sequence. Other failures are reported and allow the sequence to continue. A handler must observe the signal; a handler that ignores it can keep the dispatcher waiting indefinitely. Cancellation does not undo a remote side effect.

`dispatch` returns results in configuration order, each with `actionId`, `sequenceIndex`, optional `groupIndex`, `status` (`succeeded`, `failed`, or `cancelled`), `cancellationRequested`, and the handler's data or error. A thrown value is retained in `cause` when available. `cancelled` denotes an abort error observed after cancellation, not merely a cancellation request. Indexes refer to original input positions, including positions occupied by skipped actions. Direct callers constructing `ActionRuntimeContext` must supply a signal. Existing flat sequences still run in order; the correlation fields are added to their result objects too. A caller can use these outcomes for application-specific recovery.
