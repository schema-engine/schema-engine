# Form Engine WWW App

Documentation and demonstration site for the JSON Form Engine.

## Architecture

This app uses the new **Builder Pattern** to configure the form engine.

### Form Engine Setup

The form engine is configured once in `/src/lib/form-engine-setup.ts`:

```typescript
import { createReactFormEngine } from "@schema-engine/forms-react/registries/builder-registry";
import {
	InputElement,
	TextareaElement,
	// ... other components
} from "@schema-engine/forms-react/registrations";

export const formEngine = createReactFormEngine()
	.addElement(InputElement)
	.addElement(TextareaElement)
	// ... register all components
	.build();
```

### Using in Components

Import the `formEngine` instance and pass it to `FormRenderer`:

```typescript
import { FormRenderer } from "@schema-engine/forms-react/components/internals/form-renderer";
import { formEngine } from "@/lib/form-engine-setup";

function MyForm() {
	return <FormRenderer config={formConfig} engine={formEngine} />;
}
```

## Development

```bash
[install-command] Install dependencies
bun install

[dev-command] Start development server
bun dev

[build-command] Build for production
bun run build

[start-command] Start production server
bun start
```

## Project Structure

```
apps/www/
├── src/
│   ├── components/       [component] React components
│   │   └── demo/         [demo] Live demos
│   ├── lib/              [lib] Utilities and setup
│   │   └── form-engine-setup.ts  [important] Form engine configuration
│   ├── pages/            [pages] Routes and pages
│   │   ├── docs/         [docs] Documentation pages
│   │   └── demo/         [demo] Demo pages
│   ├── configs/          [config] Form configurations
│   │   └── forms/        [forms] Form config files
│   ├── layouts/          [layout] Page layouts
│   └── styles/           [styles] Global styles
├── public/               [public] Static assets
└── package.json
```

## Key Features

### Builder Pattern

- **Type Safe**: Full TypeScript support
- **Explicit**: See exactly what's registered
- **Tree-Shakable**: Only bundle what you use
- **Flexible**: Easy to extend with custom components

### Documentation

Comprehensive documentation covering:

- Quick Start
- Builder Pattern guide
- Component registration
- Validation system
- Actions and plugins
- Layouts and steppers
- Examples and demos

### Live Demos

Interactive demos showcasing:

- Builder Pattern usage
- Multi-step forms
- Conditional logic
- Validation rules
- Custom components
- Responsive grids
- Actions system

## Adding New Components

### 1. Create Registration Object

```typescript
// components/custom-input.tsx
import type { ReactElementRegistration } from "@schema-engine/forms-react";
import { z } from "zod";

const CustomInputSchema = z.object({
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
});

export function CustomInput({ config }: { config: z.infer<typeof CustomInputSchema> }) {
	return <input {...config} />;
}

export const CustomInputElement: ReactElementRegistration = {
	id: "custom-input",
	component: CustomInput,
	schema: CustomInputSchema,
	metadata: {
		name: "Custom Input",
		description: "A custom input field",
		category: "input",
	},
};
```

### 2. Register in Form Engine

```typescript
// lib/form-engine-setup.ts
import { CustomInputElement } from "@/components/custom-input";

export const formEngine = createReactFormEngine()
	.addElement(CustomInputElement)
	// ... other components
	.build();
```

### 3. Use in Form Config

```typescript
const formConfig = {
	steps: [
		{
			elements: [
				{
					id: "custom-input",
					id: "myField",
					name: "myField",
					label: "My Custom Field",
				},
			],
		},
	],
};
```

## Migration from Old Pattern

The old pattern used side-effect imports:

```typescript
// [x-mark] OLD - Auto-registration via side effects
import "@schema-engine/forms-react/registrations";
```

The new pattern uses explicit registration:

```typescript
// [check-mark] NEW - Explicit registration with Builder Pattern
import { createReactFormEngine } from "@schema-engine/forms-react/registries/builder-registry";
import { InputElement } from "@schema-engine/forms-react/registrations";

export const formEngine = createReactFormEngine().addElement(InputElement).build();
```

See `MIGRATION_TIMELINE.md` for detailed migration steps.

## Contributing

1. Follow the [Copilot Coding Rules](/.github/copilot-instructions.md)
2. Use absolute imports with `@/`
3. Add JSDoc comments for complex logic
4. Update documentation when adding features
5. Create demos for new components

## Testing

```bash
[test-command] Run all tests
bun test

[type-check-command] Type checking
bun run typecheck

[lint-command] Linting
bun run lint
```

## Build & Deployment

```bash
[build-command] Build production bundle
bun run build

[preview-command] Preview production build
bun preview
```

## Resources

- [Documentation](/docs)
- [Quick Start Guide](/docs/quick-start)
- [Builder Pattern](/docs/builder)
- [API Reference](/docs/api)
- [Examples](/demo)

## License

MIT
