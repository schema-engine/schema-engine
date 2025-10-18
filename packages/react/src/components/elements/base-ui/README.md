# Base UI Form Elements

A complete set of form field components built using [Base UI](https://base-ui.com/) components. Mirror implementation of shadcn/ui elements with the same API and configuration.

## Available Elements

**Inputs:** input, textarea, number, select, radio, checkbox, checkbox-group, switch, slider, input-otp
**Actions:** submit

## Quick Start

### Option 1: Using Helper Function (Recommended)

```typescript
import { createBaseUIFormEngineBuilder } from "@/stories/shared/form-engine-setup";

const engine = createBaseUIFormEngineBuilder().build();
```

### Option 2: Manual Registration

```typescript
import { FormEngineBuilder } from "@json-form-engine/core/builder";
import {
	InputElementRegistration,
	TextareaElementRegistration,
	CheckboxGroupElementRegistration,
	// ... import others as needed
} from "@json-form-engine/react/components/elements/base-ui";

const engine = new FormEngineBuilder()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxGroupElementRegistration)
	// ... add others
	.build();
```

### Option 3: Direct Configuration Object (No Builder)

```typescript
import type { FormConfig } from "@json-form-engine/core";

const formConfig: FormConfig = {
	fields: [
		{
			__id: "input",
			name: "email",
			label: "Email",
			inputType: "email",
			placeholder: "Enter email...",
			rules: [{ type: "required", message: "Email required" }],
		},
		{
			__id: "textarea",
			name: "message",
			label: "Message",
			placeholder: "Enter message...",
			rows: 5,
		},
		{
			__id: "checkbox-group",
			name: "interests",
			label: "Interests",
			options: [
				{ value: "sports", label: "Sports" },
				{ value: "music", label: "Music" },
				{ value: "reading", label: "Reading" },
			],
		},
		{
			__id: "slider",
			name: "rating",
			label: "Rating",
			min: 0,
			max: 10,
			step: 1,
		},
		{
			__id: "submit",
			name: "submit",
			label: "Submit",
		},
	],
};
```

## Documentation

- **[Input Elements](./inputs/README.md)** - Configuration options for each element
- **[Actions](./actions/README.md)** - Submit button and action components

## Features

- ✅ Full TypeScript support with type augmentation
- ✅ Form validation and state management
- ✅ Error display and validation feedback
- ✅ ARIA attributes and accessibility
- ✅ Responsive grid layout support
- ✅ Conditional logic (show/hide/enable/disable)

## See Also

- [Field Development Guide](../shadcn/inputs/README.md)
- [Form Engine Repository](https://github.com/andeeplus/form-engine)
