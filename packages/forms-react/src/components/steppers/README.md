# Stepper Development Guide

## ⚠️ IMPORTANT: Button Rendering Best Practice

**Always keep Next/Submit buttons in the DOM and hide them with CSS instead of conditionally rendering them.**

### Why This Matters

When Next and Submit buttons are conditionally rendered (mounted/unmounted), React Hook Form detects the DOM change and automatically triggers validation for all form fields. This causes unintended validation errors on unvisited steps.

### ❌ Wrong Approach (Conditional Rendering)

```tsx
{
	navigation.isLastStep ? (
		<button type="submit">Submit</button>
	) : (
		<button type="button" onClick={() => navigation.goToNextStep()}>
			Next
		</button>
	);
}
```

**Problem**: When `isLastStep` changes, buttons are unmounted/remounted → RHF validates all fields

### ✅ Correct Approach (CSS Hiding)

```tsx
<button
	type="submit"
	style={{ display: navigation.isLastStep ? 'block' : 'none' }}
	className="nav-button nav-button--primary"
>
	Submit
</button>

<button
	type="button"
	onClick={() => navigation.goToNextStep()}
	disabled={!navigation.canGoNext}
	style={{ display: navigation.isLastStep ? 'none' : 'block' }}
	className="nav-button nav-button--primary"
>
	Next
</button>
```

**Benefit**: Buttons stay in DOM but are invisible → No validation trigger on navigation

---

This guide explains best practices for creating custom stepper components in the form engine. Steppers provide navigation and progress visualization for multi-step forms.

## Key Principles

### 1. Steppers are Only for Multi-Step Forms

**Important**: Steppers are **only rendered for multi-step forms** (forms with 2+ steps). Single-step forms do not receive stepper components.

```typescript
interface StepData {
	id: string;
	title?: string;
	description?: string;
	index: number; // Always a valid number in steppers
	total: number; // Always 2 or greater in steppers
	isActive: boolean;
	isCompleted: boolean;
	isValid: boolean;
	isVisited: boolean;
}
```

**Why?** The framework automatically handles this at the renderer level. If a form has only one step, no stepper is rendered at all.

### 2. Compound Component Architecture

Steppers use a compound component pattern with a dual-context system:

1. **Global Context** (`useStepperContext` from `@/contexts/stepper-context`): Provides step data, navigation, and form state
2. **Local Context** (`useStepperContext` from `./context`): Distributes global data to compound components

This pattern allows flexible composition while maintaining type safety.

```tsx
// Root component loads from global context
const Root = ({ children }) => {
	const globalContext = useGlobalStepperContext();

	return (
		<StepperProvider value={globalContext}>
			<div>{children}</div>
		</StepperProvider>
	);
};

// Child components access via local context
const Progress = () => {
	const { steps, currentStepIndex } = useStepperContext<YourConfig>();
	// ...
};
```

### 3. Composition Pattern

Export both a **compound component** (for custom layouts) and a **composed component** (for registry):

```tsx
// Compound: flexible composition
export const MyStepper = Object.assign(MyStepperRoot, {
	Progress: MyStepperProgress,
	Header: MyStepperHeader,
	Content: MyStepperContent,
	Navigation: MyStepperNavigation,
});

// Composed: default layout for registry
export const MyStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<MyStepper>
			<MyStepper.Progress />
			<MyStepper.Header />
			<MyStepper.Content>{children}</MyStepper.Content>
			<MyStepper.Navigation />
		</MyStepper>
	);
};
```

## Styling

Stepper styling is **optional** and implemented via CSS imports. Each stepper can have its own CSS file:

```tsx
import './my-stepper.css';
```

This approach allows:

- **Opt-in styling**: Only loaded when the stepper is used
- **Full customization**: Skip the CSS import and use your own styling solution
- **No global pollution**: Styles are scoped to the stepper component

You're free to:

- Use the provided CSS structure (PostCSS with Tailwind)
- Skip CSS imports entirely and use inline styles, CSS-in-JS, or utility classes
- Create your own styling approach

## Stepper Component Template

Here's a complete template for creating a new stepper component:

