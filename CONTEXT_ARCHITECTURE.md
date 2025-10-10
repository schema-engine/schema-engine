# Context-Based Component Architecture

## Overview

We've refactored steppers and layouts to use React Context for data access instead of prop drilling. This makes components easier to extend and reduces coupling.

## Architecture

### Before (Prop Drilling)

```tsx
// Component received all data as props
export const CardLayout: LayoutComponent<CardLayoutConfig> = ({
	children,
	config,
	step,
	form,
	className,
}) => {
	// Use props directly
	const { maxWidth } = config;
	const title = step?.title || form.title;
	// ...
};
```

### After (Context-Based)

```tsx
// Component uses context hook to access data
export const CardLayout: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	// Load data from context
	const { config, step, form } = useLayoutContext();
	const { maxWidth } = (config as CardLayoutConfig) || {};
	const title = step?.title || form.title;
	// ...
};
```

## Benefits

1. **No Prop Drilling**: Components don't need to pass props through multiple layers
2. **Easier to Extend**: New components just need to use the context hook
3. **Cleaner APIs**: Component props are minimal (children, className)
4. **Type Safety**: Context provides typed access to all necessary data
5. **Better Testing**: Can mock context values easily in tests

## Implementation

### Contexts

#### `/contexts/stepper-context.tsx`

Provides stepper data to stepper components:

```tsx
interface StepperContextValue {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	config: Record<string, any>;
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting?: boolean;
	};
}

export const useStepperContext = () => {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error("useStepperContext must be used within a StepperProvider");
	}
	return context;
};
```

#### `/contexts/layout-context.tsx`

Provides layout data to layout components:

```tsx
interface LayoutContextValue {
	step?: {
		id: string;
		title?: string;
		description?: string;
		index: number;
		total: number;
	};
	form: {
		id: string;
		title?: string;
		description?: string;
	};
	config: Record<string, any>;
}

export const useLayoutContext = () => {
	const context = useContext(LayoutContext);
	if (!context) {
		throw new Error("useLayoutContext must be used within a LayoutProvider");
	}
	return context;
};
```

### Renderers

#### `/components/internals/stepper-renderer.tsx`

Wraps stepper components with `StepperProvider`:

```tsx
export const StepperRenderer: React.FC<StepperRendererProps> = ({
	form,
	steps,
	currentStepIndex,
	stepStates,
	navigation,
	isSubmitting,
	children,
}) => {
	// ... stepper lookup logic

	return (
		<StepperProvider
			value={{
				steps: stepInfos,
				currentStepIndex,
				navigation: navigationControls,
				config: stepperConfig,
				form: formMeta,
			}}
		>
			<StepperComponent>{children}</StepperComponent>
		</StepperProvider>
	);
};
```

#### `/components/internals/layout-renderer.tsx`

Wraps layout components with `LayoutProvider`:

```tsx
export const LayoutRenderer: React.FC<LayoutRendererProps> = ({
	step,
	stepMeta,
	formMeta,
	children,
}) => {
	// ... layout lookup logic

	const contextValue = {
		step: {
			id: step.id,
			title: step.title,
			description: step.description,
			index: stepMeta.index,
			total: stepMeta.total,
		},
		form: formMeta,
		config: layoutConfig,
	};

	return (
		<LayoutProvider value={contextValue}>
			<LayoutComponent>{children}</LayoutComponent>
		</LayoutProvider>
	);
};
```

### Component Pattern

All stepper and layout components follow this pattern:

1. **Root Component**: Uses global context hook, passes to local context for compound components
2. **Sub-Components**: Use local context for compound component pattern
3. **Composed Component**: Exported for registration, just renders the root with default layout

Example - Default Stepper:

```tsx
// Root - loads from GLOBAL context, provides to LOCAL context
const DefaultStepperRoot: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	const globalContext = useGlobalStepperContext(); // From StepperProvider (renderer)

	return (
		<StepperProvider value={globalContext}>
			{" "}
			{/* Local context for compound components */}
			<div className={cn("default-stepper", className)}>{children}</div>
		</StepperProvider>
	);
};

// Compound component
export const DefaultStepper = Object.assign(DefaultStepperRoot, {
	Progress: DefaultStepperProgress,
	Content: DefaultStepperContent,
	Navigation: DefaultStepperNavigation,
});

// Composed - for registration
export const DefaultStepperComposed: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	return (
		<DefaultStepper>
			<DefaultStepper.Progress />
			<DefaultStepper.Content>{children}</DefaultStepper.Content>
			<DefaultStepper.Navigation />
		</DefaultStepper>
	);
};
```

## Storybook Stories

Stories use `FormRenderer` with form configs that include layout/stepper configuration:

```tsx
const meta = {
  title: 'Layouts/CardLayout',
  component: FormRenderer, // NOT CardLayout directly
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof FormRenderer>;

export const Default: Story = {
  args: {
    config: {
      id: 'demo-form',
      mode: 'free',
      steps: [
        {
          id: 'step-1',
          title: 'Form Title',
          elements: [...],
          layout: { // Layout config here
            layoutId: 'card',
            maxWidth: 'md',
            padding: 'md',
            shadowSize: 'md',
          },
        },
      ],
    },
  },
};
```

The `FormRenderer` automatically:

1. Detects the layout configuration in the step
2. Calls `LayoutRenderer` which wraps with `LayoutProvider`
3. Layout component uses `useLayoutContext()` to access data

## Migration Guide

### For Existing Components

**Old Way:**

```tsx
export const MyLayout: LayoutComponent<MyLayoutConfig> = ({ children, config, step, form }) => {
	const { option1 } = config;
	// ...
};
```

**New Way:**

```tsx
export const MyLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { config, step, form } = useLayoutContext();
	const { option1 } = (config as MyLayoutConfig) || {};
	// ...
};
```

### For New Components

1. Import the context hook
2. Use it in your root component
3. Access typed data from the context
4. No need to declare prop interfaces for data (only children/className)

## Files Changed

### Core Contexts

- `/packages/react/src/contexts/stepper-context.tsx` - Created
- `/packages/react/src/contexts/layout-context.tsx` - Created
- `/packages/react/src/contexts/index.ts` - Updated exports

### Renderers

- `/packages/react/src/components/internals/stepper-renderer.tsx` - Wraps with StepperProvider
- `/packages/react/src/components/internals/layout-renderer.tsx` - Wraps with LayoutProvider
- `/packages/react/src/components/internals/form-renderer.tsx` - Updated to use StepperRenderer

### Stepper Components

- `/packages/react/src/components/steppers/default-stepper.tsx` - Uses context
- `/packages/react/src/components/steppers/vertical-stepper.tsx` - Uses context
- `/packages/react/src/components/steppers/minimalist-stepper.tsx` - Uses context

### Layout Components

- `/packages/react/src/components/layouts/card-layout.tsx` - Uses context
- `/packages/react/src/components/layouts/split-screen-layout.tsx` - Uses context
- `/packages/react/src/components/layouts/hero-background-layout.tsx` - Uses context

### Stories

- All layout stories updated to use FormRenderer with layout config in steps
- All stepper stories already used FormRenderer (no changes needed)
