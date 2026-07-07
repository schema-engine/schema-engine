# @schema-engine/actions

Domain-agnostic action execution primitives for event-driven architectures.

## Overview

`@schema-engine/actions` provides a small, generic action system built around four pieces:

- `ActionRegistration`: describes an action type
- `ActionRegistry`: stores action registrations
- `ActionDispatcher`: **recommended public orchestrator** (metadata merge, empty-guard, sync/async)
- `ActionExecutor`: lower-level sequential runner (advanced use; used internally by dispatcher)

For a wired setup, use `createActionSystem()` which returns `{ registry, dispatcher }`.

The package is intended to be reusable across different domains such as forms, workflows, UI interactions, and state transitions.

## Installation

```bash
bun add @schema-engine/actions zod
```

`zod` is the only external runtime dependency. The package also uses the internal `@schema-engine/registry` package from the same workspace family.

## Current Execution Model

The current implementation separates the caller-provided base context from the runtime context seen by action handlers.

You provide base domain context to the executor. Before each action runs, the executor enriches that context with the current action config and trigger and passes the merged object to `execute()`.

At runtime the call shape is effectively:

```typescript
execute({
	...context,
	config: action,
	trigger,
});
```

That means call sites stay simple, while handlers still receive a strongly typed runtime context.

## Quick Start

```typescript
import { z } from 'zod';
import {
	createActionSystem,
	type ActionConfigBase,
	type ActionExecutionResult,
	type ActionRegistration,
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
	schema: z.object({
		id: z.string(),
		$type: z.literal('log'),
		message: z.string(),
		enabled: z.boolean().optional(),
		triggers: z.array(z.string()).optional(),
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

const { registry, dispatcher } = createActionSystem<BaseContext, MyTrigger>();

registry.register(logAction);

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

The handler still receives `BaseContext & { config: LogActionConfig; trigger: MyTrigger }`, but that runtime shape is injected by the executor.

## Entry Points

| API                    | When to use                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `createActionSystem()` | Default — returns wired `{ registry, dispatcher }`                                        |
| `ActionDispatcher`     | When you supply your own registry (e.g. `FormEngine` duck-types `ActionRegistryProvider`) |
| `ActionExecutor`       | Advanced — direct sequential execution without dispatcher conveniences                    |

Production (`forms-react`) uses `ActionDispatcher` with `FormEngine` as the registry provider.

## Core Concepts

### ActionRegistration

Defines a reusable action type.

```typescript
interface ActionRegistration<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TBaseContext = unknown,
	TTrigger = string,
	TData = unknown,
> {
	$type: TConfig['$type'];
	schema: z.ZodType<TConfig>;
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

If you want to provide your own registry implementation, use `ActionRegistryProvider` from the package root:

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
	register(action: ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>): void;
	has(type: string): boolean;
	getAction(type: string): ActionRegistration<ActionConfigBase, TBaseContext, TTrigger> | undefined;
	getActionTypes(): string[];
	getAll(): ActionRegistration<ActionConfigBase, TBaseContext, TTrigger>[];
	getAllKeys(): string[];
	get size(): number;
	clear(): void;
}
```

### ActionExecutor

```typescript
class ActionExecutor<TBaseContext = unknown, TTrigger = string> {
	constructor(registry: ActionRegistryProvider<TBaseContext, TTrigger>, options?: { debug?: boolean });

	execute<TConfig extends ActionConfigBase>(
		input: ActionExecuteInput<TConfig, TBaseContext, TTrigger>,
	): Promise<ActionExecutionResult[]>;
}
```

### ActionDispatcher

```typescript
class ActionDispatcher<TBaseContext = unknown, TTrigger = string> {
	constructor(registry: ActionRegistryProvider<TBaseContext, TTrigger>, options?: { debug?: boolean });

	dispatch<TConfig extends ActionConfigBase>(
		input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>,
	): Promise<ActionExecutionResult[]>;

	dispatchSync<TConfig extends ActionConfigBase>(input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): void;
}
```

## Testing

The current package test suite passes with Bun:

```bash
bun test
```

## License

MIT
