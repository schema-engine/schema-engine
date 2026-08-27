# Registry System - Standalone Usage

The Form Engine's registry system is fully modular and can be used independently of the FormComposer. This allows you to leverage specific parts of the system without pulling in the entire form engine.

## Available Registries

All registries extend the abstract `BaseRegistry` class:

- **ElementRegistry** - Manages form elements (inputs, content, decorations, interactive)
- **LayoutRegistry** - Manages form layouts
- **StepperRegistry** - Manages multi-step navigation
- **ActionRegistry** - Manages form actions and event handlers

## Core API

All registries share the same base API:

```typescript
class BaseRegistry<TKey, TValue> {
	register(item: TValue): void;
	has(key: TKey): boolean;
	get(key: TKey): TValue | undefined;
	getAll(): TValue[];
	getAllKeys(): TKey[];
	get size(): number;
	clear(): void;
}
```

## Use Cases

### 1. Custom Action System

Use `ActionRegistry` independently for event-driven workflows:

```typescript
import { ActionRegistry, type BuilderActionRegistration } from '@schema-engine/forms';

const actionRegistry = new ActionRegistry();

const logAction: BuilderActionRegistration = {
	id: 'log',
	schema: z.object({ message: z.string() }),
	metadata: {
		name: 'Log Action',
		description: 'Logs a message',
		defaultTriggers: ['custom_event'],
	},
	execute: async (context) => {
		console.log(context.actionConfig.message);
		return { success: true };
	},
};

actionRegistry.register(logAction);

const action = actionRegistry.get('log');
if (action) {
	await action.execute({
		formId: 'my-form',
		actionConfig: { message: 'Hello World' },
	});
}
```

### 2. Component Library Registration

Create a reusable element library:

```typescript
import { ElementRegistry, type ElementRegistration } from "@schema-engine/forms

const componentLibrary = new ElementRegistry();

componentLibrary.register(textInputRegistration);
componentLibrary.register(emailInputRegistration);
componentLibrary.register(datePickerRegistration);

export function getComponentLibrary(): ElementRegistry {
	return componentLibrary;
}

const allComponents = componentLibrary.getAll();
const inputComponent = componentLibrary.get("text");
```

### 3. Custom Registry Implementation

Extend `BaseRegistry` for domain-specific needs:

```typescript
import { BaseRegistry } from "@schema-engine/forms

interface ValidatorRegistration {
	validatorId: string;
	name: string;
	validate: (value: unknown) => boolean;
}

class ValidatorRegistry extends BaseRegistry<string, ValidatorRegistration> {
	get registryName(): string {
		return "validator";
	}

	protected getItemKey(item: ValidatorRegistration): string {
		return item.validatorId;
	}

	protected getItemName(item: ValidatorRegistration): string {
		return item.name;
	}

	validateValue(validatorId: string, value: unknown): boolean {
		const validator = this.get(validatorId);
		if (!validator) throw new Error(`Validator ${validatorId} not found`);
		return validator.validate(value);
	}
}
```

### 4. Dependency Injection with FormComposer

Inject pre-configured registries:

```typescript
import { FormComposer, ElementRegistry, ActionRegistry } from "@schema-engine/forms

const customElements = new ElementRegistry();
customElements.register(myCustomInput);
customElements.register(myCustomTextarea);

const customActions = new ActionRegistry();
customActions.register(mySubmitAction);

const engine = new FormComposer(customElements, undefined, undefined, customActions).build();
```

### 5. Testing with Mock Registries

Easy testing with isolated registries:

```typescript
import { describe, test, expect } from "vitest";
import { ElementRegistry } from "@schema-engine/forms

describe("ElementRegistry", () => {
	test("should register and retrieve elements", () => {
		const registry = new ElementRegistry();

		registry.register(mockElementRegistration);

		expect(registry.has("mock-element")).toBe(true);
		expect(registry.get("mock-element")).toBeDefined();
		expect(registry.size).toBe(1);
	});

	test("should handle duplicates with warning", () => {
		const registry = new ElementRegistry();

		registry.register(mockElementRegistration);
		registry.register(mockElementRegistration);

		expect(registry.size).toBe(1);
	});
});
```

### 6. Runtime Plugin System

Load plugins dynamically:

```typescript
import { ActionRegistry } from "@schema-engine/forms

class PluginManager {
	private actionRegistry = new ActionRegistry();

	async loadPlugin(pluginUrl: string): Promise<void> {
		const plugin = await import(pluginUrl);

		for (const action of plugin.actions) {
			this.actionRegistry.register(action);
		}
	}

	getRegistry(): ActionRegistry {
		return this.actionRegistry;
	}

	getAvailableActions(): string[] {
		return this.actionRegistry.getAllKeys();
	}
}
```

## Benefits of Standalone Usage

### Modularity

Use only what you need. Import `ActionRegistry` without bundling element, layout, or stepper code.

### Tree-Shaking

Unused registries are eliminated from the final bundle, reducing bundle size.

### Flexibility

Create custom workflows without being tied to the form engine structure.

### Testability

Test individual registries in isolation with simple unit tests.

### Extensibility

Build custom registry implementations for domain-specific requirements.

### Performance

Lighter imports mean faster load times and smaller bundle sizes.

## Integration with FormComposer

The builder uses these registries internally via dependency injection. The default behavior creates new instances automatically:

```typescript
const builder = new FormComposer();
```

But you can provide custom instances:

```typescript
const builder = new FormComposer(myElementRegistry, myLayoutRegistry, myStepperRegistry, myActionRegistry);
```

This pattern enables:

- Sharing registries across multiple builders
- Pre-configuring registries before builder initialization
- Testing with mock registries
- Progressive feature adoption

## API Reference

### BaseRegistry

Abstract base class for all registries.

**Methods:**

- `register(item: TValue): void` - Register an item (with override warning)
- `has(key: TKey): boolean` - Check if key exists
- `get(key: TKey): TValue | undefined` - Retrieve by key
- `getAll(): TValue[]` - Get all registered items
- `getAllKeys(): TKey[]` - Get all registered keys
- `get size(): number` - Get count of registered items
- `clear(): void` - Remove all items (primarily for testing)
- `getMap(): Map<TKey, TValue>` - Get internal map (internal use)

**Abstract Properties/Methods:**

- `get registryName(): string` - Registry name for logging
- `protected getItemKey(item: TValue): TKey` - Extract key from item
- `protected getItemName(item: TValue): string` - Extract name for logging

### ElementRegistry

Manages form element registrations.

**Key Type:** `string` (id)  
**Value Type:** `ElementRegistration<any>`

### LayoutRegistry

Manages form layout registrations.

**Key Type:** `string` (id)  
**Value Type:** `LayoutRegistration<any>`

### StepperRegistry

Manages form stepper registrations.

**Key Type:** `string` (id)  
**Value Type:** `StepperRegistration<any>`

### ActionRegistry

Manages form action registrations.

**Key Type:** `string` (id)  
**Value Type:** `BuilderActionRegistration<any>`

**Additional Methods:**

- `getDefaultTriggers(id: string): readonly string[] | undefined` - Get default triggers for an action type

## Best Practices

1. **Single Responsibility**: Keep registries focused on storage/retrieval. Move execution logic to separate classes (e.g., ActionExecutor).

2. **Immutability**: Once registered, items should not be mutated. Register new versions instead.

3. **Validation**: Validate items before registration in your application code, not in the registry.

4. **Error Handling**: Check for undefined when using `get()`. The registry returns undefined for missing items.

5. **Testing**: Use `clear()` in tests to reset registry state between test cases.

6. **Logging**: Registries log warnings for duplicates and debug info for registrations. Configure the logger as needed.

## Migration Guide

### From Global ActionRegistry

**Before:**

```typescript
import { actionRegistry } from "@schema-engine/forms

actionRegistry.register(myAction);
```

**After:**

```typescript
import { ActionRegistry } from "@schema-engine/forms

const actionRegistry = new ActionRegistry();
actionRegistry.register(myAction);

const builder = new FormComposer(undefined, undefined, undefined, actionRegistry);
```

### From Builder-Embedded Storage

**Before:**

```typescript
const builder = new FormComposer();
builder.addElement(textInput);
```

**After (same syntax, now with registries):**

```typescript
const builder = new FormComposer();
builder.addElement(textInput);
```

No changes needed for standard usage. The registries are injected automatically.

## Examples

Check the `/test` directory for comprehensive examples of standalone registry usage.
