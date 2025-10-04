# FormEngine Registration System

## Overview

The FormEngine uses a simple, consistent registration pattern for all components (fields, layouts, steppers). Each component has its own `.registry` file that handles the registration when imported.

## Quick Start

### Simple: Register Everything

```typescript
import "@json-form-engine/react/registrations";
```

This imports all default components (fields, layouts, steppers) in one go.

### Advanced: Tree-Shaking with Individual Components

For maximum bundle optimization, import only what you need:

```typescript
// Fields
import "@json-form-engine/react/components/form/fields/form-input.registry";
import "@json-form-engine/react/components/form/fields/form-textarea.registry";
import "@json-form-engine/react/components/form/fields/form-select.registry";

// Layouts
import "@json-form-engine/react/components/layouts/card-layout.registry";
import "@json-form-engine/react/components/layouts/split-screen-layout.registry";

// Steppers
import "@json-form-engine/react/components/steppers/default-stepper.registry";
import "@json-form-engine/react/components/steppers/progress-bar-stepper.registry";
```

## Available Components

### Fields

- `form-input.registry` - Text input fields
- `form-textarea.registry` - Multi-line text areas
- `form-select.registry` - Dropdown selections
- `form-checkbox.registry` - Checkbox inputs
- `form-radio.registry` - Radio button groups
- `form-number.registry` - Number inputs
- `form-switch.registry` - Toggle switches
- `form-array-elements.registry` - Dynamic arrays

### Layouts

- `card-layout.registry` - Centered card layout
- `split-screen-layout.registry` - Side-by-side layout
- `hero-background-layout.registry` - Background image layout

### Steppers

- `default-stepper.registry` - Standard horizontal/vertical stepper
- `progress-bar-stepper.registry` - Progress bar with steps
- `vertical-stepper.registry` - Vertical timeline stepper
- `minimalist-stepper.registry` - Simple text navigation

## Migration from Old Approach

### Old Way (Deprecated)

```typescript
import "@json-form-engine/react/components/core-registrations";
```

### New Way (Recommended)

```typescript
import "@json-form-engine/react/registrations";
```

Both imports work the same way, but the new path is cleaner and located at the root of the package.

## How It Works

Each `.registry` file:

1. Imports the component
2. Defines registration metadata
3. Calls the appropriate `register*` function
4. Exports the registration for reference

Example (`form-input.registry.ts`):

```typescript
import { registerFieldType } from "@/registry";
import { InputFieldConfigSchema } from "./form-input.types";
import { FormInput } from "./form-input";

export const inputFieldRegistration: FormEngine.FieldRegistration = {
	componentId: "input",
	component: FormInput,
	schema: InputFieldConfigSchema,
	metadata: {
		title: "Input Field",
		description: "Text input field with validation",
		category: "input",
		example: {
			/* ... */
		},
	},
};

registerFieldType(inputFieldRegistration);
```

## Benefits

1. **Consistent Pattern**: Same approach for fields, layouts, and steppers
2. **Tree-Shakable**: Import only what you use
3. **Simple**: One import for everything, or granular imports for optimization
4. **Self-Contained**: Each component handles its own registration
5. **No Complex APIs**: No builders, configs, or environment switches

## TypeScript Support

All registrations include full TypeScript support with:

- Component props validation
- Configuration schema validation
- Global type declarations
- IDE autocomplete and error checking
