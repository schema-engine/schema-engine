# Form Engine Validation System

The Form Engine validation system provides a flexible, extensible way to define and execute validation rules for form fields. It builds first-party validators with [Zod Mini](https://zod.dev/) and follows a registry pattern for maximum flexibility.

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
{ type: 'required', message: 'This field is required' }

{ type: 'email', message: 'Please enter a valid email' }

{ type: 'minLength', value: 3, message: 'Must be at least 3 characters' }
```

### ValidationRegistry

The `ValidationRegistry` is the central hub that:

- Stores all validation type implementations
- Converts validation rules into Zod Mini schemas
- Provides convenient preset builders
- Manages custom validation registration

### Rule-to-Schema Generation

The system automatically converts validation rules into Zod Mini schemas:

```typescript
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation';

const rules = [{ type: 'required' }, { type: 'email' }, { type: 'minLength', value: 5 }];

const schema = createZodSchemaFromRules(rules);
```

## Quick Start

### Basic Usage

```typescript
import { createZodSchemaFromRules, ValidationPresets } from '@schema-engine/forms/schemas/validation';

const emailRules = [
	{ type: 'required', message: 'Email is required' },
	{ type: 'email', message: 'Invalid email format' },
];

const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Invalid email format'),
];

const schema = createZodSchemaFromRules(emailRules);