```tsx
// my-stepper.tsx
import { cn } from '@/lib/utils';
import type React from 'react';
import { StepperProvider, useStepperContext } from './context';
import { useStepperContext as useGlobalStepperContext } from '@/contexts/stepper-context';
import './my-stepper.css'; // Optional: Remove if using custom styling
import type { MyStepperConfig } from './my-stepper.types';

/**
 * My Stepper Root Component
 * Loads data from global context and provides it to child components via local context
 */
const MyStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
	const globalContext = useGlobalStepperContext();

	return (
		<StepperProvider value={globalContext}>
			<div className={cn('my-stepper', className)}>{children}</div>
		</StepperProvider>
	);
};

/**
 * My Stepper Progress Component
 * Displays progress visualization (progress bar, step indicators, etc.)
 */
function MyStepperProgress({ className }: { className?: string }) {
	const { steps, currentStepIndex, config } = useStepperContext<MyStepperConfig>();
	const { showProgress = true } = config || {};

	if (!showProgress) return null;

	const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

	return (
		<div className={cn('my-stepper__progress', className)}>
			<div className="my-stepper__progress-bar">
				<div className="my-stepper__progress-fill" style={{ width: `${progressPercentage}%` }} />
			</div>
			<span className="my-stepper__progress-text">{Math.round(progressPercentage)}% complete</span>
		</div>
	);
}

/**
 * My Stepper Header Component
 * Displays current step information
 */
function MyStepperHeader({ className }: { className?: string }) {
	const { steps, currentStepIndex } = useStepperContext<MyStepperConfig>();
	const currentStep = steps[currentStepIndex];

	return (
		<div className={cn('my-stepper__header', className)}>
			<div className="my-stepper__step-counter">
				Step {currentStepIndex + 1} of {steps.length}
			</div>
			{currentStep?.title ? <h2 className="my-stepper__title">{currentStep.title}</h2> : null}
			{currentStep?.description ? <p className="my-stepper__description">{currentStep.description}</p> : null}
		</div>
	);
}

/**
 * My Stepper Content Component
 * Wraps the form content for each step
 */
function MyStepperContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('my-stepper__content', className)}>{children}</div>;
}

/**
 * My Stepper Navigation Component
 * Provides navigation controls (Previous/Next buttons)
 * IMPORTANT: Keep both buttons in DOM, hide with CSS to prevent validation triggers
 */
function MyStepperNavigation({ className }: { className?: string }) {
	const { navigation, form } = useStepperContext<MyStepperConfig>();

	return (
		<div className={cn('my-stepper__navigation', className)}>
			<button
				type="button"
				onClick={() => navigation.goToPreviousStep()}
				disabled={navigation.isFirstStep}
				className={cn(
					'my-stepper__nav-button my-stepper__nav-button--secondary',
					navigation.isFirstStep ? 'my-stepper__nav-button--disabled' : null,
				)}
			>
				Previous
			</button>

			{/* ✅ Keep both buttons in DOM, hide with CSS */}
			<button
				type="submit"
				style={{ display: navigation.isLastStep ? 'block' : 'none' }}
				className="my-stepper__nav-button my-stepper__nav-button--primary"
			>
				{form.isSubmitting ? 'Submitting...' : 'Submit'}
			</button>

			<button
				type="button"
				onClick={() => navigation.goToNextStep()}
				disabled={!navigation.canGoNext}
				style={{ display: navigation.isLastStep ? 'none' : 'block' }}
				className={cn(
					'my-stepper__nav-button my-stepper__nav-button--primary',
					!navigation.canGoNext ? 'my-stepper__nav-button--disabled' : null,
				)}
			>
				Next
			</button>
		</div>
	);
}

/**
 * Export compound component for flexible composition
 */
export const MyStepper = Object.assign(MyStepperRoot, {
	Progress: MyStepperProgress,
	Header: MyStepperHeader,
	Content: MyStepperContent,
	Navigation: MyStepperNavigation,
});

/**
 * Export composed component for registry
 * This is the default layout used when the stepper is registered
 */
export const MyStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<MyStepper>
			<MyStepper.Progress />
			<MyStepper.Header />
			<MyStepper.Content>{children}</MyStepper.Content>
			<MyStepper.Navigation />
		</MyStepper>
	);
};

// Registration
import type { StepperRegistration } from '@schema-engine/forms/types';
import { MyStepperConfigSchema } from './my-stepper.types';

export const MyStepperRegistration: StepperRegistration<MyStepperConfig, { children?: React.ReactNode }> = {
	$type: 'my-stepper',
	render: MyStepperComposed,
	schema: MyStepperConfigSchema,
	metadata: {
		name: 'My Stepper',
		description: 'A custom stepper for multi-step forms',
		icon: 'steps',
	},
};
```

