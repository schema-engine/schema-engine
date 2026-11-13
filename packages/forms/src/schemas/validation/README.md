# Form Engine Validation System

The Form Engine validation system provides a flexible, extensible way to define and execute validation rules for form fields. It builds first-party validators with [Zod Mini](https://zod.dev/) and follows a registry pattern for maximum flexibility.

Examples that log messages use `logger` imported from `@schema-engine/forms/lib/logger`,
which adds the `[schema-engine/forms]` package tag. Runtime diagnostics use this
same logger; debug output is disabled by default.

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

- Stores all validation type implementations in a read-only registry from `@schema-engine/registry`
- Converts validation rules into Zod Mini schemas
- Derives the per-field-type default rules (`defaultFor`) once, when it is built

Rules are registered when the registry is built, never afterwards: it has no `register`, `unregister` or `clear`.
Custom rules reach an engine through `createFormEngine({ validations: [...] })`.

### Rule-to-Schema Generation

The system automatically converts validation rules into Zod Mini schemas:

```typescript
import {
	createDefaultValidationRegistry,
	createValidationContext,
	createZodSchemaFromRules,
} from '@schema-engine/forms/schemas/validation';

const registry = createDefaultValidationRegistry();
const rules = [{ type: 'required' }, { type: 'email' }, { type: 'minLength', value: 5 }];

const schema = createZodSchemaFromRules(rules, createValidationContext({ values, fieldPath: 'email' }), registry);
```

Every schema is built against a [validation context](#cross-field-validation),
which is how a rule reads fields other than the one under test.

## Quick Start

### Basic Usage

```typescript
import {
	createDefaultValidationRegistry,
	createValidationContext,
	createZodSchemaFromRules,
	ValidationPresets,
} from '@schema-engine/forms/schemas/validation';

const registry = createDefaultValidationRegistry();

const emailRules = [
	ValidationPresets.string.required('Email is required'),
	ValidationPresets.string.email('Invalid email format'),
];

const schema = createZodSchemaFromRules(emailRules, createValidationContext(), registry);

const result = schema.safeParse('user@example.com');
if (result.success) {
	showValidationResult(result.data);
} else {
	showValidationErrors(result.error.issues);
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

### Engine registry

Each `FormEngine` owns a `ValidationRegistry`, built from the built-in handlers, the `validations` of the winning elements and `createFormEngine({ validations })`, in that order. A later registration of the same `$type` replaces the earlier one without a warning. Elements contribute in the element registry's order: a replaced `$type` keeps its first position, so for elements [A1, B, A2] where all declare the same validation `$type`, B's validation wins. Create a standalone copy with `createDefaultValidationRegistry()` when you are not building an engine:

```typescript
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';

const registry = createDefaultValidationRegistry();

const registeredTypes = registry.keys();

const stringValidations = registry.getByCategory('string');
const numberValidations = registry.getByCategory('number');
```

### Creating Custom Instances

`createDefaultValidationRegistry(extra)` adds registrations after the built-in ones, so an extra registration with a built-in `$type` overrides it. `createValidationRegistry(list)` builds a registry from exactly the list you give it:

```typescript
import { createDefaultValidationRegistry, createValidationRegistry } from '@schema-engine/forms/schemas/validation';
import * as z from 'zod/mini';

const postalCode = {
	$type: 'postalCode',
	schema: z.object({ type: z.literal('postalCode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: (rule: { type: 'postalCode'; message?: string }) =>
		z.string().check(z.regex(/^\d{5}$/, rule.message || 'Invalid postal code')),
} as const;

const withBuiltIns = createDefaultValidationRegistry([postalCode]);
const only = createValidationRegistry([postalCode]);
```

## Built-in Validation Types

### String Validations

| Type        | Parameters                                     | Description                                             | Zod Mini implementation              |
| ----------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `required`  | `message?`                                     | Field is required                                       | `z.refine(...)`                      |
| `email`     | `pattern?: string, message?`                   | Valid email address, optionally restricted by a regex   | `z.email(...).check(z.regex(...))`   |
| `minLength` | `value: number, message?`                      | Minimum string length                                   | `z.string().check(z.minLength(...))` |
| `maxLength` | `value: number, message?`                      | Maximum string length                                   | `z.string().check(z.maxLength(...))` |
| `pattern`   | `value: string, message?`                      | Regex pattern match                                     | `z.string().check(z.regex(...))`     |
| `url`       | `protocol?: regex, hostname?: regex, message?` | URL matching the optional protocol and hostname regexes | `z.url({ protocol, hostname })`      |
| `uuid`      | `version?: v1-v5, message?`                    | UUID, optionally restricted to a version                | `z.uuid({ version })`                |

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

| Type     | Parameters                     | Description                        | Zod Mini implementation               |
| -------- | ------------------------------ | ---------------------------------- | ------------------------------------- |
| `ipv4`   | `message?`                     | IPv4 address validation            | `z.ipv4(message)`                     |
| `ipv6`   | `message?`                     | IPv6 address validation with zones | `z.ipv6(message)` plus zone check     |
| `cidr`   | `version?: v4 or v6, message?` | IPv4 or IPv6 CIDR validation       | `z.cidrv4(...)` or `z.cidrv6(...)`    |
| `phone`  | `message?`                     | E.164 phone number validation      | `z.e164(message)`                     |
| `jwt`    | `alg?: string, message?`       | JWT token validation               | `z.jwt(...)`                          |
| `hash`   | `algorithm: string, message?`  | Hash validation                    | `z.hash(...)`                         |
| `base64` | `urlSafe?: boolean, message?`  | Base64 encoding validation         | `z.base64(...)` or `z.base64url(...)` |
| `cuid`   | `message?`                     | CUID validation                    | `z.cuid(...)`                         |
| `cuid2`  | `message?`                     | CUID2 validation                   | `z.cuid2(...)`                        |
| `ulid`   | `message?`                     | ULID validation                    | `z.ulid(...)`                         |
| `hex`    | `message?`                     | Hexadecimal string validation      | `z.hex(...)`                          |

### Date & Time Validations

| Type       | Parameters                              | Description             |
| ---------- | --------------------------------------- | ----------------------- |
| `datetime` | `precision?, offset?, local?, message?` | ISO datetime validation |
| `date`     | `message?`                              | Date validation         |
| `time`     | `precision?, message?`                  | Time validation         |

### Cross-Field Validation

| Type     | Parameters                                                                   | Description                       |
| -------- | ---------------------------------------------------------------------------- | --------------------------------- |
| `relate` | `fields: string[], assert, includeSelf?, as?, skipWhenIncomplete?, message?` | Compare a field with its siblings |

```typescript
{
  type: 'relate',
  fields: ['password'],
  assert: 'allEqual',
  message: 'Passwords must match'
}
```

The assertion table and reference scoping are under
[Cross-Field Validation](#cross-field-validation-1) in Advanced Usage.

### Async Validation

| Type    | Parameters                                                                                                               | Description            |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `async` | `url, method?, headers?, extraPayload?, expectedResponse?, dependencies?, debounce?, cacheTTL?, disableCache?, message?` | Server-side validation |

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

The core `phone` rule checks E.164 numbers. The phone-input registration can replace that handler with its region-aware validator and applies `{ type: 'phone' }` to `phone-input` fields when the author omitted it. Pair the field with `required` when a number is mandatory. The forms package does not depend on a phone-number library.

Format rules skip an empty value. A rule of the `string` or `date` category (`email`, `url`, `pattern`, `minLength`, `phone`, and a consumer's registrations in those categories) passes `undefined`, `null` and `''`, so an optional field can be left blank; `required` is the rule that rejects it, and it reports alone for an empty value. `createZodSchemaFromRules` wraps those rules, re-raising a filled value's issues unchanged. Rules of other categories (`minItems`, `min`) are not wrapped.

Required validation, `relate` emptiness assertions, constraint `is_empty` and `is_not_empty`, and async validation skips share one definition of empty: `undefined`, `null`, `''`, and `[]`. Values such as `false` and `0` are present. `validateForm` and `validateElement` reject a rule without a registered handler with a `FormValidationError` that identifies the field and rule type, at the path of that rule's `type` (for example `['steps', 0, 'elements', 2, 'rules', 1, 'type']`).

Debounced async rules share timers only within their caller-owned scope. Replacing a pending validation for the same rendered field path, endpoint, and dependency/extra payload sends only the latest request. A replaced parse of the same value shares that request's result. A replaced parse of a different value fails at once with `Validation pending`, because its value was never checked, so a superseded submit-time validation cannot pass. Renderers do not show it while the user types: React Hook Form drops a result for a value that has changed, and Radiant resolves a superseded call with the latest call's result. Different forms use separate scopes, and different field paths in one scope do not cancel each other.

### Registering Custom Validations

A validation registration has the shared registration shape (`$type`, `schema`, `metadata`) and the handler fields. `$type` is the `type` authors write in `rules`, and `schema` is a Standard Schema for the rule object. Pass registrations to the engine:

```typescript
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';

const creditCard = {
	$type: 'creditCard',
	schema: z.object({ type: z.literal('creditCard'), message: z.optional(z.string()) }),
	metadata: { name: 'Credit card', description: 'A card number that passes the Luhn check.' },
	category: 'string',
	handler: (rule: { type: 'creditCard'; message?: string }) =>
		z.string().check(
			z.refine((value) => {
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
			}, rule.message || 'Invalid credit card number'),
		),
} as const;

const engine = createFormEngine({ validations: [creditCard] });
```

### Several Validations

`validations` takes a list. Later entries replace earlier ones with the same `$type`, and they replace validations that elements declare:

```typescript
const engine = createFormEngine({ validations: [postalCode, socialSecurity] });
```

## Utility Functions

### createZodSchemaFromRules

Converts an array of validation rules into a Zod Mini schema:

```typescript
import { createValidationContext, createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation';

const rules = [{ type: 'required' }, { type: 'minLength', value: 3 }, { type: 'maxLength', value: 50 }];

const schema = createZodSchemaFromRules(rules, createValidationContext({ values, fieldPath: 'contacts.0.email' }));
```

The context is required. A caller with no form values — a unit test, or a schema
built before any value exists — passes `createValidationContext()`, which
resolves every reference to `undefined`. Making it explicit is deliberate:
omitting the form context used to be invisible, and a renderer that did so left
every cross-field rule silently passing.

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

Use the exported `ValidationPresets` utility for convenient rule creation:

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

Every handler receives a `ValidationContext` alongside its rule:

```typescript
import type { DebounceScope } from '@schema-engine/forms/lib/debounce';

interface ValidationContext {
	/** Nested value tree for the whole form. */
	values: Record<string, unknown>;
	/** Rendered path of the field being validated, e.g. `contacts.0.email`. */
	fieldPath: string;
	/** Reads another field relative to this one. */
	resolve: (fieldRef: string) => unknown;
	/** Carries keyed debounce timers for the caller-owned scope. */
	debounceScope: DebounceScope;
}
```

Prefer `resolve` over reading `values` directly. It applies the same scoping
constraints use, so one authored name cannot mean two different fields:

| Reference         | Declared on        | Resolves to              |
| ----------------- | ------------------ | ------------------------ |
| `accountType`     | `email`            | `accountType`            |
| `accountType`     | `contacts.0.email` | `contacts.0.accountType` |
| `country`         | `address.street`   | `address.country`        |
| `billing.country` | `contacts.0.email` | `billing.country`        |

A bare name is a sibling; a name containing a dot is absolute from the form
root. The rule lives in `@schema-engine/forms/lib/field-ref` as `resolveFieldRef`
and is shared with constraints.

The array-row case is the reason the reference is scoped rather than literal: a
rule written once on `contacts.email` has to read _its own_ row's
`accountType`, not row zero's.

#### Async debounce ownership

Async validation debouncing is scoped to an owner rather than a registry. Create
one `DebounceScope` for each form or rendered field lifetime, then pass it to
each context used for that owner's validations. A shared scope can serve several
fields because the debounce key includes the rendered field path; separate forms
must use separate scopes.

```typescript
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { createValidationContext } from '@schema-engine/forms/schemas/validation';

const debounceScope = createDebounceScope();
const context = createValidationContext({ values, fieldPath: 'email', debounceScope });
```

#### The `relate` rule

Most cross-field checks are one comparison over a list of referenced values, so
they share one rule rather than one registration each:

```typescript
{ $type: 'input', name: 'confirmPassword', inputType: 'password',
  rules: [{ type: 'relate', fields: ['password'], assert: 'allEqual',
            message: 'Passwords must match' }] }
```

The declaring field's own value comes first in the list, then each entry of
`fields` in order.

| `assert`             | Holds when                                            |
| -------------------- | ----------------------------------------------------- |
| `allEqual`           | every value is the same                               |
| `allDifferent`       | no value repeats                                      |
| `ascending`          | each value is greater than or equal to the one before |
| `strictlyAscending`  | each value is greater than the one before             |
| `descending`         | each value is less than or equal to the one before    |
| `strictlyDescending` | each value is less than the one before                |
| `atLeastOne`         | at least one value is filled                          |
| `exactlyOne`         | exactly one value is filled                           |
| `allOrNone`          | all values are filled, or none are                    |

| Option               | Default  | Effect                                                                                                                                                         |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeSelf`        | `true`   | the declaring field's value participates, first. Turn it off for an assertion about a group the field merely belongs to.                                       |
| `as`                 | `'auto'` | comparison basis: `string`, `number`, `date` (compared as timestamps), `boolean`, or `auto` to compare values unchanged.                                       |
| `skipWhenIncomplete` | `true`   | stay quiet while any participating value is empty. Ignored by `atLeastOne`, `exactlyOne` and `allOrNone`, whose whole job is to fire on a partly filled group. |

The `string` and `date` bases coerce primitive values and `Date` instances.
Other objects stay unchanged for `string` comparisons and are treated as
invalid dates. Their custom `toString` methods are not called.

Because ordering reads left to right with the declaring field first, "this date
must be after that one" is `descending`:

```typescript
{ $type: 'date', name: 'endDate',
  rules: [{ type: 'relate', fields: ['startDate'], assert: 'descending', as: 'date',
            message: 'End date must be after the start date' }] }
```

Inside an array, references stay in their row:

```typescript
{ $type: 'arrayElements', name: 'lines', elements: [
    { $type: 'number', name: 'quantity' },
    { $type: 'number', name: 'max',
      rules: [{ type: 'relate', fields: ['quantity'], assert: 'descending', as: 'number',
                message: 'Max must be at least the quantity' }] },
] }
```

`ValidationPresets.relate` builds the common shapes, and each returns a plain
rule object so TypeScript authoring and JSON round-tripping agree:

```typescript
ValidationPresets.relate.matches('password', 'Passwords must match');
ValidationPresets.relate.after('startDate', 'End date must be after the start date');
ValidationPresets.relate.before('endDate');
ValidationPresets.relate.atLeastOneOf(['phone', 'email'], 'Give us a phone number or an email');
ValidationPresets.relate.mutuallyExclusive(['card', 'invoice']);
ValidationPresets.relate.allOrNone(['street', 'city', 'postcode']);
```

### Conditional Validation

Custom validators read other fields through the context:

```typescript
const conditionalRequired = {
	$type: 'conditionalRequired',
	schema: z.object({ type: z.literal('conditionalRequired'), message: z.optional(z.string()) }),
	metadata: { name: 'Conditional required' },
	category: 'cross-field',
	handler: (rule: { type: 'conditionalRequired'; message?: string }, context: ValidationContext) => {
		return z
			.string()
			.check(
				z.refine((value) => context.resolve('accountType') !== 'business' || value.length > 0, rule.message),
			);
	},
} as const;
```

Async validation resolves its `dependencies` the same way, so a dependency may
be a sibling (`accountType`), a nested field (`billing.country`), or a sibling
inside the declaring array row:

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

Dependencies are sent to the endpoint under `dependsOn`, keyed by the reference
as authored.

#### Revalidation

A cross-field rule re-runs when a field it reads changes, not only when its own
field is validated. Correcting a password clears the "passwords must match"
error on the confirmation without the user going back to it.

A rule declares what it reads through `dependsOn` on its registration; `relate`
returns its `fields` and `async` returns its `dependencies`. `buildDependencyIndex`
inverts those into a change-to-dependents map over _rendered_ paths, so
`lines.0.max` depends on `lines.0.quantity` and not on every row's quantity.
A custom rule that reads other fields should declare `dependsOn` too, or nothing
will re-run it:

```typescript
const confirmPassword = {
	$type: 'confirmPassword',
	schema: z.object({ type: z.literal('confirmPassword'), message: z.optional(z.string()) }),
	metadata: { name: 'Confirm password' },
	category: 'cross-field',
	dependsOn: () => ['password'],
	handler: (rule: { type: 'confirmPassword'; message?: string }, context: ValidationContext) => …,
} as const;
```

Two deliberate limits:

- **Only direct dependents.** If `c` depends on `b` and `b` on `a`, changing `a`
  re-validates `b` and not `c`. Transitive expansion invites cycles, and every
  assertion reads values rather than another field's validity.
- **Errors surface only on a field the user has reached.** A dependent is
  re-validated when it has been touched, or on any dependent once the form has
  been submitted — `shouldSurfaceDependentError` is the single place that
  decides, so the two renderers cannot drift. Typing a password does not light
  up a confirmation nobody has visited.

## API Reference

### ValidationRegistry

`ValidationRegistry` extends the read-only `ReadOnlyRegistry` from `@schema-engine/registry`
(`kind`, `size`, `get`, `has`, `all`, `keys`) and has no `register`, `unregister` or `clear`.
Build one with `createValidationRegistry(list)` or `createDefaultValidationRegistry(extra?)`.

#### Methods

- `has(type: string): boolean` - Check if validation type exists
- `get(type: string): ValidationRegistration | undefined` - The registration for a type
- `keys()` - All registered type names, in first-registration order
- `createSchema(rule: ValidationRule, context: ValidationContext): z.ZodMiniType | null` - Create a Zod Mini schema from one rule, or return `null` if no handler is registered
- `getByCategory(category: string): ValidationRegistration[]` - Get validations by category
- `getDefaultRulesForFieldType(fieldType: string): readonly BaseValidationRule[]` - The `defaultFor` rules for a field `$type`, derived at build and frozen. A replaced registration keeps the position its first registration had among a field type's defaults
- `getRuleDependencies(rule): readonly string[]` - The field references a rule's `dependsOn` reports

### ValidationPresets

`ValidationPresets` is a plain exported authoring helper, independent of any
`ValidationRegistry` instance. Import it from
`@schema-engine/forms/schemas/validation` to build serializable rule objects.

### DebounceScope

`createDebounceScope()` from `@schema-engine/forms/lib/debounce` creates keyed
async validation state. Keep the scope with the form or field that owns it and
pass it through `createValidationContext` (or the value-validation helpers, which
require it). `debounce(fn, delay, key, input)` replaces a pending call with the
same `key`: the replaced call shares the new call's outcome when `input` matches
and resolves `{ status: 'skipped' }` otherwise.

### ValidationRegistration

```typescript
interface ValidationRegistration extends BaseRegistration {
	/** The rule `type` authors write in `rules`. */
	$type: string;
	/** Standard Schema for the rule object. */
	schema: StandardSchemaV1;
	metadata: { name: string; description?: string };
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic' | 'cross-field';
	handler: (rule: ValidationRule, context: ValidationContext) => z.ZodMiniType;
	/** Field references this rule reads, so renderers know when to re-run it. */
	dependsOn?: (rule: ValidationRule) => readonly string[];
	/** Field `$type` values that receive this rule when the author omitted it. */
	defaultFor?: readonly string[];
}
```

Everything that takes validations (`createFormEngine({ validations })`, an element's `validations`,
`createValidationRegistry`, `createDefaultValidationRegistry`) accepts `ValidationRegistrationConstraint`.
It erases the rule type, so a `ValidationRegistration<PostcodeRule>` is accepted as it is, and it requires
`handler` to return a Zod Mini schema.

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

Form configurations must use plain JSON objects. For custom validation logic, pass it to the engine first:

```typescript
const companyEmail = {
	$type: 'companyEmail',
	schema: z.object({ type: z.literal('companyEmail'), message: z.optional(z.string()) }),
	metadata: { name: 'Company email' },
	category: 'string',
	handler: () => z.email().check(z.endsWith('@company.com')),
} as const;

const engine = createFormEngine({ validations: [companyEmail] });

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
		const schema = engine.getValidationRegistry().createSchema(rule, createValidationContext());

		expect(() => schema?.parse('28013')).not.toThrow();
		expect(() => schema?.parse('invalid')).toThrow();
	});
});
```

---

For more examples and advanced usage patterns, see the test files in the `test/schemas/validation/` directory.

The dependency index includes `require` constraint references as well as rule
`dependsOn` references. Changing a required condition revalidates the dependent
field after it has been touched or the form submitted, keeping its error and
required indicator in sync.
