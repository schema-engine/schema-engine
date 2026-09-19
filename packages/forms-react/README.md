# @schema-engine/forms-react

React implementation of the JSON Form Engine with type-safe components, form adapters, and comprehensive validation support.

> **Important:** This README is a package overview, not the API reference. For verified examples and API contracts, use the [Documentation App](../../apps/docs) — start with [Getting Started](../../apps/docs/src/content/docs/forms-react/getting-started.mdx) or [Quick Start](../../apps/docs/src/content/docs/getting-started/quick-start.mdx).

## Overview

The React package provides production-ready components and hooks for building dynamic, JSON-configured forms. It integrates seamlessly with `@schema-engine/forms` and supports popular form libraries through an adapter system.

**Key Features:**

- Runtime form engine, React Hook Form adapter, and headless recipe contracts
- Registry-owned view recipes for visual chrome (`card`, `card-wizard`, `wizard`, …)
- `FormDebugger` opt-in dev overlay (mount as a child of `FormRenderer`)
- Comprehensive validation with 24 built-in rules
- Action execution system for form lifecycle events
- Grid-based responsive layouts
- GDPR consent tracking
- GTM analytics integration
- Constraint logic and dynamic field behavior

## Installation

```bash
pnpm add @schema-engine/forms-react @schema-engine/forms react-hook-form zod
```

## Quick Start

### 1. Create a Form Engine

Import component registrations and build your engine:

```typescript
import { createReactFormEngine } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const formEngine = createReactFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });
```

Install form elements from the GitHub registry first. Pick the aggregate that matches your shadcn base:

- Base UI: `shadcn add andeeplus/schema-engine/schema-form`
- Radix UI: `shadcn add andeeplus/schema-engine/schema-form-radix`
- React Aria: `shadcn add andeeplus/schema-engine/schema-form-aria`

Install the matching default recipe item to use the supplied `view.$type` implementations:

- Base UI: `shadcn add andeeplus/schema-engine/schema-engine-form-recipes`
- Radix UI: `shadcn add andeeplus/schema-engine/schema-engine-form-recipes-radix`
- React Aria: `shadcn add andeeplus/schema-engine/schema-engine-form-recipes-aria`

`createReactFormEngine()` is headless; add `schemaFormRecipeRegistrations` explicitly.

### 2. Configure Your Form

Create a JSON configuration:

```typescript
import type { FormConfig } from '@schema-engine/forms';

const formConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: 'Get in touch with our team',
	view: {
		$type: 'card',
		shell: { padding: 'md', shadowSize: 'md' },
	},
	steps: [
		{
			id: 'step-1',
			title: 'Your Information',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [
						{ type: 'required', message: 'Name is required' },
						{ type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
					],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email format' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
					rules: [
						{ type: 'required', message: 'Message is required' },
						{ type: 'maxLength', value: 500, message: 'Maximum 500 characters' },
					],
				},
			],
		},
	],
};
```

### 3. Render the Form

```tsx
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';

function ContactForm() {
	const handleSubmit = (data) => {
		console.log('Form submitted:', data);
	};

	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<FormRenderer config={formConfig} onSubmit={handleSubmit} />
		</FormEngineProvider>
	);
}
```

## Core Concepts

### Component Registration System

The package uses explicit, per-component registration to ensure type safety and tree-shaking:

```typescript
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormEngine({ elements: schemaFormRegistrations });
```

**Benefits:**

- Only imported components affect bundle size
- Type system only knows about registered components
- Multiple builders with different components work correctly
- No hidden magic, explicit imports

### Form Adapters

Adapters bridge the gap between the form engine and form libraries. The package includes a React Hook Form adapter by default.

**Using the RHF Adapter:**

```tsx
import { FormEngineProvider } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';

<FormEngineProvider engine={formEngine} adapter={rhfAdapter}></FormEngineProvider>;
```

**Adapter Interface:**

```typescript
interface FormAdapter {
	useFormContext: () => FormContextValue;
	useFormField: (config: ElementConfig) => FormFieldValue;
	useWatchField: (name: string | string[]) => any;
	FormProvider: React.ComponentType<FormProviderProps>;
	validateField: (name: string) => Promise<boolean>;
	validateFields: (names: string[]) => Promise<boolean>;
}
```

Custom adapters can be created to integrate with other form libraries (Formik, Final Form, etc.).

### Elements

Pre-built form field components with validation and styling:

- `input` - Text, email, password, tel, url inputs
- `textarea` - Multi-line text input
- `checkbox` - Single checkbox or checkbox group
- `radio` - Radio button group
- `select` - Dropdown select
- `switch` - Toggle switch
- `number` - Number input with increment/decrement
- `array` - Dynamic array of form elements

**Example - Select Field:**

```typescript
{
  $type: 'select',
  id: 'country',
  name: 'country',
  label: 'Country',
  options: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' }
  ],
	rules: [
		{ type: 'required', message: 'Please select a country' }
  ]
}
```

### View recipes

Visual chrome is selected with form-level `view.$type`. Install the matching
registry recipe aggregate and register `schemaFormRecipeRegistrations` before
using these default implementations:

- `card`, `split-screen`, `hero-background` — single-step shells
- `card-wizard`, `wizard`, `sidebar-wizard`, `hero-wizard`, `split-screen-wizard`, `bare-controls` — multi-step recipes

```typescript
{
  id: 'contact-form',
  view: {
    $type: 'card',
    shell: { maxWidth: 'md', padding: 'lg', shadowSize: 'lg' },
  },
  steps: [{ id: 'step-1', title: 'Contact', elements: [...] }],
}
```

Mount `FormDebugger` as a child of `FormRenderer` when you want an opt-in inspector:

```tsx
import { FormDebugger } from '@schema-engine/forms-react/components/form-debugger';

<FormRenderer config={config} engine={engine} adapter={adapter}>
	<FormDebugger />
</FormRenderer>;
```

**Example - Multi-Step Form:**

```typescript
const multiStepConfig: FormConfig = {
  id: 'registration',
  steps: [
    {
      id: 'personal',
      title: 'Personal Information',
      elements: [...]
    },
    {
      id: 'account',
      title: 'Account Details',
      elements: [...]
    },
    {
      id: 'preferences',
      title: 'Preferences',
      elements: [...]
    }
  ],
  view: {
    $type: 'wizard',
    progress: { orientation: 'horizontal' },
  }
};
```

### Validation

Validation rules are defined in the field configuration. The React package uses the validation system provided by `@schema-engine/forms`.