const result = schema.safeParse('user@example.com');
if (result.success) {
	console.log('Valid email:', result.data);
} else {
	console.log('Validation errors:', result.error.issues);
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

console.log(validationRegistry.getRegisteredTypes());

const stringValidations = validationRegistry.getByCategory('string');
const numberValidations = validationRegistry.getByCategory('number');
```

### Creating Custom Instances

```typescript
import { ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import * as z from 'zod/mini';

const customRegistry = new ValidationRegistry();

customRegistry.register({
	type: 'postalCode',
	category: 'string',
	handler: (rule) => z.string().check(z.regex(/^\d{5}$/, rule.message || 'Invalid postal code')),
});
```

## Built-in Validation Types

### String Validations

| Type        | Parameters                | Description           | Zod Mini implementation              |
| ----------- | ------------------------- | --------------------- | ------------------------------------ |
| `required`  | `message?`                | Field is required     | `z.refine(...)`                      |
| `email`     | `message?`                | Valid email address   | `z.email(message)`                   |
| `minLength` | `value: number, message?` | Minimum string length | `z.string().check(z.minLength(...))` |
| `maxLength` | `value: number, message?` | Maximum string length | `z.string().check(z.maxLength(...))` |
| `pattern`   | `value: string, message?` | Regex pattern match   | `z.string().check(z.regex(...))`     |
| `url`       | `message?`                | Valid URL             | `z.url(message)`                     |
| `uuid`      | `version?, message?`      | Valid UUID            | `z.uuid(message)`                    |

### Number Validations

| Type  | Parameters                | Description   | Zod Mini implementation        |
| ----- | ------------------------- | ------------- | ------------------------------ |
| `min` | `value: number, message?` | Minimum value | `z.number().check(z.gte(...))` |
| `max` | `value: number, message?` | Maximum value | `z.number().check(z.lte(...))` |

### Array Validations

| Type       | Parameters                | Description          | Zod Mini implementation                |
| ---------- | ------------------------- | -------------------- | -------------------------------------- |
| `minItems` | `value: number, message?` | Minimum array length | `z.array(...).check(z.minLength(...))` |
| `maxItems` | `value: number, message?` | Maximum array length | `z.array(...).check(z.maxLength(...))` |

### Network & Format Validations

| Type     | Parameters                    | Description                        | Zod Mini implementation               |
| -------- | ----------------------------- | ---------------------------------- | ------------------------------------- |
| `ipv4`   | `message?`                    | IPv4 address validation            | `z.ipv4(message)`                     |
| `ipv6`   | `message?`                    | IPv6 address validation with zones | `z.ipv6(message)` plus zone check     |
| `jwt`    | `alg?: string, message?`      | JWT token validation               | `z.jwt(...)`                          |
| `hash`   | `algorithm: string, message?` | Hash validation                    | `z.hash(...)`                         |
| `base64` | `urlSafe?: boolean, message?` | Base64 encoding validation         | `z.base64(...)` or `z.base64url(...)` |
| `cuid`   | `message?`                    | CUID validation                    | `z.cuid(...)`                         |
| `cuid2`  | `message?`                    | CUID2 validation                   | `z.cuid2(...)`                        |
| `ulid`   | `message?`                    | ULID validation                    | `z.ulid(...)`                         |
| `hex`    | `message?`                    | Hexadecimal string validation      | `z.hex(...)`                          |

### Date & Time Validations

| Type       | Parameters                              | Description             |
| ---------- | --------------------------------------- | ----------------------- |
| `datetime` | `precision?, offset?, local?, message?` | ISO datetime validation |
| `date`     | `message?`                              | Date validation         |
| `time`     | `precision?, message?`                  | Time validation         |

### Async Validation

| Type    | Parameters                                                                                  | Description            |
| ------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| `async` | `url: string, method?, headers?, extraPayload?, expectedResponse?, dependencies?, message?` | Server-side validation |

```typescript
{
  type: 'async',
  url: '/api/validate-username',
  method: 'POST',
  dependencies: ['email'],
  message: 'Username is already taken'
}
```

## Custom Validations

### Phone Inputs

The phone-input element registration includes a `phone` validator. Creating a form engine with that element registers the handler and applies `{ type: 'phone' }` to `phone-input` fields when the author omitted it. Pair the field with `required` when a number is mandatory. The forms package does not depend on a phone-number library.

### Registering Custom Validations

```typescript
import * as z from 'zod/mini';
import { validationRegistry } from '@schema-engine/forms/schemas/validation';

validationRegistry.register({
	type: 'creditCard',
	category: 'string',
	handler: (rule) => {
		return z.string().check(z.refine((value) => {
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
		}));
```

### Bulk Registration

```typescript
const customValidations = [
	{
		type: 'postalCode',
		category: 'string',
		handler: (rule) => z.string().check(z.regex(/^\d{5}(-\d{4})?$/, rule.message)),
	},
	{
		type: 'socialSecurity',
		category: 'string',
		handler: (rule) => z.string().check(z.regex(/^\d{3}-\d{2}-\d{4}$/, rule.message)),
	},
];

validationRegistry.registerMultiple(customValidations);
```

## Utility Functions

### createZodSchemaFromRules

Converts an array of validation rules into a Zod Mini schema:

```typescript
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation';

const rules = [{ type: 'required' }, { type: 'minLength', value: 3 }, { type: 'maxLength', value: 50 }];

const schema = createZodSchemaFromRules(rules);
```

### generateFormSchema

Generates a complete Zod Mini schema for an entire form:

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

const rules = [
	ValidationPresets.string.required('Name is required'),
	ValidationPresets.string.minLength(2, 'Name too short'),
	ValidationPresets.string.maxLength(50, 'Name too long'),
	ValidationPresets.string.email('Invalid email'),
	ValidationPresets.string.pattern('^[A-Za-z\\s]+$', 'Letters only'),
];

const ageRules = [
	ValidationPresets.number.min(0, 'Age cannot be negative'),
	ValidationPresets.number.max(150, 'Age seems unrealistic'),
];

const tagsRules = [
	ValidationPresets.array.minItems(1, 'At least one tag required'),
	ValidationPresets.array.maxItems(10, 'Too many tags'),
];

const formatRules = [
	ValidationPresets.string.url('Invalid URL'),
	ValidationPresets.network.ipv4('Invalid IPv4 address'),
];

const usernameRules = [
	ValidationPresets.custom.async('/api/check-username', {
		method: 'POST',
		dependencies: ['email'],
		message: 'Username already taken',
	}),
];
```

IPv4 and IPv6 rules delegate address parsing to Zod Mini. IPv6 also keeps support for interface-scoped addresses such as `fe80::1%eth0`.

### Cross-Field Validation

Use async validation for cross-field dependencies:

```typescript
const passwordConfirmRule = {
	type: 'async',
	url: '/api/validate-password-match',
	method: 'POST',
	dependencies: ['password'],
	extraPayload: { field: 'confirmPassword' },
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
	handler: (rule, formData) => {
		return z
			.string()
			.check(z.refine((value) => formData?.accountType !== 'business' || value.length > 0, rule.message));
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
- `createSchema(rule: ValidationRule, formData?): z.ZodMiniType | null` - Create a Zod Mini schema from one rule
- `getRegisteredTypes(): string[]` - Get all registered type names
- `getByCategory(category: string): ValidationRegistration[]` - Get validations by category

#### Properties

- `presets: ValidationPresets` - Convenient preset builders

### ValidationRegistration

```typescript
interface ValidationRegistration {
	type: string;
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic';
	handler: (rule: ValidationRule) => z.ZodMiniType;
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
validationRegistry.register({
	type: 'companyEmail',
	category: 'string',
	handler: (rule) => z.email().check(z.endsWith('@company.com')),
});

const field = {
	rules: [
		{ type: 'required', message: 'Email is required' },
		{ type: 'companyEmail', message: 'Must be a company email' },
	],
};
```

### 2. Use Meaningful Error Messages

Provide clear, user-friendly error messages:

```typescript
{ type: 'minLength', value: 8, message: 'Password must be at least 8 characters' }
{ type: 'email', message: 'Please enter a valid email address' }

{ type: 'minLength', value: 8, message: 'Invalid' }
{ type: 'email', message: 'Error' }
```

### 3. Leverage Presets for Common Patterns

Use presets to reduce boilerplate and improve consistency:

```typescript
const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Please enter a valid email'),
];

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
