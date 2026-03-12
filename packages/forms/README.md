# @schema-engine/forms

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
bun add @schema-engine/forms zod
```

## Core Concepts

### FormComposer

The builder provides a fluent API for registering components and creating immutable engine instances.

```typescript
import { FormComposer } from '@schema-engine/forms';

const engine = new FormComposer()
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

- Retrieving registered components by registered type
- Validating form configurations against registered schemas
- Generating JSON schemas for form builders and documentation
- Creating type-safe form instances

```typescript
const element = engine.getElement('text');
const allElements = engine.getAllElements();
const hasEmail = engine.hasElement('email');

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
	$type: string; // Unique identifier
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
import type { ElementRegistration } from '@schema-engine/forms';
import { z } from 'zod';

const TextInputConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	placeholder: z.string().optional(),
	defaultValue: z.string().optional(),
	disabled: z.boolean().optional(),
});

export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	$type: 'text',
	schema: TextInputConfigSchema,
	metadata: {
		name: 'Text Input',
		description: 'Single-line text input field',
		category: 'input',
		icon: 'text',
		tags: ['input', 'text', 'basic'],
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
import type { LayoutRegistration } from '@schema-engine/forms';

const CardLayoutConfigSchema = z.object({
	id: z.string(),
	padding: z.enum(['none', 'small', 'medium', 'large']).optional(),
	shadow: z.boolean().optional(),
	className: z.string().optional(),
});

export const cardLayoutRegistration: LayoutRegistration<z.infer<typeof CardLayoutConfigSchema>> = {
	$type: 'card',
	schema: CardLayoutConfigSchema,
	metadata: {
		name: 'Card Layout',
		description: 'Display form in a centered card container',
		icon: 'card',
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
import type { StepperRegistration } from '@schema-engine/forms';

const WizardStepperConfigSchema = z.object({
	id: z.string(),
	showProgress: z.boolean().optional(),
	allowSkip: z.boolean().optional(),
});

export const wizardStepperRegistration: StepperRegistration<z.infer<typeof WizardStepperConfigSchema>> = {
	$type: 'wizard',
	schema: WizardStepperConfigSchema,
	metadata: {
		name: 'Wizard Stepper',
		description: 'Step-by-step wizard navigation with progress indicator',
		icon: 'wizard',
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
import { z } from 'zod';
import { defineAction } from '@schema-engine/actions';
import type { BuilderActionBaseContext, BuilderActionRegistration, BuilderActionTrigger } from '@schema-engine/forms';

const defineFormAction = defineAction<BuilderActionBaseContext, BuilderActionTrigger>();

const SubmitActionConfigSchema = z.object({
	id: z.string(),
	$type: z.literal('submit'),
	endpoint: z.string(),
	method: z.enum(['POST', 'PUT', 'PATCH']),
	successMessage: z.string().optional(),
	redirectUrl: z.string().optional(),
});

export const submitActionRegistration: BuilderActionRegistration<
	'submit',
	z.infer<typeof SubmitActionConfigSchema>
> = defineFormAction({
	$type: 'submit',
	schema: SubmitActionConfigSchema,
	metadata: {
		name: 'Submit Form',
		description: 'Submit form data to an endpoint',
		icon: 'send',
		defaultTriggers: ['form_submit'],
	},
	execute: async (context) => {
		const { config, formData, formId } = context;

		try {
			const response = await fetch(config.endpoint, {
				method: config.method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
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
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});
```

### Action System

Actions execute in response to lifecycle triggers:

**Form Triggers:**

- `form_mount` - Form initialization
- `form_change` - Any field change
- `form_submit` - Form submission initiated

**Submit Lifecycle:**

- `form_submit_start` - Submit process begins
- `form_submit_success` - Submit completed successfully
- `form_submit_error` - Submit failed
- `form_submit_complete` - Submit finished (success or failure)

**Step Triggers:**

- `step_change` - Navigation between steps
- `step_submit` - Submission of the current step
- `step_enter` - Entering a step
- `step_leave` - Leaving a step
- `step_view` - Step becomes visible (analytics)

Actions can specify default triggers in metadata or be configured per-form:

```typescript
// Default triggers from registration
metadata: {
  defaultTriggers: ['form_submit', 'form_submit_success']
}

// Override in form config
{
  id: 'custom-action',
  $type: 'submit',
  triggers: ['form_change']
}
```

