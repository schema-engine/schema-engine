# Storybook Shared Utilities

This directory contains shared utilities for creating Storybook stories with the new FormEngine builder pattern.

## Type-Safe Form Builder

The `form-build### Custom Engine

````tsx
import { createCustomEngine, InputElement } from "../shared/form-engine-setup";
import { MyCustomComponent } from "./my-custom";

const customEngine = createCustomEngine()
	.addElement(InputElement)
	.addElement(MyCustomComponent)
	.build();le provides a fluent API with **automatic type inference** from registered components.

### Key Features

- ✅ **No hardcoded types** - Automatically infers from global registries
- ✅ **Full IntelliSense** - Get autocomplete for all registered components, layouts, and steppers
- ✅ **Compile-time safety** - Catch invalid configurations before runtime
- ✅ **Zero maintenance** - Add new components to registry, types update automatically

### How It Works

Types are automatically derived from three global registries in `registrations.ts`:

```typescript
declare global {
	namespace FormEngine {
		interface ElementRegistry {
			/* auto-populated */
		}
		interface LayoutRegistry {
			/* auto-populated */
		}
		interface StepperRegistry {
			/* auto-populated */
		}
	}
}
````

When you use `withLayout('card', { ... })`, TypeScript automatically knows what options are valid for the card layout. Same for steppers and field components.

### Quick Example

```typescript
import { createForm } from "./shared/form-builder";

const form = createForm({ id: "demo", title: "Demo Form" })
	.addStep({ id: "step1" })
	.withLayout("card", {
		maxWidth: "md", // ✓ TypeScript suggests valid options
		padding: "lg", // ✓ IntelliSense works automatically
		// @ts-expect-error
		invalidProp: true, // ✗ TypeScript catches this error
	})
	.addInputField({
		name: "email",
		label: "Email",
		inputType: "email",
		required: true,
	})
	.build();
```

See inline documentation in `form-builder.ts` for more details.

## Files

### `form-engine-setup.ts`

Pre-configured FormEngine instances for use in stories.

**Exports:**

- `defaultFormEngine` - FormEngine with all default components registered
- `createCustomEngine()` - Helper to create custom engine instances
- Component registrations for convenience imports

**Usage:**

```tsx
import { defaultFormEngine } from "./shared/form-engine-setup";
import { FormEngineProvider } from "@json-form-engine/react";

<FormEngineProvider engine={defaultFormEngine}>
	<FormRenderer config={myForm} />
</FormEngineProvider>;
```

### `story-wrapper.tsx`

Wrapper component that provides FormEngineProvider for stories.

**Exports:**

- `StoryWrapper` - Component that wraps stories with necessary providers

**Usage:**

```tsx
import { StoryWrapper } from './shared/story-wrapper';

export const MyStory = () => (
  <StoryWrapper>
    <FormRenderer config={myForm} />
  </StoryWrapper>
);

// Or as decorator
decorators: [
  (Story) => (
    <StoryWrapper>
      <Story />
    </StoryWrapper>
  ),
],
```

### `sample-forms.ts`

Pre-defined form configurations for testing and examples.

**Exports:**

- `simpleContactForm` - Basic contact form
- `multiStepRegistrationForm` - Multi-step registration
- More sample forms...

### `form-builder.ts`

Fluent API for creating form configurations quickly.

**Exports:**

- `createForm()` - Create a new form builder
- `FormBuilder` - Builder class with fluent API
- `FormTemplates` - Pre-built form templates

**Usage:**

```tsx
import { createForm, FormTemplates } from "./shared/form-builder";

// Create custom form
const form = createForm({ id: "my-form", title: "My Form" })
	.addStep({ id: "step-1", title: "Personal Info" })
	.addInputField({ name: "name", label: "Name", required: true })
	.addEmailField({ name: "email", label: "Email" })
	.withLayout("card", { maxWidth: "md" })
	.build();

// Or use template
const contactForm = FormTemplates.contactForm();
```

