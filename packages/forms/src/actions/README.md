# Form Actions

## Overview

Form actions use the generic action system from **[@schema-engine/actions](../../../actions)**. For details on how the action execution system works, see the [actions package README](../../../actions/README.md).

This document focuses on **creating and using form-specific action plugins**.

## Built-in Plugins

The forms package includes several ready-to-use action plugins:

- **Submit Plugin**: Form submission with custom request adapters
- **Reset Plugin**: Form reset with confirmation and cleanup
- **Notification Plugin**: User notifications with custom handlers
- **Auto-Save Plugin**: Draft saving with configurable storage
- **GTM Plugin**: Google Tag Manager event tracking

## Quick Start

### 1. Register Plugins

```typescript
import { FormEngineBuilder } from '@schema-engine/forms';
import {
	submitPlugin,
	resetPlugin,
	notificationPlugin,
} from '@schema-engine/forms/actions/plugins';
import { toast } from 'react-hot-toast';

const engine = new FormEngineBuilder()
	// Configure submit behavior
	.addAction(
		submitPlugin({
			onSuccess: (data, context) => console.log('Submitted:', data),
			onError: (error, context) => console.error('Submit failed:', error),
		})
	)
	// Configure reset behavior
	.addAction(
		resetPlugin({
			confirm: (message) => window.confirm(message),
			onReset: () => toast.success('Form reset!'),
		})
	)
	// Configure notifications
	.addAction(
		notificationPlugin({
			onSuccess: (message) => toast.success(message),
			onError: (message) => toast.error(message),
		})
	)
	.build();
```

### 2. Define Actions in Your Form

```typescript
const formConfig = {
	actions: [
		{
			id: 'submit-form',
			$type: 'submit',
			endpoint: '/api/submit',
			method: 'POST',
			successMessage: 'Form submitted successfully!',
		},
		{
			id: 'success-notification',
			$type: 'show_notification',
			message: 'Thank you for your submission!',
			variant: 'success',
			triggers: ['form_submit_success'], // Only runs after successful submit
		},
		{
			id: 'auto-reset',
			$type: 'reset',
			resetToDefaults: true,
			triggers: ['form_submit_success'], // Reset form after successful submit
		},
	],
};
```

### 3. Actions Execute Automatically

The FormEngine executes actions automatically based on triggers. You don't need to manually call the executor - it's integrated into the form lifecycle.

## Available Plugins

### Submit Plugin

Handles form submission with configurable request handling:

```typescript
submitPlugin({
	// Custom request adapter (default: fetch)
	request: (url, data) => axios.post(url, data),

	// Transform data before sending
	transformData: (data, context) => ({
		...data,
		timestamp: new Date().toISOString(),
	}),

	// Success callback
	onSuccess: (data, context) => {
		console.log('Form submitted:', data);
		analytics.track('form_submitted', { formId: context.formId });
	},

	// Error callback
	onError: (error, context) => {
		console.error('Submit failed:', error);
		Sentry.captureException(error);
	},

	// Custom validation
	validate: (context) => {
		if (context.formData.email.includes('spam')) {
			return 'Invalid email domain';
		}
		return true;
	},
});
```

### Reset Plugin

Handles form reset with confirmation and cleanup:

```typescript
resetPlugin({
	// Custom confirmation (default: window.confirm)
	confirm: async (message) => {
		const { isConfirmed } = await Swal.fire({
			title: 'Reset Form?',
			text: message,
			icon: 'warning',
			showCancelButton: true,
		});
		return isConfirmed;
	},

	// Custom draft clearing
	clearDraft: (formId) => {
		localStorage.removeItem(`draft_${formId}`);
		api.deleteDraft(formId);
	},

	// Reset callback
	onReset: (context) => {
		toast.success('Form reset successfully');
		analytics.track('form_reset', { formId: context.formId });
	},
});
```

### Notification Plugin

Displays user notifications with configurable handlers:

```typescript
notificationPlugin({
	onSuccess: (message) => toast.success(message),
	onError: (message) => toast.error(message),
	onWarning: (message) => toast.warning(message),
	onInfo: (message) => toast.info(message),
});
```

### Auto-Save Plugin

Automatically saves form drafts:

```typescript
autoSavePlugin({
	// Custom storage backend
	storage: {
		save: async (key, data) => {
			await api.saveDraft(key, data);
		},
		load: async (key) => {
			return await api.loadDraft(key);
		},
		remove: async (key) => {
			await api.deleteDraft(key);
		},
	},

	// Save callback
	onSave: (data, context) => {
		console.log(`Draft saved for ${context.formId}`);
	},

	// Error callback
	onError: (error, context) => {
		console.error('Auto-save failed:', error);
		// Fallback to localStorage
		localStorage.setItem(`backup_${context.formId}`, JSON.stringify(data));
	},
});
```

## Form Action Triggers

Actions can respond to these trigger events:

- `form_mount` - Form initialization
- `form_change` - Any form field changes
- `form_submit` - Form submission initiated
- `form_submit_success` - Submit completed successfully
- `form_submit_error` - Submit failed
- `form_submit_complete` - Submit finished (success or error)
- `step_change` - Multi-step form navigation
- `step_submit` - Step-specific submission
- `step_enter` - Entering a step
- `step_leave` - Leaving a step
- `step_view` - Step became visible

### Trigger Usage

```typescript
{
  id: 'success-notification',
  $type: 'show_notification',
  message: 'Form submitted!',
  triggers: ['form_submit_success'],  // Only after successful submit
}
```

