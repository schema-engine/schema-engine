# Stepper Development Guide

This package owns the stepper _protocol_: the shared types in `./types.ts`, the `StepperRenderer` that computes step
state, and the stepper context in `@/contexts/stepper-context`. Styled steppers (`default`, `minimalist`) are shadcn
registry items in `registry/shared/forms/steppers` — see `apps/docs` for consumer-facing docs.

## ⚠️ IMPORTANT: Button Rendering Best Practice

**Always keep Next/Submit buttons in the DOM and hide them with CSS instead of conditionally rendering them.**

When Next and Submit buttons are conditionally rendered (mounted/unmounted), React Hook Form detects the DOM change and
automatically triggers validation for all form fields. This causes unintended validation errors on unvisited steps.

```tsx
// ❌ Unmounting on step change makes RHF validate every field
{navigation.isLastStep ? <button type="submit">Submit</button> : <button type="button">Next</button>}

// ✅ Both stay mounted, so navigation never triggers validation
<button type="submit" style={{ display: navigation.isLastStep ? 'block' : 'none' }}>
	Submit
</button>
<button
	type="button"
	onClick={() => navigation.goToNextStep()}
	disabled={!navigation.canGoNext}
	style={{ display: navigation.isLastStep ? 'none' : 'block' }}
>
	Next
</button>
```

## Steppers are only for multi-step forms

`StepperRenderer` is only mounted when a form has more than one step. A stepper never needs to handle the single-step
case, and `steps` is always non-empty inside a stepper tree.

## Context API

There is one stepper context. Pass your config type to have `config` typed:

```tsx
import { useStepperContext } from '@schema-engine/forms-react/contexts/stepper-context';

function MyStepperProgress() {
	const { steps, currentStepIndex, navigation, form, config } = useStepperContext<MyStepperConfig>();
	// ...
}
```

`StepperRenderer` provides it, so a stepper and all of its compound children read the same value — no re-providing
needed. `useOptionalStepperContext()` is the non-throwing variant, for tools that may render outside a stepper tree.

```typescript
interface StepperContextValue<TConfig> {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	config: TConfig;
}

interface StepperNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

interface StepData {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive: boolean;
	isCompleted: boolean;
	isValid: boolean;
	isVisited: boolean;
}
```

## Compound and composed exports

A stepper exports two shapes:

- **Compound** (`MyStepper.Progress`, `MyStepper.Content`, `MyStepper.Navigation`) for consumers who want to arrange the
  parts themselves.
- **Composed** (`MyStepperComposed`) which lays the parts out in the default arrangement. This is what the registration
  passes as `render`, because `StepperRenderer` mounts a single component.

Both read the same context, so neither needs props threaded through it.

## Common mistakes

- **Conditionally rendering navigation buttons.** See the CSS-hiding note above.
- **Not disabling Next.** Gate it on `navigation.canGoNext` so users cannot advance past an invalid step.
- **Assuming `config` is populated.** `StepperRenderer` always passes an object, but every field of your own config type
  should have a default: `const { orientation = 'horizontal' } = config;`
- **Blocking navigation to visited steps.** Clickable indicators should allow going back to any visited step
  (`step.isVisited`), and only block unvisited steps ahead of the current one.

## See Also

- `./types.ts` — the protocol every stepper implements
- `@/contexts/stepper-context` — the context described above
- `registry/shared/forms/steppers` — the two shipped steppers, as working references