### `STORYBOOK_GUIDE.md`

Complete guide for using the new builder pattern in Storybook stories.

## Quick Start

### Basic Story

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryWrapper } from "../shared/story-wrapper";
import { FormRenderer } from "@/components/internals/form-renderer";
import { simpleContactForm } from "../shared/sample-forms";

const meta = {
	title: "My Stories/Example",
	component: FormRenderer,
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: simpleContactForm,
	},
};
```

### Custom Engine

```tsx
import { createCustomEngine, InputElement } from "../shared/form-engine-setup";
import { MyCustomComponent } from "./my-custom";

const customEngine = createCustomEngine()
	.addElement(InputElement)
	.addElement(MyCustomComponent)
	.build();

export const WithCustomEngine: Story = {
	render: (args) => (
		<StoryWrapper engine={customEngine}>
			<FormRenderer {...args} />
		</StoryWrapper>
	),
	args: {
		config: myCustomForm,
	},
};
```

## Default Components

The `defaultFormEngine` includes:

**Elements:**

- `input` - Text, email, password, etc.

**Layouts:**

- `card` - Centered card with shadow
- `split-screen` - Two-column layout
- `hero-background` - Full-screen with background

**Steppers:**

- `default` - Horizontal progress stepper
- `vertical` - Vertical sidebar stepper
- `minimalist` - Clean minimalist stepper

## Adding More Components

To add more field types to the default engine:

1. **Add registration export to component file:**

```tsx
// In the component file (e.g., form-textarea.tsx)
export const TextareaElement: ReactElementRegistration = {
	id: "textarea",
	component: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: "Textarea Field",
		description: "Multi-line text input",
		category: "input",
	},
};
```

2. **Import and add to form-engine-setup.ts:**

```tsx
import { TextareaElement } from "@/components/form/fields/form-textarea";

export const defaultFormEngine = createReactFormEngine()
	.addElement(InputElement)
	.addElement(TextareaElement) // Add this
	.build();
```

3. **Use in form configs:**

```tsx
const form = {
	steps: [
		{
			elements: [
				{
					id: "textarea", // Now available!
					name: "description",
					label: "Description",
				},
			],
		},
	],
};
```

## Examples

See `examples/builder-pattern.stories.tsx` for complete working examples showing:

- Simple forms
- Forms with layouts
- Multi-step forms with different steppers
- Custom configurations

## Migration from Old Pattern

**Before (Old Pattern):**

```tsx
// Had to import side-effect files
import "@json-form-engine/react/registrations";

// Used global registry
<FormEngine registry={reactFormFieldRegistry}>
	<FormRenderer config={form} />
</FormEngine>;
```

**After (New Pattern):**

```tsx
// Import the wrapper
import { StoryWrapper } from "./shared/story-wrapper";

// Wrap with StoryWrapper
<StoryWrapper>
	<FormRenderer config={form} />
</StoryWrapper>;
```

Much cleaner! The `StoryWrapper` handles all the provider setup for you.

## Troubleshooting

### Component not found error

**Problem:** "Component 'xyz' not found in registry"

**Solution:** The component isn't registered in your engine. Either:

1. Add it to `form-engine-setup.ts` if it should be in the default engine
2. Create a custom engine with that component for your story

### Provider error

**Problem:** "FormEngineProvider requires a FormEngine instance"

**Solution:** Make sure you're wrapping your story with `<StoryWrapper>` or manually providing the engine:

```tsx
<FormEngineProvider engine={defaultFormEngine}>{/* your component */}</FormEngineProvider>
```

### Type errors

**Problem:** TypeScript errors about stepper/layout configs

**Solution:** Use type assertion for now: `stepper: { ... } as any`
(This is a known issue while the type system is being finalized)

## More Help

- See `STORYBOOK_GUIDE.md` for detailed documentation
- Check `examples/builder-pattern.stories.tsx` for working examples
- Ask in the team chat if you're stuck!