Custom actions should usually be defined with `defineAction<BuilderActionBaseContext, BuilderActionTrigger>()` so handlers get the full forms runtime context with `formData`, `errors`, `metadata`, `config`, and `trigger` typed correctly.

### Validation System

The validation system provides 15+ built-in rules with support for custom validation:

```typescript
import { ValidationPresets } from '@schema-engine/forms';

const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Invalid email address'),
	ValidationPresets.string.maxLength(100, 'Email too long'),
];

const passwordRules = [
	ValidationPresets.string.required('Password is required'),
	ValidationPresets.string.minLength(8, 'At least 8 characters'),
	ValidationPresets.string.pattern(
		'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
		'Must contain uppercase, lowercase, and number',
	),
];

const ageRules = [
	ValidationPresets.number.required('Age is required'),
	ValidationPresets.number.min(18, 'Must be 18 or older'),
	ValidationPresets.number.max(120, 'Invalid age'),
];
```

**Available Presets:**

**String:**

- `required(message)` - Non-empty string
- `email(message)` - Valid email format
- `url(message)` - Valid URL format
- `uuid(message)` - Valid UUID
- `uuidv4(message)` - Valid UUID v4
- `cuid(message)` - Valid CUID
- `cuid2(message)` - Valid CUID2
- `ulid(message)` - Valid ULID
- `hex(message)` - Valid hexadecimal string
- `minLength(min, message)` - Minimum string length
- `maxLength(max, message)` - Maximum string length
- `pattern(regex, message)` - Regex pattern match

**Number:**

- `required(message)` - Non-null number
- `min(min, message)` - Minimum value
- `max(max, message)` - Maximum value

**Boolean:**

- `required(message)` - Required boolean value

**Array:**

- `required(message)` - Non-empty array
- `minItems(min, message)` - Minimum array length
- `maxItems(max, message)` - Maximum array length
- `nonEmpty(message)` - Convenience alias for `minItems(1, message)`

**Network:**

- `ipv4(message)` - Valid IPv4 address
- `ipv6(message)` - Valid IPv6 address

**Date:**

- `datetime(message)` - Valid datetime
- `date(message)` - Valid date
- `time(message)` - Valid time

### JSON Schema Generation

The engine provides comprehensive JSON Schema generation for validation, storage, and documentation:

```typescript
// 1. Generate schema for individual components (documentation)
const collection = engine.generateJSONSchemaCollection({
	target: 'draft-2020-12',
});
// Returns: { schemas: { 'element:text': {...}, 'element:email': {...}, ... } }

// 2. Generate schema for form configuration (validation & storage)
const configSchema = engine.generateFormConfigSchema({
	target: 'draft-2020-12',
});
// Returns: Complete JSON Schema for form config objects

// 3. Get Zod schema for runtime validation
const zodSchema = engine.getFormConfigSchema();
const result = zodSchema.safeParse(formConfig);
```

**Use Cases:**

**Component Schemas** (`generateJSONSchemaCollection`)

- API documentation
- Component library docs
- IDE autocomplete for individual components

**Form Config Schema** (`generateFormConfigSchema`)

- Store schemas in database for versioning
- Export as JSON files for sharing
- Validate configs with external tools (Ajv)
- Generate OpenAPI/Swagger docs
- Provide editor validation for form JSON

**Zod Schema** (`getFormConfigSchema`)

- Runtime validation before rendering
- Type-safe parsing with TypeScript
- Form builder validation

```typescript
// Example: Store schema in database
const schema = engine.generateFormConfigSchema();
await db.schemas.insert({
	version: '1.0.0',
	schema,
	createdAt: new Date(),
});

// Example: Validate with Ajv
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(schema);
const isValid = validate(userFormConfig);
```

## Built-in Action Plugins

The core package includes production-ready action plugins:

### Submit Plugin

Submit form data to an endpoint with configurable request handling:

```typescript
import { FormComposer, SubmitActionRegistration } from '@schema-engine/forms';

const engine = new FormComposer()
  .addAction(SubmitActionRegistration)
  .build();

// Usage in form config
{
	id: 'submit-form',
	$type: 'submit',
	endpoint: '/api/forms',
	method: 'POST',
	successMessage: 'Form submitted successfully!',
	redirectUrl: '/thank-you',
}
```

### Auto-save Plugin

Automatically save form progress with configurable debouncing:

```typescript
import { FormComposer, AutoSaveActionRegistration } from '@schema-engine/forms';

const engine = new FormComposer()
  .addAction(AutoSaveActionRegistration)
  .build();

// Usage in form config
{
	id: 'auto-save',
	$type: 'auto_save',
	storageKey: 'contact-form-draft',
	debounceMs: 1000,
	triggers: ['form_change'],
}
```

### Notification Plugin

Display user notifications for form events:

```typescript
import { FormComposer, NotificationActionRegistration } from '@schema-engine/forms';

const engine = new FormComposer()
  .addAction(NotificationActionRegistration)
  .build();

// Usage in form config
{
	id: 'success-notification',
	$type: 'show_notification',
	message: 'Form submitted successfully!',
	variant: 'success',
	triggers: ['form_submit_success'],
}
```

### GTM Plugin

Track form events in Google Tag Manager:

```typescript
import { FormComposer, GTMActionRegistration } from '@schema-engine/forms';

const engine = new FormComposer()
  .addAction(GTMActionRegistration)
  .build();

// Usage in form config
{
  id: 'track-submit',
	$type: 'gtm_event',
	eventName: 'form_submit',
	eventData: {
    formId: 'contact-form',
    category: 'engagement',
  },
  triggers: ['form_submit'],
}
```

### Reset Plugin

Reset form to initial state:

```typescript
import { FormComposer, ResetActionRegistration } from '@schema-engine/forms';

const engine = new FormComposer()
  .addAction(ResetActionRegistration)
  .build();

// Usage in form config
{
  id: 'reset-form',
  $type: 'reset',
  triggers: ['manual_reset'],
}
```

## Advanced Usage

### Custom Registries

Inject custom registry implementations for specialized behavior:

```typescript
import { ElementRegistry } from '@schema-engine/forms';

class CustomElementRegistry extends ElementRegistry {
	register(registration) {
		// Custom validation or transformation
		if (!this.validateCustomRules(registration)) {
			throw new Error('Invalid registration');
		}
		super.register(registration);
	}
}

const customRegistry = new CustomElementRegistry();
customRegistry.register(textInputRegistration);

const engine = new FormComposer(customRegistry).build();
```

### Extending Engines

Create specialized engines by extending existing configurations:

```typescript
// Create a base builder
const baseBuilder = new FormComposer().addElement(textInputRegistration).addElement(emailInputRegistration);

// Clone and extend the builder
const extendedBuilder = baseBuilder
	.clone()
	.addAction(submitActionRegistration)
	.addAction(notificationActionRegistration);

const engine = extendedBuilder.build();

// Or convert an existing engine back to a composer
const baseEngine = baseBuilder.build();
const modifiedEngine = baseEngine.toComposer().addAction(customActionRegistration).build();
```

### Type-Safe Configurations

Leverage TypeScript's inference for type-safe form configurations:

```typescript
const builder = new FormComposer()
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.addAction(submitActionRegistration);

type MyEngineElements = typeof builder extends FormComposer<infer E, any, any, any> ? E : never;

// MyEngineElements = {
//   text: TextInputConfig;
//   email: EmailInputConfig;
// }
```

## Tools

### GDPR Consent

Manage GDPR consent with localStorage persistence:

```typescript
import { GDPRConsent } from '@schema-engine/forms';

// Check consent
if (GDPRConsent.hasConsent()) {
	// Track analytics
}

// Grant consent for draft storage
GDPRConsent.grantConsent();

// Revoke consent and clear stored drafts
GDPRConsent.revokeConsent();
```

### GTM Tracker

Wrapper for Google Tag Manager integration:

```typescript
import { GTMTracker } from '@schema-engine/forms';

GTMTracker.push('form_submit', {
	formId: 'contact-form',
	category: 'engagement',
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
	BuilderActionRuntimeContext,
	BuilderActionTrigger,

	// Engine
	EngineRegistries,
	FormEngineSchemaMetadata,
} from '@schema-engine/forms';
```

## Package Structure

```
@schema-engine/forms
├── index.ts                    # Main exports
├── builder/                    # FormComposer
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
import { FormComposer, SubmitActionRegistration, ValidationPresets } from '@schema-engine/forms';
```

## Testing

Comprehensive test suite covering:

- Builder pattern registration and type inference
- Engine component retrieval and validation
- Action execution and lifecycle management
- Validation rule application
- JSON schema generation

Run tests:

```bash
bun test
```

## License

MIT
