# @schema-engine/actions

Domain-agnostic action execution system for event-driven architectures.

## Overview

`@schema-engine/actions` provides a generic, serializable, type-safe action execution framework that can be used in any domain - forms, workflows, state machines, UI interactions, and more. It's completely independent from any specific framework.

**Key Features:**

- **Domain Agnostic**: No dependencies on specific frameworks or domains
- **Type Safe**: Full TypeScript support with generic constraints
- **Sequential Execution**: Actions execute in order, preventing race conditions
- **Pluggable**: Registry-based architecture for extensibility
- **Testable**: Clean separation of concerns makes testing straightforward
- **Zero Dependencies**: Only requires Zod for schema validation

## Installation

```bash
bun add @schema-engine/actions zod
```

## Quick Start

### 1. Define Your Domain Types

```typescript
import type { ActionConfigBase } from '@schema-engine/actions';

// Your triggers
type MyTrigger = 'submit' | 'change' | 'mount' | 'unmount';

// Your context
interface MyContext {
	id: string;
	data: Record<string, unknown>;
	isValid: boolean;
}

// Your action config
interface MyActionConfig extends ActionConfigBase {
	$type: string;
	// ... your custom properties
}
```

### 2. Create Action Registrations

```typescript
import { z } from 'zod';
import type { ActionRegistration } from '@schema-engine/actions';

const LogActionSchema = z.object({
	id: z.string(),
	$type: z.literal('log'),
	message: z.string(),
});

type LogAction = z.infer<typeof LogActionSchema>;

const logAction: ActionRegistration<'log', MyContext, MyTrigger> = {
	$type: 'log',
	schema: LogActionSchema,
	metadata: {
		name: 'Log Action',
		description: 'Logs a message to console',
		defaultTriggers: ['change', 'submit'],
	},
	handler: async (executionContext, config) => {
		console.log(config.message, executionContext.context);
		return { success: true };
	},
};
```

### 3. Create and Use a Registry

```typescript
import { ActionRegistry } from '@schema-engine/actions';

const registry = new ActionRegistry<MyActionConfig, MyContext, MyTrigger>();
registry.register(logAction);
```

Or implement your own custom registry:

```typescript
import type { ActionRegistryProvider } from '@schema-engine/actions';

class MyActionRegistry implements ActionRegistryProvider<MyContext, MyTrigger> {
	private actions = new Map();

	register(action: ActionRegistration<string, MyContext, MyTrigger>) {
		this.actions.set(action.$type, action);
	}

	getAction(type: string) {
		return this.actions.get(type);
	}

	getActionTypes(): string[] {
		return Array.from(this.actions.keys());
	}
}

const registry = new MyActionRegistry();
registry.register(logAction);
```

### 4. Execute Actions

```typescript
import { ActionExecutor } from '@schema-engine/actions';

const executor = new ActionExecutor<MyActionConfig, MyContext, MyTrigger>(registry, {
	debug: true,
});

const actions: MyActionConfig[] = [
	{
		id: 'log-1',
		$type: 'log',
		message: 'Hello world',
	},
];

const context: MyContext = {
	id: 'my-instance',
	data: { foo: 'bar' },
	isValid: true,
};

const results = await executor.execute(actions, 'submit', context);
```

## Core Concepts

### ActionExecutionContext

Every action handler receives an execution context that wraps the trigger and domain-specific context:

```typescript
interface ActionExecutionContext<TContext, TTrigger> {
	trigger: TTrigger; // What triggered this action
	context: TContext; // Your domain-specific context
}
```

### ActionExecutionResult

All action handlers must return (or promise) a result:

```typescript
interface ActionExecutionResult {
	success: boolean;
	message?: string;
	error?: string;
	data?: unknown;
	shouldContinue?: boolean; // If false, stops execution chain
	redirectUrl?: string;
}
```

### ActionRegistration

Define how your action behaves:

```typescript
interface ActionRegistration<TType, TContext, TTrigger> {
	$type: TType;
	schema?: z.ZodSchema<TConfig>;
	metadata: ActionMetadata<TTrigger>;
	execute: (context: TContext) => Promise<ActionExecutionResult> | ActionExecutionResult;
}
```

### Trigger Matching

Actions execute when:

1. They have custom `triggers` array that includes the current trigger
2. OR their `metadata.defaultTriggers` includes the current trigger

```typescript
const action = {
	id: 'my-action',
	$type: 'log',
	triggers: ['submit', 'change'], // Custom triggers for this instance
};

const registration = {
	$type: 'log',
	metadata: {
		defaultTriggers: ['mount'], // Default for all instances
	},
	// ...
};
```

## Advanced Usage

### Sequential Execution

Actions always execute sequentially, never in parallel:

```typescript
const results = await executor.execute([action1, action2, action3], 'submit', context);
// action2 starts only after action1 completes
// action3 starts only after action2 completes
```