```typescript
// my-stepper.types.ts
import { z } from 'zod';
import { BaseStepperConfigSchema } from '@schema-engine/formsteppers/types';

export const MyStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('my-stepper'),
	showProgress: z.boolean().optional().describe('Display progress bar'),
	variant: z.enum(['default', 'compact', 'spacious']).optional(),
});

export type MyStepperConfig = z.infer<typeof MyStepperConfigSchema>;

export type MyStepperProps = { children?: React.ReactNode };

export const myStepperExample: MyStepperConfig = {
	$type: 'my-stepper',
	showProgress: true,
	variant: 'default',
};
```

```typescript
// my-stepper.registration.ts
import { MyStepperRegistration } from './my-stepper';
import type { MyStepperConfig } from './my-stepper.types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			'my-stepper': MyStepperConfig;
		}
	}
}

export const MyStepperRegistrationWithTypes = MyStepperRegistration;
export { MyStepperRegistration };
```

## Context API Reference

### Global Context (`useStepperContext` from `@/contexts/stepper-context`)

Provides complete stepper state:

```typescript
interface StepperContextValue {
	steps: StepData[]; // Array of all steps
	currentStepIndex: number; // Index of active step
	navigation: StepperNavigation; // Navigation controls
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting?: boolean;
	};
	config: Record<string, any>; // Your stepper config
}
```

### Local Context (`useStepperContext` from `./context`)

Distributes global context data to compound components with type safety:

```typescript
import { useStepperContext } from './context';

// Use with your config type
const { steps, navigation, config } = useStepperContext<MyStepperConfig>();
```

### Navigation Controls

```typescript
interface StepperNavigation {
	canGoNext: boolean; // Can navigate to next step
	canGoPrevious: boolean; // Can navigate to previous step
	isFirstStep: boolean; // Currently on first step
	isLastStep: boolean; // Currently on last step
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}
```

### Step Data

```typescript
interface StepData {
	id: string; // Unique step identifier
	title?: string; // Step title
	description?: string; // Step description
	index: number; // Zero-based step index
	total: number; // Total number of steps
	isActive: boolean; // Currently active step
	isCompleted: boolean; // Step has been completed
	isValid: boolean; // Step validation state
	isVisited: boolean; // User has visited this step
}
```

## Common Patterns

### Pattern 1: Clickable Step Indicators

Allow users to jump to previously visited steps:

```tsx
function StepIndicators() {
	const { steps, currentStepIndex, navigation } = useStepperContext<MyStepperConfig>();

	return (
		<div className="step-indicators">
			{steps.map((step, index) => (
				<button
					key={step.id}
					type="button"
					onClick={() => navigation.goToStep(index)}
					disabled={!step.isVisited && index > currentStepIndex}
					className={cn(
						'step-indicator',
						step.isActive ? 'step-indicator--active' : null,
						step.isCompleted ? 'step-indicator--completed' : null,
						!step.isVisited && index > currentStepIndex ? 'step-indicator--disabled' : null,
					)}
				>
					{step.isCompleted ? '✓' : index + 1}
				</button>
			))}
		</div>
	);
}
```

### Pattern 2: Progress Bar

Calculate and display progress percentage:

```tsx
function ProgressBar() {
	const { steps, currentStepIndex } = useStepperContext<MyStepperConfig>();

	const completedSteps = steps.filter((step) => step.isCompleted).length;
	const progressPercentage = (completedSteps / steps.length) * 100;

	return (
		<div className="progress-bar">
			<div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
		</div>
	);
}
```

### Pattern 3: Conditional Submit Button

**Use CSS display instead of conditional rendering to prevent validation triggers:**

```tsx
function Navigation() {
	const { navigation, form } = useStepperContext<MyStepperConfig>();

	return (
		<div className="navigation">
			{!navigation.isFirstStep ? (
				<button type="button" onClick={() => navigation.goToPreviousStep()}>
					Previous
				</button>
			) : null}

			{/* ✅ ALWAYS keep both buttons in DOM */}
			<button
				type="submit"
				style={{ display: navigation.isLastStep ? 'block' : 'none' }}
				disabled={form.isSubmitting}
			>
				{form.isSubmitting ? 'Submitting...' : 'Submit'}
			</button>

			<button
				type="button"
				onClick={() => navigation.goToNextStep()}
				disabled={!navigation.canGoNext}
				style={{ display: navigation.isLastStep ? 'none' : 'block' }}
			>
				Next
			</button>
		</div>
	);
}
```