For complete documentation on validation rules, custom validators, and advanced validation patterns, see the [@schema-engine/forms documentation](../forms/README.md#validation).

**Quick Example:**

```typescript
{
  $type: 'input',
  id: 'phone',
  name: 'phone',
  label: 'Phone Number',
	rules: [
		{ type: 'required', message: 'Phone is required' },
    {
			type: 'pattern',
      value: /^\+?[\d\s-()]+$/,
      message: 'Invalid phone format'
    }
  ]
}
```

### Actions

Actions execute in response to form lifecycle events:

**Trigger Types:**

- `form_submit` - Form submission
- `form_change` - Field value changes
- `step_change` - Step navigation
- `step_submit` - Step submission
- `step_enter` / `step_leave` - Step lifecycle transitions

**Example - Submit Action:**

```typescript
{
  id: 'contact-form',
  steps: [...],
  actions: [
    {
      $type: 'submit',
      id: 'api-submit',
      endpoint: 'https://api.example.com/contact',
      method: 'POST',
      successMessage: 'Thank you for contacting us!',
      errorMessage: 'Failed to submit form. Please try again.',
      redirectUrl: '/thank-you'
    }
  ]
}
```

### Grid Layout

Forms support responsive grid layouts using CSS Grid:

```typescript
{
  id: 'step-1',
  grid: {
    columns: 12,
    gap: '1rem',
    columnGap: '1rem',
    rowGap: '1.5rem'
  },
  elements: [
    {
      $type: 'input',
      id: 'firstName',
      name: 'firstName',
      label: 'First Name',
      grid: { column: '1 / 7' }
    },
    {
      $type: 'input',
      id: 'lastName',
      name: 'lastName',
      label: 'Last Name',
      grid: { column: '7 / 13' }
    },
    {
      $type: 'input',
      id: 'email',
      name: 'email',
      label: 'Email',
      grid: { column: '1 / 13' }
    }
  ]
}
```

## Hooks

The package provides several hooks for form interactions:

The adapter-neutral `useFieldArray` hook exposes the complete field-array
mutation surface: `append`, `prepend`, `insert`, `swap`, `move`, `update`,
`replace`, and `remove`, alongside the current `fields`.

### useFormEngine

Access the form engine instance:

```tsx
import { useFormEngine } from '@schema-engine/forms-react';

function MyComponent() {
	const { engine } = useFormEngine();

	const inputElement = engine.getElement('input');
	const allElements = engine.getAllElements();

	return <div />;
}
```

### useFormInstance

Access the React Hook Form instance:

```tsx
import { useFormInstance } from '@schema-engine/forms-react';

function MyComponent() {
	const { getValues, setValue, trigger, formState } = useFormInstance();

	const currentValues = getValues();

	return <div />;
}
```

### useFormInstanceActions

Access form actions, navigation, and trigger dispatch:

```tsx
import { useFormInstanceActions } from '@schema-engine/forms-react';

function MyComponent() {
	const { executeAction, currentStep, totalSteps, goToNext, goToPrevious, goToStep, dispatchTrigger } =
		useFormInstanceActions();

	const handleCustomAction = async () => {
		const results = await dispatchTrigger('form_submit');
		if (results[0]?.success) {
			console.log('Action executed successfully');
		}
	};

	return (
		<div>
			<span>
				Step {currentStep + 1} of {totalSteps}
			</span>
			<button onClick={goToPrevious}>Back</button>
			<button onClick={goToNext}>Next</button>
			<button onClick={handleCustomAction}>Execute</button>
		</div>
	);
}
```

### useControlledFormElement

Create custom field components:

```tsx
import { useControlledFormElement } from '@schema-engine/forms-react';

function CustomField(config) {
	const { value, error, onChange, onBlur, isRequired } = useControlledFormElement(config);

	return (
		<div>
			<input
				value={value || ''}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				required={isRequired}
			/>
			{error && <span>{error}</span>}
		</div>
	);
}
```

## Advanced Features

### Constraint Logic

Apply dynamic visibility and behavior based on form values:

```typescript
{
  $type: 'input',
  id: 'other-reason',
  name: 'otherReason',
  label: 'Please specify',
  constraints: [
    {
      field: 'reason',
      operator: 'equals',
      value: 'other',
      action: 'show'
    }
  ]
}
```

### GDPR Consent

Track and manage user consent with the `useGDPRConsent` hook (global consent state, not a per-field config property):

```typescript
{
  $type: 'checkbox',
  id: 'gdpr-consent',
  name: 'gdprConsent',
  label: 'I agree to the privacy policy',
  rules: [
    { type: 'required', message: 'You must accept the privacy policy' }
  ]
}
```

Use the `useGDPRConsent` hook to access consent state:

```tsx
import { useGDPRConsent } from '@schema-engine/forms-react';

function ConsentStatus() {
	const consent = useGDPRConsent();

	return <div>{consent.hasConsent() ? 'Consented' : 'Not consented'}</div>;
}
```

### GTM Tracking

Integrate Google Tag Manager for form analytics:

```tsx
import { useGTMTracker } from '@schema-engine/forms-react';

function MyForm() {
	const tracker = useGTMTracker();

	const handleSubmit = () => {
		tracker.pushFormEvent('form_submit', { email: 'user@example.com' }, { formId: 'contact-form' });
	};

	return <button onClick={handleSubmit}>Track submit</button>;
}
```

### Custom Components

Register custom field components:

```typescript
import * as z from 'zod/mini';

export function CustomDatePicker(props) {
	const { value, error, onChange, onBlur } = useControlledFormElement(props);

	return (
		<div>
			<DatePicker selected={value} onChange={onChange} onBlur={onBlur} />
			{error && <span>{error}</span>}
		</div>
	);
}

export const CustomDatePickerSchema = z.object({
	$type: z.literal("custom-date-picker"),
	id: z.string(),
	name: z.string(),
	label: z.string(),
	minDate: z.optional(z.date()),
	maxDate: z.optional(z.date()),
});

export const CustomDatePickerRegistration = {
	$type: "custom-date-picker",
	render: CustomDatePicker,
	schema: CustomDatePickerSchema,
	metadata: {
		name: "Custom Date Picker",
		description: "Date selection with custom styling",
		category: "input",
	},
};

const engine = createReactFormEngine({ elements: [CustomDatePickerRegistration] });
```

### Custom recipes

Compose a shell and slot blocks with `defineFormRecipe`, then register it:

```typescript
import * as z from 'zod/mini';
import { defineFormRecipe, defineRecipeSpec } from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

const brandSpec = defineRecipeSpec({
	$type: 'brand',
	kind: 'single-step',
	slotSchemas: { shell: z.strictObject({ accent: z.optional(z.string()) }) },
	metadata: { name: 'Brand', description: 'Branded form shell' },
});

function BrandShell({ slots }: FormShellProps) {
	return (
		<div className="brand-shell">
			{slots.header}
			{slots.content}
			{slots.actions}
		</div>
	);
}

export const BrandRecipe = defineFormRecipe(brandSpec, {
	shell: BrandShell,
	slots: {},
});

const engine = createReactFormEngine({ recipes: [BrandRecipe] });
```

## Type Safety

The package provides full TypeScript support with automatic type inference:

```typescript
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormEngine({ elements: schemaFormRegistrations });

const element = engine.getElement('input');
const allElements = engine.getAllElements();

const config: FormConfig = {
	id: 'my-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					inputType: 'text',
				},
			],
		},
	],
};
```

## Performance

The package is optimized for performance:

- **Tree-shaking** - Only imported components are bundled
- **Code splitting** - Lazy load components and layouts
- **Memoization** - Components use React.memo and useMemo
- **Debouncing** - Field changes are debounced to reduce re-renders

## Testing

The package includes comprehensive test coverage:

```bash
pnpm test
```

```bash
cd packages/forms-react && pnpm test:all
```

**Test categories:** builder pattern, registration, rendering, validation, multi-step navigation, action execution, hooks, and custom components.

## Dependencies

**Peer Dependencies** — install these alongside the package:

- `@schema-engine/forms` - Core form engine
- `react` ^19
- `react-dom` ^19
- `react-hook-form` ^7 - Form state management behind `rhfAdapter`
- `typescript` ^5
- `zod` ^4 - Required by `@schema-engine/forms` for its first-party `zod/mini` schemas

`react` and `react-hook-form` are peers rather than dependencies so a consumer cannot end up with two copies: a second React breaks hooks, and a second `react-hook-form` makes `useFormContext` return `null`, because its context is matched by instance identity.

Validation is resolved in-package by `createFormValidationResolver`, so `@hookform/resolvers` is not required.

## License

MIT