### Stop on Failure

Return `shouldContinue: false` to stop the execution chain:

```typescript
handler: async (executionContext, config) => {
	if (validationFails) {
		return {
			success: false,
			error: 'Validation failed',
			shouldContinue: false, // Stops execution
		};
	}
	return { success: true };
};
```

### Disabled Actions

Set `enabled: false` to skip an action:

```typescript
const action = {
	id: 'my-action',
	$type: 'log',
	enabled: false, // Will be skipped
};
```

### Debug Logging

Enable debug mode to see execution details:

```typescript
const executor = new ActionExecutor(registry, { debug: true });
// Logs:
// [ActionExecutor] Executing trigger: submit
// [ActionExecutor] Executing action: my-action (log)
// [ActionExecutor] Action my-action executed successfully
```

## Real-World Examples

### Form Submission

```typescript
type FormTrigger = 'submit' | 'change' | 'mount';

interface FormContext {
	formId: string;
	formData: Record<string, unknown>;
	isValid: boolean;
}

const submitAction: ActionRegistration<'submit', FormContext, FormTrigger> = {
	$type: 'submit',
	metadata: {
		name: 'Submit Form',
		description: 'Submits form data to an endpoint',
		defaultTriggers: ['submit'],
	},
	handler: async (executionContext, config) => {
		const response = await fetch(config.endpoint, {
			method: 'POST',
			body: JSON.stringify(executionContext.context.formData),
		});

		if (!response.ok) {
			return {
				success: false,
				error: 'Submit failed',
				shouldContinue: false,
			};
		}

		return {
			success: true,
			message: 'Form submitted',
			data: await response.json(),
		};
	},
};
```

### Workflow State Machine

```typescript
type WorkflowTrigger = 'start' | 'approve' | 'reject' | 'complete';

interface WorkflowContext {
	workflowId: string;
	currentState: string;
	data: Record<string, unknown>;
}

const transitionAction: ActionRegistration<'transition', WorkflowContext, WorkflowTrigger> = {
	$type: 'transition',
	metadata: {
		name: 'State Transition',
		description: 'Transitions workflow to next state',
		defaultTriggers: ['approve', 'reject'],
	},
	handler: async (executionContext, config) => {
		const { context } = executionContext;
		const nextState = getNextState(context.currentState, executionContext.trigger);

		await updateWorkflowState(context.workflowId, nextState);

		return {
			success: true,
			data: { nextState },
		};
	},
};
```

### UI State Management

```typescript
type UITrigger = 'click' | 'hover' | 'focus' | 'blur';

interface UIContext {
	elementId: string;
	state: Record<string, unknown>;
}

const toggleAction: ActionRegistration<'toggle', UIContext, UITrigger> = {
	$type: 'toggle',
	metadata: {
		name: 'Toggle State',
		description: 'Toggles a boolean state',
		defaultTriggers: ['click'],
	},
	handler: async (executionContext, config) => {
		const currentValue = executionContext.context.state[config.key];

		return {
			success: true,
			data: { [config.key]: !currentValue },
		};
	},
};
```

## Domain-Specific Packages

This package is used by:

- **[@schema-engine/forms](../forms)**: Form action execution with React Hook Form
- Add your own domain-specific implementation!

## API Reference

### ActionRegistry

```typescript
class ActionRegistry<TContext, TTrigger> {
	register(action: ActionRegistration<string, TContext, TTrigger>): void;
	has(type: string): boolean;
	getAction(type: string): ActionRegistration<string, TContext, TTrigger> | undefined;
	getActionTypes(): string[];
	getAll(): ActionRegistration<string, TContext, TTrigger>[];
	getDefaultTriggers(type: string): readonly TTrigger[] | undefined;
	get size(): number;
	clear(): void;
}
```

### ActionExecutor

```typescript
class ActionExecutor<TConfig, TContext, TTrigger> {
	constructor(registry: ActionRegistryProvider<TConfig, TContext, TTrigger>, options?: { debug?: boolean });

	execute(
		actions: TConfig[],
		trigger: TTrigger,
		context: TContext,
		triggeredBy?: TConfig,
	): Promise<ActionExecutionResult[]>;

	cleanup(): void;
}
```

### ActionRegistryProvider

```typescript
interface ActionRegistryProvider<TContext, TTrigger> {
	getAction(type: string): ActionRegistration<string, TContext, TTrigger> | undefined;
	getActionTypes(): string[];
}
```

## Testing

The action system is designed to be testable:

```typescript
import { describe, test, expect } from 'bun:test';

describe('LogAction', () => {
	test('should log message', async () => {
		const context = { id: 'test', data: {}, isValid: true };
		const config = { id: 'log-1', $type: 'log', message: 'test' };

		const result = await logAction.handler({ trigger: 'submit', context }, config);

		expect(result.success).toBe(true);
	});
});
```

## License

MIT