### Pattern 4: Step Validation Visual Feedback

Show validation state in step indicators:

```tsx
function StepIndicator({ step }: { step: StepData }) {
	return (
		<div
			className={cn(
				'step-indicator',
				step.isActive ? 'step-indicator--active' : null,
				step.isCompleted ? 'step-indicator--completed' : null,
				step.isVisited && !step.isValid ? 'step-indicator--invalid' : null,
			)}
		>
			{step.isCompleted ? (
				<CheckIcon />
			) : step.isVisited && !step.isValid ? (
				<ErrorIcon />
			) : (
				<span>{step.index + 1}</span>
			)}
		</div>
	);
}
```

## Architecture: Dual Context System

### Why Two Contexts?

The dual-context architecture provides both flexibility and type safety:

1. **Global Context**: Single source of truth
    - Managed by `StepperRenderer`
    - Contains all stepper state
    - Available to all stepper components

2. **Local Context**: Type-safe distribution
    - Wraps compound components
    - Provides typed access to config
    - Enables flexible composition

### How It Works

```tsx
// 1. Global context is provided by StepperRenderer
<StepperRenderer config={stepperConfig}>{/* Your stepper component */}</StepperRenderer>;

// 2. Root component loads from global context
const Root = ({ children }) => {
	const globalContext = useGlobalStepperContext();

	// 3. Distributes via local context
	return <StepperProvider value={globalContext}>{children}</StepperProvider>;
};

// 4. Child components access typed local context
const Progress = () => {
	const { steps, config } = useStepperContext<MyStepperConfig>();
	// config is now typed as MyStepperConfig
};
```

### Benefits

1. **Separation of concerns**: Global state management separate from component composition
2. **Type safety**: Each stepper gets its own config type
3. **Flexible composition**: Users can compose stepper parts as needed
4. **Reusable patterns**: Same architecture across all steppers

## Compound vs Composed Components

### Compound Component (Flexible)

Export the compound component for users who want custom layouts:

```tsx
import { MyStepper } from '@/components/steppers';

// Custom composition
<MyStepper>
	<div className="custom-header">
		<MyStepper.Progress />
		<MyStepper.Header />
	</div>
	<MyStepper.Content>{children}</MyStepper.Content>
	<div className="custom-footer">
		<MyStepper.Navigation />
	</div>
</MyStepper>;
```

### Composed Component (Registry)

Register the composed component for default behavior:

```tsx
// Automatically used when stepper is referenced in form config
{
	"stepper": {
		"$type": "my-stepper",
		"showProgress": true
	}
}
```

## Testing Your Stepper

Test your stepper with various scenarios:

```tsx
// Test 1: Multi-step form (normal case)
const multiStepForm = {
	id: 'test-form',
	mode: 'free',
	stepper: { $type: 'my-stepper' },
	steps: [
		{
			id: 'step-1',
			title: 'Personal Info',
			elements: [
				/* fields */
			],
		},
		{
			id: 'step-2',
			title: 'Address',
			elements: [
				/* fields */
			],
		},
		{
			id: 'step-3',
			title: 'Review',
			elements: [
				/* fields */
			],
		},
	],
};

// Test 2: Two-step form (minimum for stepper)
const twoStepForm = {
	id: 'test-form',
	mode: 'free',
	stepper: { $type: 'my-stepper' },
	steps: [
		{
			id: 'step-1',
			title: 'Info',
			elements: [
				/* fields */
			],
		},
		{
			id: 'step-2',
			title: 'Confirm',
			elements: [
				/* fields */
			],
		},
	],
};

// Test 3: Steps with validation
const validatedSteps = {
	id: 'test-form',
	mode: 'free',
	stepper: { $type: 'my-stepper' },
	steps: [
		{
			id: 'step-1',
			title: 'Required Fields',
			elements: [{ id: 'email', type: 'input', validation: { required: true } }],
		},
		{
			id: 'step-2',
			title: 'Optional',
			elements: [
				/* fields */
			],
		},
	],
};
```

## Common Mistakes to Avoid

### ❌ Mistake 0: Conditionally Rendering Navigation Buttons

**This is the most common and critical mistake.** When buttons are conditionally rendered, they trigger form validation on every state change.

