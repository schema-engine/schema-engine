# @json-form-engine/core

Core type system and schemas for building type-safe, JSON-configured forms.

## Installation

```bash
bun add @json-form-engine/core zod
```

## What's Included

- **Type System**: Extensible type-safe field registry with autocomplete
- **Validation**: 15+ built-in validation rules + custom validation support
- **Actions**: Event-driven action system with plugins
- **Schemas**: Zod schemas for runtime validation
- **Tools**: GDPR consent, GTM tracking, and more

## Quick Start

```typescript
import type { FormConfig } from "@json-form-engine/core/schemas";
import { ValidationPresets } from "@json-form-engine/core/schemas/validation";

const formConfig: FormConfig = {
	id: "contact-form",
	title: "Contact Us",
	steps: [
		{
			id: "contact-info",
			title: "Your Information",
			elements: [
				{
					componentId: "input", // Autocomplete shows all available field types
					id: "email",
					name: "email",
					label: "Email Address",
					inputType: "email",
					rules: [
						ValidationPresets.string.required("Email is required"),
						ValidationPresets.string.email("Invalid email"),
					],
				},
			],
		},
	],
};
```

## Type System

Get full TypeScript autocomplete and validation for your form configs:

```typescript
const config: FormConfig = {
	id: "my-form",
	steps: [
		{
			id: "step-1",
			title: "Step 1",
			elements: [
				{
					componentId: "input", // ✅ Autocomplete works here
					id: "field1",
					name: "field1",
					// ✅ TypeScript validates field-specific properties
				},
			],
		},
	],
};
```

**For creating custom field types**, see [TYPE_SYSTEM.md](./TYPE_SYSTEM.md)

## Validation

### Using Built-in Presets

```typescript
import { ValidationPresets } from "@json-form-engine/core/schemas/validation";

const rules = [
	// String validation
	ValidationPresets.string.required("Required"),
	ValidationPresets.string.email("Invalid email"),
	ValidationPresets.string.minLength(3, "At least 3 characters"),
	ValidationPresets.string.maxLength(100, "Maximum 100 characters"),
	ValidationPresets.string.pattern("^[A-Z]", "Must start with capital letter"),
	ValidationPresets.string.url("Invalid URL"),
	ValidationPresets.string.uuid("Invalid UUID"),
	ValidationPresets.string.uuidv4("Invalid UUID v4"),

	// Number validation
	ValidationPresets.number.required("Required"),
	ValidationPresets.number.min(0, "Must be positive"),
	ValidationPresets.number.max(100, "Cannot exceed 100"),

	// Array validation
	ValidationPresets.array.required("Required"),
	ValidationPresets.array.minItems(1, "Select at least one"),
	ValidationPresets.array.maxItems(5, "Maximum 5 items"),
	ValidationPresets.array.nonEmpty("Cannot be empty"),

	// Network validation
	ValidationPresets.network.ipv4("Invalid IPv4 address"),
	ValidationPresets.network.ipv6("Invalid IPv6 address"),

	// Date validation
	ValidationPresets.date.datetime("Invalid ISO datetime"),
	ValidationPresets.date.date("Invalid ISO date"),
	ValidationPresets.date.time("Invalid ISO time"),
];
```

### All Available Validation Presets

**String**: `required`, `email`, `minLength`, `maxLength`, `pattern`, `url`, `uuid`, `uuidv4`

**Number**: `required`, `min`, `max`

**Array**: `required`, `minItems`, `maxItems`, `nonEmpty`

**Network**: `ipv4`, `ipv6`

**Date**: `datetime`, `date`, `time`

**Custom**: `async` (for server-side validation)

### Custom Validation

```typescript
import { registerValidation } from '@json-form-engine/core/schemas/validation';

registerValidation({
  type: 'customValidation',
  category: 'string',
  handler: (rule) => z.string().refine(
    (val) => /* your logic */,
    { message: rule.message || 'Validation failed' }
  )
});
```

### Async Validation (Server-side)

```typescript
import { ValidationPresets } from "@json-form-engine/core/schemas/validation";

// Using preset helper
const asyncRule = ValidationPresets.custom.async("https://api.example.com/validate", {
	method: "POST",
	extraPayload: { fieldName: "{{value}}" },
	dependencies: ["email"], // Optional: depend on other fields
	message: "Validation failed",
});

// Or using direct JSON
const asyncRule = {
	type: "async",
	url: "https://api.example.com/validate",
	method: "POST",
	extraPayload: { fieldName: "{{value}}" },
	message: "Validation failed",
};
```

## Actions

Execute actions on form events:

```typescript
import type { FormActionConfig } from "@json-form-engine/core/actions";

const actions: FormActionConfig[] = [
	{
		type: "log",
		trigger: "onSubmit",
		config: { message: "Form submitted", level: "info" },
	},
	{
		type: "redirect",
		trigger: "onSubmit",
		config: { url: "/thank-you", delay: 1000 },
	},
];
```

### Built-in Actions

- `log` - Console logging
- `redirect` - Navigation
- `alert` - Browser alerts
- `custom` - Custom function execution

### Creating Custom Actions

```typescript
import { registerAction } from "@json-form-engine/core/actions";

registerAction({
	type: "customAction",
	handler: async (config, context) => {
		// Your action logic
		console.log("Form data:", context.formData);
	},
});
```

## Exports

Tree-shakable exports for optimal bundle size:

```typescript
// Schemas
import { FormConfigSchema } from "@json-form-engine/core/schemas";
import type { FormConfig, FormStep } from "@json-form-engine/core/schemas";

// Validation
import { ValidationPresets, registerValidation } from "@json-form-engine/core/schemas/validation";

// Actions
import { registerAction, ActionExecutor } from "@json-form-engine/core/actions";

// Tools
import { GTMTracker, GDPRConsent } from "@json-form-engine/core/tools";

// Base types
import type { BaseField } from "@json-form-engine/core/schemas/base-field";
```

## TypeScript Configuration

Add to your `tsconfig.json` for global type support:

```json
{
	"compilerOptions": {
		"types": ["@json-form-engine/core"]
	}
}
```

## Documentation

- **[Type System Guide](./TYPE_SYSTEM.md)** - Complete guide for using and extending the type system

## Development

```bash
# Build the package
bun run build:lib

# Run tests
bun run test:all

# Watch mode
bun run watch:lib

# Type check
bun run build:types
```

## License

MIT
