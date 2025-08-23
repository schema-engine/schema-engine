# Form Engine Actions: Pure Plugin Architecture

## Overview

The Form Engine action system has been redesigned with a **pure plugin architecture** that provides maximum flexibility and configurability:

- ✅ **Plugin-Only System**: No hardcoded core actions - everything is a plugin
- ✅ **Factory Pattern**: Configurable plugin creation with sensible defaults
- ✅ **Type Safety**: Full TypeScript support with module augmentation
- ✅ **Sequential Execution**: Actions run one after another, preventing race conditions
- ✅ **Submit Lifecycle**: Complete submit_start → submit_success/error → submit_complete flow
- ✅ **Maximum Configurability**: Every aspect of behavior can be customized

## Architecture

### Core Components

#### 1. Action Executor (`action-executor.ts`)

- Minimal executor with pure registry delegation
- Sequential action execution for predictable behavior
- Submit lifecycle management (submit_start/success/error/complete)
- No hardcoded action logic - everything goes through plugins

#### 2. Action Registry (`action-registry.ts`)

- Central registry for all plugin actions
- Runtime validation with Zod schemas
- Type-safe handler execution
- Default trigger mapping per action type

#### 3. Plugin Factories (`plugins/`)

- **Submit Plugin**: Configurable form submission with custom request adapters
- **Reset Plugin**: Form reset with custom confirmation and cleanup
- **Notification Plugin**: User notifications with custom handlers
- **Auto-Save Plugin**: Draft saving with configurable storage backends

## Quick Start

### 1. Register Plugins

```typescript
import { registerAction } from "@/lib/form-engine/actions/action-registry";
import { submitPlugin, resetPlugin, notificationPlugin } from "@/lib/form-engine/actions/plugins";
import { toast } from "react-hot-toast";

// Configure submit behavior
registerAction(
	submitPlugin({
		onSuccess: (data, context) => console.log("Submitted:", data),
		onError: (error, context) => console.error("Submit failed:", error),
	})
);

// Configure reset behavior
registerAction(
	resetPlugin({
		confirm: (message) => window.confirm(message),
		onReset: () => toast.success("Form reset!"),
	})
);

// Configure notifications
registerAction(
	notificationPlugin({
		onSuccess: (message) => toast.success(message),
		onError: (message) => toast.error(message),
	})
);
```

### 2. Define Actions in Your Form

```typescript
const actions = [
	{
		id: "submit-form",
		type: "submit",
		endpoint: "/api/submit",
		method: "POST",
		successMessage: "Form submitted successfully!",
	},
	{
		id: "success-notification",
		type: "show_notification",
		message: "Thank you for your submission!",
		variant: "success",
		triggers: ["submit_success"], // Only runs after successful submit
	},
	{
		id: "auto-reset",
		type: "reset",
		resetToDefaults: true,
		triggers: ["submit_success"], // Reset form after successful submit
	},
];
```

### 3. Execute Actions

```typescript
import { ActionExecutor } from "@/lib/form-engine/actions/action-executor";

const executor = new ActionExecutor();

// Execute on form submit
const results = await executor.executeTrigger(actions, "form_submit", {
	formId: "contact-form",
	formData: { name: "John", email: "john@example.com" },
	isValid: true,
	// ... other form state
});
```

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
		console.log("Form submitted:", data);
		analytics.track("form_submitted", { formId: context.formId });
	},

	// Error callback
	onError: (error, context) => {
		console.error("Submit failed:", error);
		Sentry.captureException(error);
	},

	// Custom validation
	validate: (context) => {
		if (context.formData.email.includes("spam")) {
			return "Invalid email domain";
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
			title: "Reset Form?",
			text: message,
			icon: "warning",
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
		toast.success("Form reset successfully");
		analytics.track("form_reset", { formId: context.formId });
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
		console.error("Auto-save failed:", error);
		// Fallback to localStorage
		localStorage.setItem(`backup_${context.formId}`, JSON.stringify(data));
	},
});
```

## Action Triggers

Actions can respond to various trigger events:

- `form_start` - Form initialization
- `form_change` - Any form field changes
- `form_submit` - Form submission initiated
- `step_change` - Multi-step form navigation
- `step_submit` - Step-specific submission
- `submit_start` - Submit process begins
- `submit_success` - Submit completed successfully
- `submit_error` - Submit failed
- `submit_complete` - Submit process finished (success or error)
- `manual_save` - User manually saves draft
- `manual_reset` - User manually resets form

## Creating Custom Plugins

Create your own plugin factory:

```typescript
import { z } from "zod";
import { registerAction } from "@/lib/form-engine/actions/action-registry";

const MyActionSchema = z.object({
	id: z.string(),
	type: z.literal("my_action"),
	// ... your schema
});

export function myPlugin(config: MyPluginConfig = {}) {
	return {
		type: "my_action",
		schema: MyActionSchema,
		defaultTriggers: ["form_submit"],
		handler: async (action, context) => {
			// Your implementation
			return { success: true, message: "Done!" };
		},
	};
}

// Module augmentation for TypeScript
declare module "@/lib/form-engine/actions/types" {
	interface PluginActions {
		my_action: z.infer<typeof MyActionSchema>;
	}
}
```

## Migration Guide

### From Core + Plugin System

The old system had a core submit action. Now everything is a plugin:

**Before:**

```typescript
// Core submit action + plugins
{
  id: "submit",
  type: "submit", // Handled by core
  endpoint: "/api/submit"
}
```

**After:**

```typescript
// Register submit plugin first
registerAction(submitPlugin({
  onSuccess: (data) => console.log("Success:", data)
}));

// Same action config works
{
  id: "submit",
  type: "submit", // Now handled by plugin
  endpoint: "/api/submit"
}
```

### Benefits

1. **Maximum Flexibility**: Every aspect of behavior can be customized
2. **No Lock-in**: Replace any plugin with your own implementation
3. **Type Safety**: Full TypeScript support for all plugins
4. **Sequential Execution**: Predictable order, no race conditions
5. **Easy Testing**: Each plugin can be tested independently
6. **Clean Architecture**: No hardcoded logic in core

## Best Practices

1. **Use Factory Pattern**: Always create configurable plugins rather than hardcoded ones
2. **Handle Errors Gracefully**: Provide meaningful error messages and recovery options
3. **Leverage Lifecycle Triggers**: Use submit_success/error for coordinated workflows
4. **Keep Plugins Focused**: Each plugin should handle one responsibility well
5. **Provide Good Defaults**: Make plugins work out-of-the-box with sensible defaults
6. **Document Your Plugins**: Include JSDoc comments and usage examples

The pure plugin architecture provides maximum flexibility while maintaining type safety and preventing common pitfalls like race conditions and uncoordinated workflows.