```tsx
// ❌ WRONG: Causes validation on navigation
{
	navigation.isLastStep ? (
		<button type="submit">Submit</button>
	) : (
		<button type="button" onClick={() => navigation.goToNextStep()}>
			Next
		</button>
	);
}
```

```tsx
// ✅ CORRECT: Keep both buttons, hide with CSS
<button
	type="submit"
	style={{ display: navigation.isLastStep ? 'block' : 'none' }}
>
	Submit
</button>

<button
	type="button"
	onClick={() => navigation.goToNextStep()}
	style={{ display: navigation.isLastStep ? 'none' : 'block' }}
>
	Next
</button>
```

**Why?** React Hook Form automatically validates when the form structure changes. Keeping buttons in the DOM with CSS `display` prevents this.

### ❌ Mistake 1: Using Global Context Directly in Child Components

```tsx
// Wrong: Child components shouldn't use global context directly
function Progress() {
	const { steps } = useGlobalStepperContext(); // Don't do this
}
```

### ❌ Mistake 2: Not Handling Empty Config

```tsx
// Wrong: Config might be undefined
const { showProgress } = config; // Can throw if config is undefined

// Correct: Provide defaults
const { showProgress = true } = config || {};
```

### ❌ Mistake 3: Forgetting to Export Compound Component

```tsx
// Wrong: Only exporting composed
export const MyStepperComposed = ...;

// Correct: Export both
export const MyStepper = Object.assign(MyStepperRoot, { /* parts */ });
export const MyStepperComposed = ...;
```

### ❌ Mistake 4: Not Disabling Next Button

```tsx
// Wrong: Always allows navigation
<button onClick={navigation.goToNextStep}>Next</button>

// Correct: Respects validation
<button
	onClick={navigation.goToNextStep}
	disabled={!navigation.canGoNext}
>
	Next
</button>
```

### ✅ Correct Approach Summary

```tsx
// 1. Root loads from global, provides to local
const Root = ({ children }) => {
	const globalContext = useGlobalStepperContext();
	return (
		<StepperProvider value={globalContext}>
			<div>{children}</div>
		</StepperProvider>
	);
};

// 2. Children use typed local context
const Progress = () => {
	const { steps, config } = useStepperContext<MyStepperConfig>();
	const { showProgress = true } = config || {};
	// ...
};

// 3. Export both compound and composed
export const MyStepper = Object.assign(Root, { Progress, Content, Navigation });
export const MyStepperComposed = () => (
	<MyStepper>
		<MyStepper.Progress />
		...
	</MyStepper>
);
```

## FAQs

### Q: Do I need to check if steps exist?

**A:** No. Steppers are only rendered for multi-step forms, so `steps` will always be an array with at least 2 items.

### Q: Can I access form-level title and description?

**A:** Yes, through the `form` object in context:

```tsx
const { form } = useStepperContext<MyStepperConfig>();
console.log(form.title, form.description);
```

### Q: How do I create a vertical stepper?

**A:** Same architecture, different CSS layout:

```css
.vertical-stepper {
	display: flex;
	flex-direction: row; /* Sidebar layout */
}

.vertical-stepper__steps {
	flex-direction: column; /* Stack steps vertically */
}
```

### Q: Can I disable the "Previous" button on the first step?

**A:** Yes, use `navigation.isFirstStep`:

```tsx
<button type="button" onClick={() => navigation.goToPreviousStep()} disabled={navigation.isFirstStep}>
	Previous
</button>
```

### Q: How do I show a loading state during submission?

**A:** Use `form.isSubmitting`:

```tsx
<button type="submit" disabled={form.isSubmitting}>
	{form.isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

### Q: Can I skip steps programmatically?

**A:** Yes, use `navigation.goToStep(index)`:

```tsx
// Skip to step 3
navigation.goToStep(2);
```

### Q: How do I prevent navigation based on custom logic?

**A:** The framework handles validation automatically via `canGoNext`. For custom logic, wrap the navigation function:

```tsx
const handleNext = () => {
	if (myCustomValidation()) {
		navigation.goToNextStep();
	}
};
```

## See Also

- [Existing Stepper Examples](./default-stepper.tsx)
- [Stepper Context API](./context.ts)
- [Core Stepper Types](../../../../core/src/steppers/types.ts)
- [Layout Development Guide](../layouts/README.md)
