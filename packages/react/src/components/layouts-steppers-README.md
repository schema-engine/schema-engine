# Layout and Stepper Registry System

The Form Engine now supports registerable layouts and steppers, allowing you to create completely custom visual experiences while maintaining the serializable JSON configuration approach.

## Overview

- **Layouts**: Control how form content is visually presented (split-screen, hero background, card, etc.)
- **Steppers**: Control how multi-step navigation is displayed (progress bar, vertical timeline, minimalist, etc.)
- **Registry Pattern**: Same pattern as actions and validations - register once, use anywhere
- **JSON Serializable**: All configurations remain JSON serializable

## Layout System

### Registering Layouts

```typescript
import { registerLayout } from "@json-form-engine/react";

// Register a custom layout
registerLayout({
	id: "split-screen",
	name: "Split Screen Layout",
	description: "Display form content alongside additional information",
	component: SplitScreenLayout,
	defaultConfig: {
		sidePlacement: "left",
		sideWidth: "50%",
		backgroundColor: "#f8f9fa",
	},
});
```

### Using Layouts in Form Config

```typescript
const formConfig = {
	id: "user-registration",
	title: "Create Account",
	steps: [
		{
			id: "personal-info",
			title: "Personal Information",

			// Specify layout for this step
			layout: {
				id: "split-screen",
				sidePlacement: "right",
				sideWidth: "40%",
				sideContent: "<h3>Security Tips</h3><p>Choose a strong password</p>",
			},

			elements: [
				// ... form fields
			],
		},
	],
};
```

### Built-in Layout Examples

#### Split Screen Layout

```typescript
layout: {
  id: 'split-screen',
  sidePlacement: 'left', // 'left' | 'right'
  sideWidth: '50%',
  backgroundColor: '#f8f9fa',
  sideContent: 'HTML content for the side panel'
}
```

#### Hero Background Layout

```typescript
layout: {
  id: 'hero-background',
  backgroundImage: 'https://example.com/hero.jpg',
  // or use backgroundVideo: 'https://example.com/hero.mp4'
  backgroundColor: 'rgba(0, 0, 0, 0.5)', // overlay
  contentWidth: '600px',
  textColor: 'white'
}
```

#### Card Layout

```typescript
layout: {
  id: 'card',
  maxWidth: '500px',
  padding: '2rem',
  shadowSize: 'medium' // 'small' | 'medium' | 'large'
}
```

## Stepper System

### Registering Steppers

```typescript
import { registerStepper } from "@json-form-engine/react";

// Register a custom stepper
registerStepper({
	id: "progress-bar",
	name: "Progress Bar Stepper",
	description: "Show progress as a horizontal bar with step indicators",
	component: ProgressBarStepper,
	defaultConfig: {
		showStepNumbers: true,
		showStepTitles: true,
		primaryColor: "#3b82f6",
	},
});
```

### Using Steppers in Form Config

```typescript
const formConfig = {
	id: "user-registration",
	title: "Create Account",

	// Specify stepper for the entire form
	stepper: {
		id: "progress-bar",
		showStepTitles: true,
		primaryColor: "#6366f1",
		completedColor: "#059669",
	},

	steps: [
		// ... form steps
	],
};
```

### Built-in Stepper Examples

#### Progress Bar Stepper

```typescript
stepper: {
  id: 'progress-bar',
  showStepNumbers: true,
  showStepTitles: true,
  primaryColor: '#3b82f6',
  completedColor: '#10b981',
  backgroundColor: '#e5e7eb'
}
```

#### Vertical Steps Stepper

```typescript
stepper: {
  id: 'vertical-steps',
  showConnectors: true, // show lines between steps
  primaryColor: '#3b82f6',
  completedColor: '#10b981'
}
```

#### Minimalist Stepper

```typescript
stepper: {
  id: 'minimalist',
  showProgress: true,
  primaryColor: '#3b82f6'
}
```

## Creating Custom Components

### Custom Layout Component

```typescript
import type { LayoutComponentProps } from "@json-form-engine/core";

const MyCustomLayout: React.FC<LayoutComponentProps> = ({ children, config, step, form }) => {
	const { customOption = "default" } = config;

	return (
		<div className="my-custom-layout">
			<header>
				<h2>{step.title}</h2>
				<p>
					Step {step.index + 1} of {step.total}
				</p>
			</header>

			<main style={{ padding: customOption === "compact" ? "1rem" : "2rem" }}>{children}</main>
		</div>
	);
};

// Register it
registerLayout({
	id: "my-custom-layout",
	name: "My Custom Layout",
	component: MyCustomLayout,
	defaultConfig: {
		customOption: "default",
	},
});
```

### Custom Stepper Component

```typescript
import type { StepperComponentProps } from "@json-form-engine/core";

const MyCustomStepper: React.FC<StepperComponentProps> = ({
	steps,
	currentStepIndex,
	navigation,
	config,
}) => {
	return (
		<div className="my-custom-stepper">
			{/* Step indicators */}
			<nav>
				{steps.map((step, index) => (
					<button
						key={step.id}
						onClick={() => navigation.goToStep(index)}
						className={step.isActive ? "active" : ""}
					>
						{step.title}
					</button>
				))}
			</nav>

			{/* Navigation controls */}
			<div className="controls">
				{!navigation.isFirstStep && <button onClick={navigation.goToPreviousStep}>Back</button>}
				{!navigation.isLastStep ? (
					<button onClick={navigation.goToNextStep}>Next</button>
				) : (
					<button type="submit">Submit</button>
				)}
			</div>
		</div>
	);
};

// Register it
registerStepper({
	id: "my-custom-stepper",
	name: "My Custom Stepper",
	component: MyCustomStepper,
	defaultConfig: {
		// any default options
	},
});
```

## Architecture Benefits

1. **Consistency**: Uses the same registry pattern as actions and validations
2. **Flexibility**: Unlimited customization possibilities
3. **Serializable**: All configurations remain JSON serializable
4. **Composable**: Mix and match layouts and steppers
5. **Type Safe**: Full TypeScript support
6. **Tree Shakable**: Only import what you use
7. **Progressive**: Start simple, add complexity as needed

## Complete Example

```typescript
import { registerLayout, registerStepper } from "@json-form-engine/react";
import { FormEngine } from "@json-form-engine/react";

// Register your components (usually done once at app startup)
registerLayout({
	id: "card",
	name: "Card Layout",
	component: CardLayout,
	defaultConfig: { maxWidth: "500px" },
});

registerStepper({
	id: "progress-bar",
	name: "Progress Bar Stepper",
	component: ProgressBarStepper,
	defaultConfig: { showStepTitles: true },
});

// Use in your form configuration
const formConfig = {
	id: "registration-form",
	title: "User Registration",

	// Custom stepper for the entire form
	stepper: {
		id: "progress-bar",
		primaryColor: "#6366f1",
	},

	steps: [
		{
			id: "step1",
			title: "Personal Info",

			// Custom layout for this step
			layout: {
				id: "card",
				maxWidth: "600px",
				shadowSize: "large",
			},

			elements: [
				// ... your form fields
			],
		},
	],
};

// Render the form
function MyForm() {
	return <FormEngine config={formConfig} />;
}
```

This system gives you the power to create completely custom form experiences while maintaining the flexibility and simplicity of JSON configuration!
