# Layout Development Guide

## Overview

This guide explains best practices for creating custom layout components in the form engine. Following these patterns ensures your layouts work correctly with both single-step and multi-step forms.

## Key Principles

### 1. Step Context is Optional

**Important**: The `step.index` and `step.total` properties are **optional** and will be `undefined` for single-step forms.

```typescript
interface StepContext {
	id: string;
	title?: string;
	description?: string;
	index?: number; // undefined for single-step forms
	total?: number; // undefined for single-step forms
}
```

**Why?** Single-step forms don't need step navigation or "Step 1 of 1" indicators. The framework automatically omits this metadata for single-step scenarios.

### 2. Conditional Step Counter Rendering

Use `typeof` checks with ternary operators to ensure step index and total are numbers before rendering:

```tsx
import { useLayoutContext } from '@/contexts/layout-context';

// ✅ CORRECT - Type-safe with ternary operator (avoids rendering falsy values)
const { step } = useLayoutContext();

{
	typeof step.index === 'number' && typeof step.total === 'number' ? (
		<div className="step-counter">
			Step {step.index + 1} of {step.total}
		</div>
	) : null;
}

// ❌ WRONG - Using && could render unintended falsy values
{
	step && (
		<div className="step-counter">
			Step {step.index + 1} of {step.total}
		</div>
	);
}

// Alternative approach - check both in one condition
{
	typeof step.index === 'number' && typeof step.total === 'number' && (
		<div className="step-counter">
			Step {step.index + 1} of {step.total}
		</div>
	);
}
```

## Styling

Layout styling is **optional** and implemented via CSS imports. Each layout can have its own CSS file that is explicitly imported:

```tsx
import './my-layout.css';
```

This approach allows:

- **Opt-in styling**: Only loaded when the layout is used
- **Full customization**: Developers can skip the CSS import and use their own styling solution
- **No global pollution**: Styles are scoped to the layout component

You're free to:

- Use the provided CSS structure (PostCSS with Tailwind)
- Skip CSS imports entirely and use inline styles, CSS-in-JS, or utility classes
- Create your own styling approach

## Layout Component Template

Here's a complete template for creating a new layout component:

```tsx
import { useLayoutContext } from '@/contexts/layout-context';
import { cn } from '@/lib/utils';
import type React from 'react';
import './my-layout.css'; // Optional: Remove if using custom styling
import type { MyLayoutConfig, MyLayoutProps } from './my-layout.types';

/**
 * My Layout
 * Description of what this layout does
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const MyLayout: React.FC<MyLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<MyLayoutConfig>();

	// Extract config with defaults
	const { variant = 'default', backgroundColor } = config;

	// Get title and description (step overrides form)
	const title = step?.title || form.title;
	const description = step?.description || form.description;

	// Check if we have step navigation info
	const showStepCounter = typeof step.index === 'number' && typeof step.total === 'number';

	return (
		<div className={cn('my-layout', `my-layout--${variant}`, className)}>
			{/* Header - only render if there's content to show */}
			{title || description || showStepCounter ? (
				<div className="my-layout__header">
					{title ? <h2 className="my-layout__title">{title}</h2> : null}
					{description ? <p className="my-layout__description">{description}</p> : null}

					{/* Step counter - only for multi-step forms */}
					{showStepCounter && step.index !== undefined && step.total !== undefined ? (
						<div className="my-layout__step-counter">
							Step {step.index + 1} of {step.total}
						</div>
					) : null}
				</div>
			) : null}

			{/* Main content area */}
			<div className="my-layout__content" style={{ backgroundColor }}>
				{children}
			</div>
		</div>
	);
};

// Registration (in my-layout.tsx)
import type { LayoutRegistration } from '@schema-engine/forms/types';
import { MyLayoutConfigSchema } from './my-layout.types';

export const MyLayoutRegistration: LayoutRegistration<MyLayoutConfig, MyLayoutProps> = {
	$type: 'my-layout',
	render: MyLayout,
	schema: MyLayoutConfigSchema,
	metadata: {
		name: 'My Layout',
		description: 'A custom layout for...',
		icon: 'layout',
	},
};

// Types file (my-layout.types.ts)
import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@schema-engine/formsayouts/types';
import type { ReactNode } from 'react';

export const MyLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	$type: z.literal('my-layout'),
	variant: z.enum(['default', 'compact', 'spacious']).optional(),
	backgroundColor: z.string().optional(),
});

export type MyLayoutConfig = z.infer<typeof MyLayoutConfigSchema>;

export type MyLayoutProps = MyLayoutConfig & {
	children: ReactNode;
	className?: string;
};

// Registration with type augmentation (my-layout.registration.ts)
import { MyLayoutRegistration } from './my-layout';
import type { MyLayoutConfig } from './my-layout.types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			'my-layout': MyLayoutConfig;
		}
	}
}

export const MyLayoutRegistrationWithTypes = MyLayoutRegistration;
export { MyLayoutRegistration };
```

## Common Patterns

### Pattern 1: Conditional Header Rendering

