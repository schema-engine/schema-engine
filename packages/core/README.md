# @json-form-engine/core

Framework-agnostic core engine for building type-safe, JSON-configured forms with advanced validation, actions, and extensibility.

## Overview

The core package provides the foundational architecture for the JSON Form Engine ecosystem. It enables developers to:

- Build type-safe form configurations using a fluent builder pattern
- Register and manage form components (elements, layouts, steppers, actions)
- Generate JSON schemas for validation and tooling
- Execute form actions in response to lifecycle events
- Validate form data with 15+ built-in rules and custom validation support
- Serialize and deserialize form configurations for storage or transmission

The package is completely framework-agnostic, with framework-specific adapters (React, Vue, etc.) built on top.

## Installation

```bash
bun add @json-form-engine/core zod
```

## Core Concepts

### FormEngineBuilder

The builder provides a fluent API for registering components and creating immutable engine instances.

```typescript
import { FormEngineBuilder } from "@json-form-engine/core";

const engine = new FormEngineBuilder()
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.addLayout(cardLayoutRegistration)
	.addAction(submitActionRegistration)
	.build();
```

**Features:**

- Type-safe component registration with full TypeScript inference
- Method chaining for readable configuration
- Automatic validation of duplicate registrations
- Immutable engine instances after build
- Support for custom registry implementations via dependency injection

### FormEngine

The immutable runtime engine created by the builder. Provides methods for:

- Retrieving registered components by ID
- Validating form configurations against registered schemas
- Generating JSON schemas for form builders and documentation
- Creating type-safe form instances

```typescript
const element = engine.getElement("text");
const allElements = engine.getAllElements();
const hasEmail = engine.hasElement("email");

const summary = engine.getSummary();
// {
//   elements: { count: 2, ids: ['text', 'email'] },
//   layouts: { count: 1, ids: ['card'] },
//   steppers: { count: 0, ids: [] },
//   actions: { count: 1, types: ['submit'] }
// }
```

### Component Registration

All components share a common registration pattern:

```typescript
export interface BaseRegistration<TConfig, TMeta> {
	__id: string; // Unique identifier
	schema: z.ZodType<TConfig>; // Zod schema for validation
	metadata: TMeta; // Component metadata
}
```

#### Elements

Elements are form fields and content components categorized by purpose:

- **input** - Form inputs (text, email, select, etc.)
- **content** - Static content (headings, paragraphs, images)
- **decoration** - Visual elements (dividers, spacers)
- **interactive** - Interactive components (buttons, links)

```typescript
import type { ElementRegistration } from "@json-form-engine/core";
import { z } from "zod";

const TextInputConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	placeholder: z.string().optional(),
	defaultValue: z.string().optional(),
	disabled: z.boolean().optional(),
});

export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	__id: "text",
	schema: TextInputConfigSchema,
	metadata: {
		name: "Text Input",
		description: "Single-line text input field",
		category: "input",
		icon: "text",
		tags: ["input", "text", "basic"],
	},
	render: (props) => {
		// Framework-specific implementation
		return YourTextInputComponent(props);
	},
};
```

#### Layouts

Layouts wrap form content and provide structural organization:

```typescript
import type { LayoutRegistration } from "@json-form-engine/core";

const CardLayoutConfigSchema = z.object({
	id: z.string(),
	padding: z.enum(["none", "small", "medium", "large"]).optional(),
	shadow: z.boolean().optional(),
	className: z.string().optional(),
});

export const cardLayoutRegistration: LayoutRegistration<z.infer<typeof CardLayoutConfigSchema>> = {
	__id: "card",
	schema: CardLayoutConfigSchema,
	metadata: {
		name: "Card Layout",
		description: "Display form in a centered card container",
		icon: "card",
	},
	render: (props) => {
		// props.children contains the form content
		return YourCardComponent(props);
	},
};
```

#### Steppers

Steppers control multi-step form navigation and state:

```typescript
import type { StepperRegistration } from "@json-form-engine/core";

const WizardStepperConfigSchema = z.object({
	id: z.string(),
	showProgress: z.boolean().optional(),
	allowSkip: z.boolean().optional(),
});

export const wizardStepperRegistration: StepperRegistration<
	z.infer<typeof WizardStepperConfigSchema>
> = {
	__id: "wizard",
	schema: WizardStepperConfigSchema,
	metadata: {
		name: "Wizard Stepper",
		description: "Step-by-step wizard navigation with progress indicator",
		icon: "wizard",
	},
	render: (props) => {
		// props contains stepper state and navigation methods
		return YourWizardComponent(props);
	},
};
```

#### Actions

Actions are event handlers that execute in response to form lifecycle events:

```typescript
import type { BuilderActionRegistration } from "@json-form-engine/core";

const SubmitActionConfigSchema = z.object({
	id: z.string(),
	type: z.literal("submit"),
	endpoint: z.string(),
	method: z.enum(["POST", "PUT", "PATCH"]),
	successMessage: z.string().optional(),
	redirectUrl: z.string().optional(),
});

export const submitActionRegistration: BuilderActionRegistration<
	z.infer<typeof SubmitActionConfigSchema>
> = {
	__id: "submit",
	schema: SubmitActionConfigSchema,
	metadata: {
		name: "Submit Form",
		description: "Submit form data to an endpoint",
		icon: "send",
		defaultTriggers: ["form_submit"],
	},
	execute: async (context) => {
		const { config, form, formId } = context;

		try {
			const response = await fetch(config.endpoint, {
				method: config.method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form.getValues()),
			});

			if (!response.ok) {
				return {
					success: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
				};
			}

			return {
				success: true,
				data: await response.json(),
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
};
```

### Action System

Actions execute in response to lifecycle triggers:

**Form Triggers:**

- `form_start` - Form initialization
- `form_change` - Any field change
- `form_submit` - Form submission initiated

**Submit Lifecycle:**

- `submit_start` - Submit process begins
- `submit_success` - Submit completed successfully
- `submit_error` - Submit failed
- `submit_complete` - Submit finished (success or failure)

**Step Triggers:**

- `step_change` - Navigation between steps
- `step_enter` - Entering a step
- `step_leave` - Leaving a step
- `step_view` - Step becomes visible (analytics)

**Manual Triggers:**

- `manual_save` - Explicit save action
- `manual_reset` - Explicit reset action

Actions can specify default triggers in metadata or be configured per-form:

```typescript
// Default triggers from registration
metadata: {
  defaultTriggers: ['form_submit', 'submit_success']
}

// Override in form config
{
  id: 'custom-action',
  type: 'submit',
  triggers: ['form_change', 'manual_save']
}
```

The `ActionExecutor` handles sequential execution with comprehensive lifecycle management:

```typescript
import { ActionExecutor } from "@json-form-engine/core/actions";

const executor = new ActionExecutor(engine);

await executor.executeTrigger(formConfig.actions, "form_submit", {
	formId: "contact-form",
	form: formInstance,
	currentStep: 0,
});
```

### Validation System

The validation system provides 15+ built-in rules with support for custom validation:

```typescript
import { ValidationPresets } from "@json-form-engine/core/schemas/validation";

const emailRules = [
	ValidationPresets.string.required("Email is required"),
	ValidationPresets.string.email("Invalid email address"),
	ValidationPresets.string.maxLength(100, "Email too long"),
];

const passwordRules = [
	ValidationPresets.string.required("Password is required"),
	ValidationPresets.string.minLength(8, "At least 8 characters"),
	ValidationPresets.string.pattern(
		"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
		"Must contain uppercase, lowercase, and number"
	),
];

const ageRules = [
	ValidationPresets.number.required("Age is required"),
	ValidationPresets.number.min(18, "Must be 18 or older"),
	ValidationPresets.number.max(120, "Invalid age"),
];
```

**Available Presets:**

**String:**

- `required(message)` - Non-empty string
- `email(message)` - Valid email format
- `url(message)` - Valid URL format
- `uuid(message)` - Valid UUID
- `uuidv4(message)` - Valid UUID v4
- `minLength(min, message)` - Minimum string length
- `maxLength(max, message)` - Maximum string length
- `pattern(regex, message)` - Regex pattern match
- `ip(message)` - Valid IP address

**Number:**

