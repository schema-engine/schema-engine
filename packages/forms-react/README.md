# @schema-engine/forms-react

React implementation of the JSON Form Engine with type-safe components, form adapters, and comprehensive validation support.

## Overview

The React package provides production-ready components and hooks for building dynamic, JSON-configured forms. It integrates seamlessly with `@schema-engine/forms` and supports popular form libraries through an adapter system.

**Key Features:**

- Type-safe form builder with full TypeScript inference
- Built-in React Hook Form adapter with extensibility for other form libraries
- Pre-built form elements (input, textarea, checkbox, radio, select, switch, number, array)
- Layout components for visual organization (card, split-screen, hero-background)
- Stepper components for multi-step forms (default, vertical, minimalist, debugger)
- Comprehensive validation with 15+ built-in rules
- Action execution system for form lifecycle events
- Grid-based responsive layouts
- GDPR consent tracking
- GTM analytics integration
- Constraint logic and dynamic field behavior

## Installation

```bash
bun add @schema-engine/forms-react @schema-engine/forms react-hook-form zod
```

## Quick Start

### 1. Create a Form Engine

Import component registrations and build your engine:

```typescript
import { createReactFormComposer } from '@schema-engine/forms-react';
import {
	InputElementRegistration,
	TextareaElementRegistration,
	CardLayoutRegistration,
	DefaultStepperRegistration,
} from '@schema-engine/forms-react/registrations';

const formEngine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.build();
```

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
					validation: [
						{ rule: 'required', message: 'Name is required' },
						{ rule: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
					],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					validation: [
						{ rule: 'required', message: 'Email is required' },
						{ rule: 'email', message: 'Invalid email format' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
					validation: [
						{ rule: 'required', message: 'Message is required' },
						{ rule: 'maxLength', value: 500, message: 'Maximum 500 characters' },
					],
				},
			],
			layout: {
				id: 'card',
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
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';

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
// Import only what you need
import {
	InputElementRegistration,
	CheckboxElementRegistration,
	SelectElementRegistration,
} from '@schema-engine/forms-react/registrations';

const engine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(CheckboxElementRegistration)
	.addElement(SelectElementRegistration)
	.build();
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
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';

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
  validation: [
    { rule: 'required', message: 'Please select a country' }
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
    id: 'card',
    maxWidth: 'md',
    padding: 'lg',
    shadowSize: 'lg'
  }
}
```

### Steppers

Steppers control navigation in multi-step forms:

- `default` - Horizontal progress indicator
- `vertical` - Vertical navigation sidebar
- `minimalist` - Clean, minimal progress bar
- `debugger` - Development debugging tool

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
    id: 'default',
    showStepNumbers: true,
    showStepTitles: true
  }
};
```

### Validation

Validation rules are defined in the field configuration. The React package uses the validation system provided by `@schema-engine/forms`.

For complete documentation on validation rules, custom validators, and advanced validation patterns, see the [@schema-engine/forms documentation](../core/README.md#validation).

**Quick Example:**

```typescript
{
  $type: 'input',
  id: 'phone',
  name: 'phone',
  label: 'Phone Number',
  validation: [
    { rule: 'required', message: 'Phone is required' },
    {
      rule: 'pattern',
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
- `field_focus` - Field receives focus
- `field_blur` - Field loses focus

**Example - Submit Action:**

```typescript
{
  id: 'contact-form',
  steps: [...],
  actions: [
    {
      id: 'api-submit',
      type: 'http',
      trigger: 'form_submit',
      config: {
        endpoint: 'https://api.example.com/contact',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      onSuccess: {
        message: 'Thank you for contacting us!',
        redirect: '/thank-you'
      },
      onError: {
        message: 'Failed to submit form. Please try again.'
      }
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

Access form actions and navigation:

```tsx
import { useFormInstanceActions } from '@schema-engine/forms-react';

function MyComponent() {
	const { executeAction, currentStep, totalSteps, goToNext, goToPrevious, goToStep } = useFormInstanceActions();

	return (
		<div>
			<span>
				Step {currentStep + 1} of {totalSteps}
			</span>
			<button onClick={goToPrevious}>Back</button>
			<button onClick={goToNext}>Next</button>
		</div>
	);
}
```

### useField

Create custom field components:

```tsx
import { useField } from '@schema-engine/forms-react';

function CustomField(config) {
	const { value, error, onChange, onBlur, isRequired } = useField(config);

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

### useActionExecutor

Execute form actions manually:

```tsx
import { useActionExecutor } from '@schema-engine/forms-react';

function MyComponent() {
	const { engine } = useFormEngine();
	const actionExecutor = useActionExecutor(engine);

	const handleCustomAction = async () => {
		const result = await actionExecutor.executeTrigger(
			[{ type: 'custom', id: 'my-action' }],
			'form_submit',
			context,
		);

		if (result[0].success) {
			console.log('Action executed successfully');
		}
	};

	return <button onClick={handleCustomAction}>Execute</button>;
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
      type: 'visibility',
      conditions: [
        {
          field: 'reason',
          operator: 'equals',
          value: 'other'
        }
      ]
    }
  ]
}
```

### GDPR Consent

Track and manage user consent:

```typescript
{
  $type: 'checkbox',
  id: 'gdpr-consent',
  name: 'gdprConsent',
  label: 'I agree to the privacy policy',
  gdpr: {
    purpose: 'marketing',
    required: true,
    category: 'analytics'
  },
  validation: [
    { rule: 'required', message: 'You must accept the privacy policy' }
  ]
}
```

Use the `useGdprConsent` hook to access consent state:

```tsx
import { useGdprConsent } from '@schema-engine/forms-react';

function ConsentStatus() {
	const { consents, hasConsent, updateConsent } = useGdprConsent();

	return <div>{hasConsent('marketing') ? 'Consented' : 'Not consented'}</div>;
}
```

### GTM Tracking

Integrate Google Tag Manager for form analytics:

```tsx
import { useGtmTracker } from '@schema-engine/forms-react';

function MyForm() {
	const tracker = useGtmTracker({
		enabled: true,
		trackFieldInteractions: true,
		trackValidationErrors: true,
		customDimensions: {
			formVersion: '2.0',
		},
	});

	return <FormRenderer config={config} />;
}
```

### Custom Components

Register custom field components:

```typescript
// 1. Define your component
export function CustomDatePicker(props) {
	const { value, error, onChange, onBlur } = useField(props);

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
	id: z.literal("custom-layout"),
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
	id: z.literal("custom-stepper"),
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
// Type augmentation happens automatically when importing registrations
import { InputElementRegistration } from '@schema-engine/forms-react/registrations';

const engine = createReactFormComposer().addElement(InputElementRegistration).build();

// TypeScript knows about registered components
const element = engine.getElement('input'); // Type: InputElementRegistration | undefined
const allElements = engine.getAllElements(); // Type: Array<InputElementRegistration>

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
- **Virtual scrolling** - Large forms use virtualization

## Testing

The package includes comprehensive test coverage:

```bash
bun test
```

**Test Categories:**

- Builder pattern and type safety
- Component registration and retrieval
- Form rendering and validation
- Multi-step navigation
- Action execution
- Hook behavior
- Custom component integration

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