```tsx
// Only show header if there's meaningful content
const showStepCounter = typeof step.index === 'number' && typeof step.total === 'number';

{
	title || description || showStepCounter ? <div className="layout__header">{/* header content */}</div> : null;
}
```

### Pattern 2: Title Fallback Chain

```tsx
// Step title overrides form title
const title = step?.title || form.title;
const description = step?.description || form.description;
```

### Pattern 3: Inline Type Checking

```tsx
// Check types inline for cleaner code
const showStepCounter = typeof step.index === 'number' && typeof step.total === 'number';

// Then use throughout component
{
	showStepCounter && step.index !== undefined && step.total !== undefined ? (
		<span>
			Step {step.index + 1} of {step.total}
		</span>
	) : null;
}
```

## Architecture: Why This Approach?

### The Problem

Previously, all forms (including single-step) received step metadata like `{ index: 0, total: 1 }`, causing layouts to display redundant "Step 1 of 1" indicators.

### The Solution

The framework now automatically:

1. **Single-step forms**: `stepMeta` is `undefined` → no step counter shown
2. **Multi-step forms**: `stepMeta` contains `{ index, total }` → step counter shown

This is handled in the `FormRenderer`:

```tsx
// Single-step form
<LayoutRenderer
  step={singleStep}
  stepMeta={undefined}  // No step metadata
  formMeta={{ id, title, description }}
>

// Multi-step form
<LayoutRenderer
  step={currentStep}
  stepMeta={{ index: 2, total: 5 }}  // Has step metadata
  formMeta={{ id, title, description }}
>
```

### Benefits

1. **Self-contained logic**: Layouts automatically adapt to form type
2. **No configuration needed**: Developers don't specify "hide step counter"
3. **Type-safe**: TypeScript enforces optional checks
4. **Consistent behavior**: All layouts follow the same pattern

## Testing Your Layout

Test your layout with both scenarios:

```tsx
// Test 1: Single-step form (should NOT show step counter)
const singleStepForm = {
	id: 'test-form',
	mode: 'free',
	steps: [
		{
			id: 'step-1',
			title: 'Contact Info',
			elements: [
				/* fields */
			],
			layout: { id: 'my-layout' },
		},
	],
};

// Test 2: Multi-step form (SHOULD show step counter)
const multiStepForm = {
	id: 'test-form',
	mode: 'free',
	steps: [
		{
			id: 'step-1',
			title: 'Personal Info',
			elements: [
				/* fields */
			],
			layout: { id: 'my-layout' },
		},
		{
			id: 'step-2',
			title: 'Address',
			elements: [
				/* fields */
			],
			layout: { id: 'my-layout' },
		},
	],
};
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Not checking if step info exists

```tsx
// This will crash or show undefined values
<span>
	Step {step.index + 1} of {step.total}
</span>
```

### ❌ Mistake 2: Only checking if step exists

```tsx
// This will render the div but with undefined values
{
	step && (
		<div>
			Step {step.index + 1} of {step.total}
		</div>
	);
}
```

### ❌ Mistake 3: Using non-null assertions without checks

```tsx
// TypeScript won't catch this for optional properties
<span>
	Step {step.index! + 1} of {step.total!}
</span>
```

### ✅ Correct Approach

```tsx
const showStepCounter = typeof step.index === 'number' && typeof step.total === 'number';

{
	showStepCounter && step.index !== undefined && step.total !== undefined ? (
		<span>
			Step {step.index + 1} of {step.total}
		</span>
	) : null;
}

// Or more concise
{
	typeof step.index === 'number' && typeof step.total === 'number' ? (
		<span>
			Step {step.index + 1} of {step.total}
		</span>
	) : null;
}
```

## FAQs

### Q: Can I always access `step.id`, `step.title`, and `step.description`?

**A:** Yes! These properties are always available. Only `index` and `total` are optional.

### Q: Should I show the step counter in my layout?

**A:** Only if you have a specific design reason. Most layouts should conditionally render it based on whether `index` and `total` exist.

### Q: What if I want to force showing the step counter even for single-step forms?

**A:** You can add a custom config option:

```tsx
interface MyLayoutConfig {
	forceShowStepCounter?: boolean;
}

// Then in your component:
const shouldShowCounter =
	config.forceShowStepCounter || (typeof step?.index === 'number' && typeof step?.total === 'number');
```

### Q: Can I detect if this is a multi-step form in my layout?

**A:** Yes, check if `step.index` and `step.total` are numbers:

```tsx
import { useLayoutContext } from '@/contexts/layout-context';
const { step } = useLayoutContext<YourLayoutConfig>();

// Check if multi-step by testing if index and total are numbers
const isMultiStep = typeof step.index === 'number' && typeof step.total === 'number';

{
	isMultiStep ? (
		<div>
			Step {step.index + 1} of {step.total}
		</div>
	) : null;
}
```

## See Also

- [Existing Layout Examples](./card-layout.tsx)
- [Layout Context API](../../../contexts/layout-context.tsx)
- [Core Types](../../../../core/src/types/)
