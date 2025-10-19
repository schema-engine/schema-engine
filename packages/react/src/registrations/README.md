# Registration System

This directory contains organized re-exports of all component registrations with type augmentation for the Form Engine React package.

## How Registration Works

The registration system uses TypeScript's module augmentation to extend global type definitions. This allows TypeScript to know about your components at compile time while keeping the runtime bundle size minimal through tree-shaking.

### Type Augmentation

Each component registration file declares its types in the global `FormEngine` namespace:

```typescript
declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}
```

When you import a registration, TypeScript merges these declarations, making the types available throughout your project.

### Registration Objects

Each registration exports a registration object that contains:

- `$type`: Unique identifier for the component
- `render`: The React component to render
- `schema`: Validation schema for the component's configuration
- `metadata`: Human-readable information about the component

## Usage

### Individual Imports (Recommended)

Import only the components you need for maximum tree-shaking and type safety:

```typescript
import { InputElementRegistration } from "@json-form-engine/react/registrations/elements/shadcn";
import { CardLayoutRegistration } from "@json-form-engine/react/registrations/layouts";
import { DefaultStepperRegistration } from "@json-form-engine/react/registrations/stepper";

const engine = new FormEngineBuilder()
	.addElement(InputElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.build();
```

### Grouped Imports

For convenience, components are organized into logical groups:

```typescript
import {
	InputElementRegistration,
	TextareaElementRegistration,
	SelectElementRegistration,
} from "@json-form-engine/react/registrations/elements/shadcn";
```

### Direct Component Imports

You can also import directly from the component file:

```typescript
import { InputElementRegistration } from "@json-form-engine/react/components/elements/shadcn/inputs/form-input.registration";
```

## File Organization

```
registrations/
├── README.md              # This file
├── elements/
│   └── shadcn.ts         # All Shadcn UI element registrations
├── layouts.ts            # All layout component registrations
└── stepper.ts            # All stepper component registrations
```

## Benefits

### Tree-Shaking

Only imported components are included in your final bundle. Unused components are automatically removed during the build process.

### Type Safety

TypeScript knows exactly which components are registered, providing:

- Autocomplete for component IDs
- Type checking for component configurations
- Intellisense for component properties

### Explicit Registration

No hidden magic - you explicitly import and register the components you need. This makes it clear which components are available in each form builder instance.

### Multiple Builders

Different form builders can have different sets of registered components without conflicts:

```typescript
// Builder A with basic inputs
const builderA = new FormEngineBuilder()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration);

// Builder B with advanced inputs
const builderB = new FormEngineBuilder()
	.addElement(SelectElementRegistration)
	.addElement(RadioElementRegistration);
```

## Adding New Registrations

When creating a new component:

1. Create the component file with its registration
2. Add the registration to the appropriate file in this directory
3. Export it with its type augmentation

Example for a new element:

```typescript
// In elements/shadcn.ts
export { NewElementRegistration } from "@/components/elements/shadcn/inputs/new-element.registration";
```

The registration file should follow this pattern:

```typescript
declare global {
	namespace FormEngine {
		interface ElementRegistry {
			"new-element": NewElementConfig;
		}
	}
}

export const NewElementRegistration: ElementRegistration<NewElementConfig, NewElementProps> = {
	$type: "new-element",
	render: NewElement,
	schema: NewElementSchema,
	metadata: {
		name: "New Element",
		description: "Description of the new element",
		category: "input",
	},
};
```