## Creating Custom Plugins

### Plugin Structure

A form action plugin must implement `BuilderActionRegistration`:

```typescript
import { z } from 'zod';
import type { BuilderActionRegistration } from '@schema-engine/forms';

// 1. Define your action schema
const MyActionSchema = z.object({
	id: z.string(),
	$type: z.literal('my_action'),
	message: z.string(),
	enabled: z.boolean().optional(),
	triggers: z.array(z.string()).optional(),
});

type MyActionConfig = z.infer<typeof MyActionSchema>;

// 2. Define plugin configuration (for the factory)
export interface MyPluginConfig {
	onExecute?: (data: any, context: BuilderActionExecutionContext) => void;
	validate?: (context: BuilderActionExecutionContext) => boolean | string;
}

// 3. Create plugin factory function
export function myPlugin(
	config: MyPluginConfig = {}
): BuilderActionRegistration<'my_action', MyActionConfig> {
	return {
		$type: 'my_action',
		schema: MyActionSchema,
		metadata: {
			name: 'My Custom Action',
			description: 'Does something custom with form data',
			defaultTriggers: ['form_submit'],
		},
		execute: async (context) => {
			// Validate if needed
			if (config.validate) {
				const validation = config.validate(context);
				if (validation !== true) {
					return {
						success: false,
						error: typeof validation === 'string' ? validation : 'Validation failed',
					};
				}
			}

			// Execute custom logic
			try {
				config.onExecute?.(context.formData, context);

				return {
					success: true,
					message: context.config.message,
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
			}
		},
	};
}

// 4. Module augmentation for TypeScript
declare global {
	namespace FormEngine {
		interface ActionRegistry {
			my_action: MyActionConfig;
		}
	}
}
```

### Execution Context

Your plugin receives `BuilderActionExecutionContext`:

```typescript
interface BuilderActionExecutionContext<TConfig> {
	config: TConfig; // Your action configuration
	formId: string; // Form identifier
	formData: Record<string, unknown>; // Current form data
	currentStep: number; // Current step (multi-step forms)
	totalSteps: number; // Total steps
	isValid: boolean; // Form validation state
	errors: Record<string, unknown>; // Validation errors
	trigger: FormActionTrigger; // What triggered this action
	metadata: {
		stepStartTime: number;
		totalFormTime: number;
		userInteractions: number;
	};
	form: {
		// Framework-agnostic form controller
		reset: () => void;
		setValue: (name: string, value: unknown) => void;
		getValue: (name: string) => unknown;
		validate: () => Promise<boolean>;
	};
}
```

## Key Concepts

### Generic Action System

The action execution logic lives in `@schema-engine/actions` and is completely domain-agnostic:

```typescript
// From @schema-engine/actions
import { ActionExecutor } from '@schema-engine/actions';
import type { ActionExecutionContext, ActionExecutionResult } from '@schema-engine/actions';

// The executor works with any domain-specific types
type MyExecutor = ActionExecutor<MyConfig, MyContext, MyTrigger>;
```

### Form-Specific Implementation

Forms package provides:

1. **Form-specific types**: `FormActionConfig`, `FormActionContext`, `FormActionTrigger`
2. **Form plugins**: Submit, Reset, Notification, Auto-Save, GTM
3. **Integration with FormEngine**: Automatic action execution

### Execution Context

Every action handler receives:

```typescript
interface ActionExecutionContext<TContext, TTrigger> {
	trigger: TTrigger; // What triggered this action
	context: TContext; // Domain-specific context (FormActionContext for forms)
}
```

For forms, the context includes:

```typescript
interface FormActionContext {
	formId: string;
	formData: Record<string, unknown>;
	currentStep: number;
	totalSteps: number;
	isValid: boolean;
	errors: Record<string, unknown>;
	form: UseFormReturn<any>; // React Hook Form controller
	metadata: {
		/* timing info */
	};
}
```

## Migration Guide

### From Old ActionExecutor Class

**Before:**

```typescript
import { ActionExecutor } from '@/actions/action-executor';

const executor = new ActionExecutor(engine);
await executor.executeTrigger(actions, 'form_submit', source);
```

**After:**

```typescript
import { ActionExecutor } from '@schema-engine/actions';

// FormEngine creates and uses the executor internally
// You don't need to manually instantiate or call it
```

The FormEngine now handles action execution automatically as part of the form lifecycle.

### Benefits

1. **Domain Agnostic**: Core action system can be reused in workflows, UI state machines, etc.
2. **Maximum Flexibility**: Every aspect of behavior can be customized via plugins
3. **Type Safety**: Full TypeScript support with proper generic constraints
4. **Sequential Execution**: Predictable order, no race conditions
5. **Easy Testing**: Generic executor and plugins can be tested independently
6. **Clean Architecture**: Clear separation between generic logic and domain-specific plugins

## Best Practices

1. **Use the Generic System**: Import `ActionExecutor` from `@schema-engine/actions`, not from forms
2. **Create Plugin Factories**: Make plugins configurable rather than hardcoded
3. **Handle Errors Gracefully**: Provide meaningful error messages and recovery options
4. **Leverage Lifecycle Triggers**: Use `form_submit_success`/`form_submit_error` for coordinated workflows
5. **Keep Plugins Focused**: Each plugin should handle one responsibility well
6. **Provide Good Defaults**: Make plugins work out-of-the-box with sensible defaults

The generic action architecture enables code reuse across different domains while maintaining type safety and preventing common pitfalls like race conditions.