- `required(message)` - Non-null number
- `min(min, message)` - Minimum value
- `max(max, message)` - Maximum value

**Array:**

- `required(message)` - Non-empty array
- `minItems(min, message)` - Minimum array length
- `maxItems(max, message)` - Maximum array length

**Date:**

- `date(message)` - Valid date
- `dateTime(message)` - Valid datetime
- `time(message)` - Valid time

### JSON Schema Generation

Generate JSON schemas for form builders, documentation, and API specifications:

```typescript
// Collection of individual schemas (one per component)
const collection = engine.generateJSONSchemaCollection({
	target: "draft-2020-12",
});
// { schemas: { 'element:text': {...}, 'element:email': {...}, ... } }

// Unified schema with $defs (recommended)
const schema = engine.generateJSONSchema({
	target: "draft-2020-12",
	includeFormSchema: true,
});
// {
//   $schema: "https://json-schema.org/draft/2020-12/schema",
//   $id: "form-config-schema",
//   $defs: { ... },
//   type: "object",
//   properties: { ... }
// }

// Schema for external tools (OpenAPI)
const openApiSchema = engine.generateJSONSchema({
	target: "openapi-3.0",
});
```

The schema generator uses Zod's native registry-based generation to handle:

- Nested component relationships
- Recursive schemas
- Discriminated unions for element types
- Proper $ref resolution
- Schema normalization (anyOf to oneOf)

### Serialization

Convert form configurations to/from JSON for storage or transmission:

```typescript
import type { SerializableFormConfig } from "@json-form-engine/core/engine";

const formConfig: SerializableFormConfig = {
	id: "contact-form",
	title: "Contact Us",
	fields: [
		{
			id: "text",
			config: {
				name: "email",
				label: "Email Address",
				placeholder: "you@example.com",
			},
		},
	],
	actions: [
		{
			id: "submit",
			config: {
				endpoint: "/api/contact",
				method: "POST",
			},
			triggers: ["form_submit"],
		},
	],
};

// Validate serializability
import { isSerializable } from "@json-form-engine/core/engine";

if (isSerializable(formConfig)) {
	// Safe to store or transmit
	await saveToDatabase(formConfig);
}
```

## Built-in Action Plugins

The core package includes production-ready action plugins:

### Submit Plugin

Submit form data to an endpoint with configurable request handling:

```typescript
import { SubmitActionRegistration } from '@json-form-engine/core/actions/plugins';

const engine = new FormEngineBuilder()
  .addAction(SubmitActionRegistration)
  .build();

// Usage in form config
{
  id: 'submit-form',
  type: 'submit',
  endpoint: '/api/forms',
  method: 'POST',
  successMessage: 'Form submitted successfully!',
  redirectUrl: '/thank-you',
}
```

### Auto-save Plugin

Automatically save form progress with configurable debouncing:

```typescript
import { AutoSaveActionRegistration } from '@json-form-engine/core/actions/plugins';

const engine = new FormEngineBuilder()
  .addAction(AutoSaveActionRegistration)
  .build();

// Usage in form config
{
  id: 'auto-save',
  type: 'auto-save',
  storageKey: 'contact-form-draft',
  debounceMs: 1000,
  triggers: ['form_change'],
}
```

### Notification Plugin

Display user notifications for form events:

```typescript
import { NotificationActionRegistration } from '@json-form-engine/core/actions/plugins';

const engine = new FormEngineBuilder()
  .addAction(NotificationActionRegistration)
  .build();

// Usage in form config
{
  id: 'success-notification',
  type: 'notification',
  message: 'Form submitted successfully!',
  variant: 'success',
  triggers: ['submit_success'],
}
```

### GTM Plugin

Track form events in Google Tag Manager:

```typescript
import { GTMActionRegistration } from '@json-form-engine/core/actions/plugins';

const engine = new FormEngineBuilder()
  .addAction(GTMActionRegistration)
  .build();

// Usage in form config
{
  id: 'track-submit',
  type: 'gtm',
  event: 'form_submit',
  data: {
    formId: 'contact-form',
    category: 'engagement',
  },
  triggers: ['form_submit'],
}
```

### Reset Plugin

Reset form to initial state:

```typescript
import { ResetActionRegistration } from '@json-form-engine/core/actions/plugins';

const engine = new FormEngineBuilder()
  .addAction(ResetActionRegistration)
  .build();

// Usage in form config
{
  id: 'reset-form',
  type: 'reset',
  triggers: ['manual_reset'],
}
```

## Advanced Usage

### Custom Registries

Inject custom registry implementations for specialized behavior:

```typescript
import { ElementRegistry } from "@json-form-engine/core/registries";

class CustomElementRegistry extends ElementRegistry {
	register(registration) {
		// Custom validation or transformation
		if (!this.validateCustomRules(registration)) {
			throw new Error("Invalid registration");
		}
		super.register(registration);
	}
}

const customRegistry = new CustomElementRegistry();
customRegistry.register(textInputRegistration);

const engine = new FormEngineBuilder(customRegistry).build();
```

### Extending Engines

Create specialized engines by extending existing configurations:

```typescript
const baseEngine = new FormEngineBuilder()
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.build();

// Later, extend with additional components
const extendedEngine = new FormEngineBuilder()
	.addElements(baseEngine.getAllElements())
	.addAction(submitActionRegistration)
	.addAction(notificationActionRegistration)
	.build();
```

### Type-Safe Configurations

Leverage TypeScript's inference for type-safe form configurations:

```typescript
const builder = new FormEngineBuilder()
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.addAction(submitActionRegistration);

type MyEngineElements = typeof builder extends FormEngineBuilder<infer E, any, any, any>
	? E
	: never;

// MyEngineElements = {
//   text: TextInputConfig;
//   email: EmailInputConfig;
// }
```

## Tools

### GDPR Consent

Manage GDPR consent with localStorage persistence:

```typescript
import { GDPRConsent } from "@json-form-engine/core/tools";

const consent = new GDPRConsent();

// Check consent
if (consent.hasConsent("analytics")) {
	// Track analytics
}

// Set consent
consent.setConsent({
	analytics: true,
	marketing: false,
});

// Check specific consent
const analyticsEnabled = consent.hasAnalyticsConsent();
const marketingEnabled = consent.hasMarketingConsent();
```

### GTM Tracker

Wrapper for Google Tag Manager integration:

```typescript
import { GTMTracker } from "@json-form-engine/core/tools";

const tracker = new GTMTracker();

tracker.track("form_submit", {
	formId: "contact-form",
	category: "engagement",
	value: 1,
});
```

## Type Exports

All types are fully exported for extension and composition:

```typescript
import type {
	// Registrations
	ElementRegistration,
	LayoutRegistration,
	StepperRegistration,
	BuilderActionRegistration,

	// Metadata
	ComponentMetadata,
	ElementMetadata,
	ActionMetadata,

	// Categories
	ElementCategory,

	// Actions
	BuilderActionExecutionContext,
	BuilderActionExecutionResult,
	BuilderActionTrigger,

	// Engine
	EngineRegistries,
	SerializableFormConfig,
	FormEngineSchemaMetadata,
} from "@json-form-engine/core";
```

## Package Structure

```
@json-form-engine/core/
├── index.ts                    # Main exports
├── builder/                    # FormEngineBuilder
├── engine/                     # FormEngine + schema generation
├── registries/                 # Component registries
├── actions/                    # Action system + built-in plugins
├── schemas/                    # Zod schemas + validation
├── types/                      # TypeScript type definitions
├── tools/                      # Utilities (GDPR, GTM)
├── layouts/                    # Layout type definitions
└── steppers/                   # Stepper type definitions
```

## Tree-Shakable

The package is designed for maximum tree-shaking:

```typescript
// Only import what you need
import { FormEngineBuilder } from "@json-form-engine/core";
import { ValidationPresets } from "@json-form-engine/core/schemas/validation";
import { SubmitActionRegistration } from "@json-form-engine/core/actions/plugins";
```

## Testing

Comprehensive test suite covering:

- Builder pattern registration and type inference
- Engine component retrieval and validation
- Action execution and lifecycle management
- Validation rule application
- JSON schema generation
- Serialization and deserialization

Run tests:

```bash
bun test
```

## License

MIT
