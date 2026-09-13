# Getting Started

This guide walks you through building your first React form.

## Live example

The interactive example is available on the documentation page.

## 1. Create a Form Engine

Install the form elements and, when using a supplied visual recipe, the recipe source from the Schema Engine shadcn registry:

```bash
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form andeeplus/schema-engine/schema-engine-form-recipes
```

Then import their generated registration barrels:

```typescript
import { createReactFormEngine } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const formEngine = createReactFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });
```

## 2. Configure Your Form

Create a JSON configuration:

```typescript
const formConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: 'Get in touch with our team',
	steps: [
		{
			id: 'step-1',
			title: 'Your Information',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email format' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
				},
			],
		},
	],
	view: {
		$type: 'card',
		shell: { padding: 'md', shadowSize: 'md' },
	},
};
```

## 3. Render the Form

```tsx
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';

function ContactForm() {
	const handleSubmit = (data) => {
		console.log('Form submitted:', data);
	};

	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<FormRenderer config={formConfig} onSubmit={handleSubmit} />
		</FormEngineProvider>
	);
}
```

## Next Steps

- [Components](/docs/forms-react/components) - Pre-built elements with examples
- [View recipes](/docs/forms-react/layouts) - Shells and slot blocks
