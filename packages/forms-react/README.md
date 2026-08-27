# @schema-engine/forms-react

React implementation of the JSON Form Engine with type-safe components, form adapters, and comprehensive validation support.

> **Important:** This README is a package overview, not the API reference. For verified examples and current contracts, use the [Documentation App](../../apps/docs) — start with [Getting Started](../../apps/docs/src/content/docs/forms-react/getting-started.mdx) or [Quick Start](../../apps/docs/src/content/docs/getting-started/quick-start.mdx).

## Overview

The React package provides production-ready components and hooks for building dynamic, JSON-configured forms. It integrates seamlessly with `@schema-engine/forms` and supports popular form libraries through an adapter system.

**Key Features:**

- Runtime form engine, React Hook Form adapter, layouts, and steppers
- Layout components for visual organization (card, split-screen, hero-background)
- Stepper protocol in the package; shadcn default/minimalist steppers in the registry
- `FormDebugger` opt-in dev overlay (mount as a child of `FormRenderer`, orthogonal to stepper `$type`)
- Comprehensive validation with 15+ built-in rules
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
import { createReactFormComposer } from '@schema-engine/forms-react';
import { CardLayoutRegistration } from '@schema-engine/forms-react/registrations';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { DefaultStepperRegistration } from '@/components/schema-engine/forms/steppers/default-stepper.registration';

const formEngine = createReactFormComposer()
	.addElements(schemaFormRegistrations)
	.addLayout(CardLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.build();
```

Install form elements from the GitHub registry first. Pick the aggregate that matches your shadcn base:

- Base UI: `shadcn add andeeplus/schema-engine/schema-form`
- Radix UI: `shadcn add andeeplus/schema-engine/schema-form-radix`
- React Aria: `shadcn add andeeplus/schema-engine/schema-form-aria`

Layouts stay package-owned. Install a default or minimalist stepper as a separate registry item when needed.

### 2. Configure Your Form

Create a JSON configuration:

```typescript
import type { FormConfig } from '@schema-engine/forms';

const formConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: 'Get in touch with our team',
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
			layout: {
				$type: 'card',
				padding: 'md',
				shadowSize: 'md',
			},
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
// Import the generated registrations from the shadcn item you installed.
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormComposer().addElements(schemaFormRegistrations).build();
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

<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
	{/* Your form */}
</FormEngineProvider>;
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

### Layouts

Layouts provide visual structure and styling for form steps:

- `card` - Centered card with shadow
- `split-screen` - Split layout with content and form
- `hero-background` - Full-width background with overlay

**Example - Card Layout:**

```typescript
{
  id: 'step-1',
  elements: [...],
  layout: {
		$type: 'card',
    maxWidth: 'md',
    padding: 'lg',
    shadowSize: 'lg'
  }
}
```

### Steppers

Registry steppers (`default`, `minimalist`) are installed via shadcn and registered with `addStepper()`. For development
inspection, mount `FormDebugger` as a child of `FormRenderer` — it is opt-in and imported from its own subpath, so it is
never bundled unless you ask for it:

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
  stepper: {
		$type: 'default',
    showStepNumbers: true,
    showStepTitles: true
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
      grid: { column: '1 / 7' } // Takes 6 columns
    },
    {
      $type: 'input',
      id: 'lastName',
      name: 'lastName',
      label: 'Last Name',
      grid: { column: '7 / 13' } // Takes 6 columns
    },
    {
      $type: 'input',
      id: 'email',
      name: 'email',
      label: 'Email',
      grid: { column: '1 / 13' } // Takes full width
    }
  ]
}
```

## Hooks

The package provides several hooks for form interactions:

### useFormEngine

Access the form engine instance:

```tsx
import { useFormEngine } from '@schema-engine/forms-react';

