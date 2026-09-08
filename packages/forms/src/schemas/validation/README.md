# Form Engine Validation System

The Form Engine validation system provides a flexible, extensible way to define and execute validation rules for form fields. It's built on top of [Zod](https://zod.dev/) and follows a registry pattern for maximum flexibility.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Validation Registry](#validation-registry)
- [Built-in Validation Types](#built-in-validation-types)
- [Custom Validations](#custom-validations)
- [Utility Functions](#utility-functions)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)

## Core Concepts

### Validation Rules

Validation rules are plain JavaScript objects that describe how to validate a field value:

```typescript
// Simple required validation
{ type: 'required', message: 'This field is required' }

// Email validation
{ type: 'email', message: 'Please enter a valid email' }

// String length validation
{ type: 'minLength', value: 3, message: 'Must be at least 3 characters' }
```

### ValidationRegistry

The `ValidationRegistry` is the central hub that:

- Stores all validation type implementations
- Converts validation rules into Zod schemas
- Provides convenient preset builders
- Manages custom validation registration

### Rule-to-Schema Generation

The system automatically converts validation rules into Zod schemas:

```typescript
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation';

const rules = [{ type: 'required' }, { type: 'email' }, { type: 'minLength', value: 5 }];

// Automatically generates: z.string().email().min(5)
const schema = createZodSchemaFromRules(rules);
```

## Quick Start

### Basic Usage

```typescript
import { createZodSchemaFromRules, ValidationPresets } from '@schema-engine/forms/schemas/validation';

// Method 1: Direct JSON rules (simple & flexible)
const emailRules = [
	{ type: 'required', message: 'Email is required' },
	{ type: 'email', message: 'Invalid email format' },
];

// Method 2: Using presets (convenient & discoverable)
const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Invalid email format'),
];

// Create Zod schema from rules
const schema = createZodSchemaFromRules(emailRules);

// Validate data
const result = schema.safeParse('user@example.com');
if (result.success) {
	console.log('Valid email:', result.data);
} else {
	console.log('Validation errors:', result.error.errors);
}
```

### In Form Configurations

```typescript
const formConfig = {
	elements: [
		{
			id: 'input',
			name: 'email',
			label: 'Email Address',
			rules: [{ type: 'required' }, { type: 'email' }],
		},
		{
			id: 'input',
			name: 'age',
			label: 'Age',
			rules: [{ type: 'required' }, { type: 'min', value: 18 }, { type: 'max', value: 120 }],
		},
	],
};
```

## Validation Registry

### Default Instance

The package exports a default registry instance that comes pre-loaded with all built-in validations:

```typescript
import { validationRegistry } from '@schema-engine/forms/schemas/validation';

// Check what's available
console.log(validationRegistry.getRegisteredTypes());
// ['required', 'email', 'minLength', 'maxLength', 'pattern', 'url', 'uuid', ...]

// Get validations by category
const stringValidations = validationRegistry.getByCategory('string');
const numberValidations = validationRegistry.getByCategory('number');
```

### Creating Custom Instances

```typescript
import { ValidationRegistry } from '@schema-engine/forms/schemas/validation';

// Create a new registry (starts empty)
const customRegistry = new ValidationRegistry();

// Register your own validations.
customRegistry.register({
	type: 'postalCode',
	category: 'string',
	handler: (rule) => z.string().regex(/^\d{5}$/, rule.message || 'Invalid postal code'),
});
```

## Built-in Validation Types

### String Validations

| Type        | Parameters                | Description           | Zod Equivalent             |
| ----------- | ------------------------- | --------------------- | -------------------------- |
| `required`  | `message?`                | Field is required     | `.min(1, message)`         |
| `email`     | `message?`                | Valid email address   | `.email(message)`          |
| `phone`     | `message?`                | Complete phone number | `libphonenumber-js`        |
| `minLength` | `value: number, message?` | Minimum string length | `.min(value, message)`     |
| `maxLength` | `value: number, message?` | Maximum string length | `.max(value, message)`     |
| `pattern`   | `value: string, message?` | Regex pattern match   | `.regex(pattern, message)` |
| `url`       | `message?`                | Valid URL             | `.url(message)`            |
| `uuid`      | `version?, message?`      | Valid UUID            | `.uuid(message)`           |

### Number Validations

| Type  | Parameters                | Description   | Zod Equivalent         |
| ----- | ------------------------- | ------------- | ---------------------- |
| `min` | `value: number, message?` | Minimum value | `.min(value, message)` |
| `max` | `value: number, message?` | Maximum value | `.max(value, message)` |

### Array Validations

| Type       | Parameters                | Description          | Zod Equivalent         |
| ---------- | ------------------------- | -------------------- | ---------------------- |
| `minItems` | `value: number, message?` | Minimum array length | `.min(value, message)` |
| `maxItems` | `value: number, message?` | Maximum array length | `.max(value, message)` |

### Network & Format Validations

| Type     | Parameters                                               | Description                |
| -------- | -------------------------------------------------------- | -------------------------- |
| `ip`     | `version?: 'v4' \| 'v6', message?`                       | IP address validation      |
| `cidr`   | `version?: 'v4' \| 'v6', message?`                       | CIDR notation validation   |
| `jwt`    | `alg?: string, message?`                                 | JWT token validation       |
| `hash`   | `algorithm: string, message?`                            | Hash validation            |
| `base64` | `urlSafe?: boolean, message?`                            | Base64 encoding validation |
| `format` | `format: 'cuid' \| 'cuid2' \| 'ulid' \| 'hex', message?` | String format validation   |

### Date & Time Validations

| Type       | Parameters                              | Description             |
| ---------- | --------------------------------------- | ----------------------- |
| `datetime` | `precision?, offset?, local?, message?` | ISO datetime validation |
| `date`     | `message?`                              | Date validation         |
| `time`     | `precision?, message?`                  | Time validation         |

### Async Validation

| Type    | Parameters                                                                          | Description            |
| ------- | ----------------------------------------------------------------------------------- | ---------------------- |
| `async` | `url: string, method?, headers?, body?, expectedResponse?, dependencies?, message?` | Server-side validation |

```typescript
// Async validation example
{
  type: 'async',
  url: '/api/validate-username',
  method: 'POST',
  dependencies: ['email'], // Re-validate when email changes
  message: 'Username is already taken'
}
```

## Custom Validations

### Phone Validation

`phone` uses `libphonenumber-js` to validate non-empty values. A country prefix such as `+44` is invalid; a complete E.164 number such as `+442079460958` is valid. Empty values remain valid so optional phone fields work normally. Pair it with `required` when a phone number is mandatory.

`phone-input` fields add the `phone` rule automatically. Configure the rule explicitly only to override its message.

```typescript
import { createZodSchemaFromRules, ValidationPresets } from '@schema-engine/forms/schemas/validation';

const schema = createZodSchemaFromRules([
	ValidationPresets.string.required('Phone number is required'),
	ValidationPresets.string.phone('Enter a complete phone number'),
]);

schema.safeParse('+44').success; // false
schema.safeParse('+442079460958').success; // true
```

### Registering Custom Validations

```typescript
import { z } from 'zod';
import { validationRegistry } from '@schema-engine/forms/schemas/validation';

// Register a credit card validator with Luhn algorithm
validationRegistry.register({
	type: 'creditCard',
	category: 'string',
	handler: (rule) => {
		return z.string().refine((value) => {
			// Luhn algorithm implementation
			const digits = value.replace(/\D/g, '');
			if (digits.length < 13 || digits.length > 19) return false;

			let sum = 0;
			let isEven = false;

			for (let i = digits.length - 1; i >= 0; i--) {
				let digit = parseInt(digits[i]);
				if (isEven) {
					digit *= 2;
					if (digit > 9) digit -= 9;
				}
				sum += digit;
				isEven = !isEven;
			}

			return sum % 10 === 0;
		}, rule.message || 'Invalid credit card number');
	},
});
```

### Bulk Registration

```typescript
const customValidations = [
	{
		type: 'postalCode',
		category: 'string',
		handler: (rule) => z.string().regex(/^\d{5}(-\d{4})?$/, rule.message),
	},
	{
		type: 'socialSecurity',
		category: 'string',
		handler: (rule) => z.string().regex(/^\d{3}-\d{2}-\d{4}$/, rule.message),
	},
];

validationRegistry.registerMultiple(customValidations);
```

## Utility Functions

### createZodSchemaFromRules

Converts an array of validation rules into a Zod schema:

```typescript
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation';

const rules = [{ type: 'required' }, { type: 'minLength', value: 3 }, { type: 'maxLength', value: 50 }];

const schema = createZodSchemaFromRules(rules);
// Results in: z.string().min(1).min(3).max(50)
```

### generateFormSchema

Generates a complete Zod schema for an entire form:

```typescript
import { generateFormSchema } from '@schema-engine/forms/schemas/validation';

const formElements = [
	{
		name: 'firstName',
		id: 'input',
		rules: [{ type: 'required' }, { type: 'minLength', value: 2 }],
	},
	{
		name: 'email',
		id: 'input',
		rules: [{ type: 'required' }, { type: 'email' }],
	},
	{
		name: 'age',
		id: 'number',
		rules: [{ type: 'min', value: 18 }],
	},
];

const formSchema = generateFormSchema(formElements);

// Validate entire form data
const result = formSchema.safeParse({
	firstName: 'John',
	email: 'john@example.com',
	age: 25,
});
```

## Advanced Usage

### Validation Presets

Use the `ValidationPresets` utility for convenient rule creation:

```typescript
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

// String presets
const rules = [
	ValidationPresets.string.required('Name is required'),
	ValidationPresets.string.minLength(2, 'Name too short'),
	ValidationPresets.string.maxLength(50, 'Name too long'),
	ValidationPresets.string.email('Invalid email'),
	ValidationPresets.string.pattern('^[A-Za-z\\s]+$', 'Letters only'),
];

// Number presets
const ageRules = [
	ValidationPresets.number.min(0, 'Age cannot be negative'),
	ValidationPresets.number.max(150, 'Age seems unrealistic'),
];

// Array presets
const tagsRules = [
	ValidationPresets.array.minItems(1, 'At least one tag required'),
	ValidationPresets.array.maxItems(10, 'Too many tags'),
];

// Network presets
const formatRules = [
	ValidationPresets.string.url('Invalid URL'),
	ValidationPresets.network.ipv4('Invalid IPv4 address'),
];

// Async presets
const usernameRules = [
	ValidationPresets.custom.async('/api/check-username', {
		method: 'POST',
		dependencies: ['email'],
		message: 'Username already taken',
	}),
];
```

### Cross-Field Validation

Use async validation for cross-field dependencies:

```typescript
const passwordConfirmRule = {
	type: 'async',
	url: '/api/validate-password-match',
	method: 'POST',
	dependencies: ['password'], // Re-validate when password changes
	body: { field: 'confirmPassword' },
	expectedResponse: { valid: true },
	message: 'Passwords do not match',
};
```

### Conditional Validation

Custom validators can access form data for conditional logic:

```typescript
validationRegistry.register({
	type: 'conditionalRequired',
	category: 'string',
	handler: (rule) => {
		return z.string().refine((value, ctx) => {
			const formData = ctx.path; // Access to form context
			// Implement conditional logic
			return true;
		}, rule.message);
	},
});
```

## API Reference

### ValidationRegistry

#### Methods

- `register(registration: ValidationRegistration): void` - Register a single validation
- `registerMultiple(registrations: ValidationRegistration[]): void` - Register multiple validations
- `unregister(type: string): boolean` - Remove a validation type
- `has(type: string): boolean` - Check if validation type exists
- `createSchema(rule: ValidationRule, formData?): z.ZodType | null` - Create a Zod schema from one rule
- `getRegisteredTypes(): string[]` - Get all registered type names
- `getByCategory(category: string): ValidationRegistration[]` - Get validations by category
- `clear(): void` - Remove all registered validations

#### Properties

- `presets: ValidationPresets` - Convenient preset builders

### ValidationRegistration

```typescript
interface ValidationRegistration {
	type: string;
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic';
	handler: (rule: ValidationRule) => z.ZodType;
}
```

### ValidationRule Types

All validation rules extend `BaseValidationRule`:

```typescript
interface BaseValidationRule {
	type: string;
	message?: string;
}
```

Specific rule types add their own properties (e.g., `value` for min/max rules, `url` for async rules).

## Best Practices

### 1. Register Custom Validations and Use JSON-Serializable Rules

Form configurations must use plain JSON objects. For custom validation logic, register it in the ValidationRegistry first:

```typescript
// Correct approach - register custom validation during app initialization
validationRegistry.register({
	type: 'companyEmail',
	category: 'string',
	handler: (rule) => z.string().email().endsWith('@company.com'),
});

// Then use in JSON form configs
const field = {
	rules: [
		{ type: 'required', message: 'Email is required' },
		{ type: 'companyEmail', message: 'Must be a company email' },
	],
};

// Not possible - functions cannot be used in form configurations
// { type: 'custom', handler: (value) => value.includes('@company.com') }
```

### 2. Use Meaningful Error Messages

Provide clear, user-friendly error messages:

```typescript
// Good - specific and helpful
{ type: 'minLength', value: 8, message: 'Password must be at least 8 characters' }
{ type: 'email', message: 'Please enter a valid email address' }

// Poor - vague and unhelpful
{ type: 'minLength', value: 8, message: 'Invalid' }
{ type: 'email', message: 'Error' }
```

### 3. Leverage Presets for Common Patterns

Use presets to reduce boilerplate and improve consistency:

```typescript
// Clean and consistent using presets
const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Please enter a valid email'),
];

// Repetitive without presets
const emailRules = [
	{ type: 'required', message: 'Email is required' },
	{ type: 'email', message: 'Please enter a valid email' },
];
```

### 4. Test Custom Validations

Always test custom validation logic thoroughly:

```typescript
describe('Custom postal-code validation', () => {
	it('validates postal codes correctly', () => {
		const rule = { type: 'postalCode', message: 'Invalid postal code' };
		const schema = validationRegistry.createSchema(rule);

		expect(() => schema?.parse('28013')).not.toThrow();
		expect(() => schema?.parse('invalid')).toThrow();
	});
});
```

---

For more examples and advanced usage patterns, see the test files in the `test/schemas/validation/` directory.