function MyComponent() {
	const { engine } = useFormEngine();

	// Access registered components
	const inputElement = engine.getElement('input');
	const allElements = engine.getAllElements();

	return <div>{/* ... */}</div>;
}
```

### useFormInstance

Access the React Hook Form instance:

```tsx
import { useFormInstance } from '@schema-engine/forms-react';

function MyComponent() {
	const { getValues, setValue, trigger, formState } = useFormInstance();

	const currentValues = getValues();

	return <div>{/* ... */}</div>;
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
// 1. Define your component
export function CustomDatePicker(props) {
	const { value, error, onChange, onBlur } = useControlledFormElement(props);

	return (
		<div>
			<DatePicker selected={value} onChange={onChange} onBlur={onBlur} />
			{error && <span>{error}</span>}
		</div>
	);
}

// 2. Create schema
export const CustomDatePickerSchema = z.object({
	$type: z.literal("custom-date-picker"),
	id: z.string(),
	name: z.string(),
	label: z.string(),
	minDate: z.date().optional(),
	maxDate: z.date().optional(),
});

// 3. Create registration
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

// 4. Register with engine
const engine = createReactFormComposer().addElement(CustomDatePickerRegistration).build();
```

### Custom Layouts

Create custom layout components:

```typescript
import { useLayoutContext } from '@schema-engine/forms-react/contexts';

// 1. Define layout component
export function CustomLayout({ children, className }) {
	const { step, form, config } = useLayoutContext();

	return (
		<div className={`custom-layout ${className}`}>
			<header>
				<h1>{step?.title || form.title}</h1>
			</header>
			<main>{children}</main>
		</div>
	);
}

// 2. Create schema
export const CustomLayoutConfigSchema = z.object({
	$type: z.literal("custom-layout"),
	headerColor: z.string().optional(),
	footerText: z.string().optional(),
});

// 3. Create registration
export const CustomLayoutRegistration = {
	$type: "custom-layout",
	render: CustomLayout,
	schema: CustomLayoutConfigSchema,
	metadata: {
		name: "Custom Layout",
		description: "Custom branded layout",
	},
};

// 4. Register with engine
const engine = createReactFormComposer().addLayout(CustomLayoutRegistration).build();
```

### Custom Steppers

Create custom stepper components:

```typescript
import { useStepperContext } from '@schema-engine/forms-react/contexts';

// 1. Define stepper component
export function CustomStepper() {
	const { steps, currentStepIndex, navigation, config } = useStepperContext();

	return (
		<div className="custom-stepper">
			{steps.map((step, index) => (
				<button
					key={step.id}
					onClick={() => navigation.goToStep(index)}
					disabled={!step.isVisited && index > currentStepIndex}
				>
					{step.title}
				</button>
			))}
		</div>
	);
}

// 2. Create schema
export const CustomStepperConfigSchema = z.object({
	$type: z.literal("custom-stepper"),
	showIcons: z.boolean().optional(),
});

// 3. Create registration
export const CustomStepperRegistration = {
	$type: "custom-stepper",
	render: CustomStepper,
	schema: CustomStepperConfigSchema,
	metadata: {
		name: "Custom Stepper",
		description: "Custom navigation stepper",
	},
};

// 4. Register with engine
const engine = createReactFormComposer().addStepper(CustomStepperRegistration).build();
```

## Type Safety

The package provides full TypeScript support with automatic type inference:

```typescript
// Type augmentation happens when importing the generated registry item.
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormComposer().addElements(schemaFormRegistrations).build();

// TypeScript knows about registered components
const element = engine.getElement('input');
const allElements = engine.getAllElements();

// Configuration is type-safe
const config: FormConfig = {
	id: 'my-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input', // TypeScript validates this exists
					id: 'name',
					name: 'name',
					inputType: 'text', // TypeScript validates valid input types
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

**Peer Dependencies:**

- `@schema-engine/forms` - Core form engine
- `react` ^19
- `react-dom` ^19
- `typescript` ^5

**Required Dependencies:**

- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Validation resolver

## License

MIT
