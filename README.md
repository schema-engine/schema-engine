# JSON Form Engine

> http://json-form-engine.andeeplus.com

**JSON Form Engine** is a JSON-based, type-safe form builder for React. Define your forms entirely in JSON, and get automatic validation, real-time error handling, and Zod schemas for free.

## Features

- **JSON Configuration**: Define forms in JSON with automatic validation generation.
- **Form Library Adapters**: Currently uses React Hook Form, with architecture designed for TanStack Form, Formik, and more.
- **Responsive Grids**: Advanced layout system with device emulation and breakpoint management.
- **Constraint-Based Logic**: Dynamic field visibility, validation, and state based on real-time conditions.
- **Type Safety**: Zod validation schemas are created automatically from your configuration.
- **100% Serializable**: All form configs are serializable and portable.
- **Auto-Generated Schemas**: Validation and types are generated from your config.
- **Real-time Validation**: Instant feedback as users fill out forms.
- **Tree-Shakable**: Optimized for modern bundlers with individual component imports.

## Quick Start

Get up and running in three simple steps:

1. **Setup Form Engine**  
   Import FormRenderer and register the components you need.
2. **Define Structure**  
   Create your form configuration in JSON format with field definitions and constraint logic.
3. **Render & Validate**  
   Display your form with real-time validation, dynamic field behavior, and error handling.

## Example

````typescript
```typescript
// Simple setup with React Hook Form
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { FormEngine, rhfAdapter } from '@json-form-engine/react';
import '@json-form-engine/react/registrations'; // Register all components

function MyForm() {
  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  return (
    // Option 1: Use FormRenderer directly (simpler)
    <FormRenderer
      config={formConfig}
      onSubmit={handleSubmit}
    />

    // Option 2: Use FormEngine with explicit adapter (more control)
    // <FormEngine adapter={rhfAdapter}>
    //   <FormProvider config={formConfig} onSubmit={handleSubmit} />
    // </FormEngine>
  );
}
````

````

```json
{
	"id": "contact-form",
	"title": "Contact Form",
	"mode": "free",
	"steps": [
		{
			"id": "contact-step",
			"title": "Contact Information",
			"elements": [
				{
					"id": "contact-type",
					"name": "contactType",
					"id": "select",
					"label": "Contact Type",
					"options": [
						{ "value": "support", "label": "Support" },
						{ "value": "sales", "label": "Sales" },
						{ "value": "general", "label": "General Inquiry" }
					],
					"rules": [{ "type": "required", "message": "Please select a contact type" }]
				},
				{
					"id": "email",
					"name": "email",
					"id": "input",
					"inputType": "email",
					"label": "Email Address",
					"placeholder": "Enter your email",
					"rules": [
						{ "type": "required", "message": "Email is required" },
						{ "type": "email", "message": "Please enter a valid email address" }
					]
				},
				{
					"id": "priority",
					"name": "priority",
					"id": "select",
					"label": "Priority Level",
					"options": [
						{ "value": "low", "label": "Low" },
						{ "value": "high", "label": "High" },
						{ "value": "urgent", "label": "Urgent" }
					],
					"constraints": [
						{
							"field": "contactType",
							"operator": "equals",
							"value": "support",
							"action": "show"
						}
					]
				},
				{
					"id": "message",
					"name": "message",
					"id": "textarea",
					"label": "Message",
					"placeholder": "Your message...",
					"rules": [
						{
							"type": "minLength",
							"value": 10,
							"message": "Message must be at least 10 characters long"
						}
					]
				}
			]
		}
	],
	"actions": [
		{
			"id": "contact-submit",
			"type": "submit",
			"description": "Submit contact form",
			"successMessage": "Message sent! Thanks for reaching out.",
			"errorMessage": "Failed to send message. Please try again.",
			"enabled": true,
			"endpoint": "/api/submit-demo",
			"method": "POST"
		}
	]
}
````

## Form Library Adapter Architecture

**Form Engine** uses a flexible adapter system designed to work with your favorite form library. Currently implemented with React Hook Form, but architected for extensibility:

- **Current Adapter**: React Hook Form - providing excellent performance and developer experience
- **Flexible Architecture**: Built with adapter pattern to support TanStack Form, Formik, and others
- **Consistent API**: Same `FormRenderer` interface regardless of underlying form library
- **Future-Ready**: Easy to add support for new form libraries as they emerge
- **JSON-Driven**: Declarative configuration works with any adapter

The adapter system is seamless - Form Engine handles all form library integration automatically while maintaining consistent behavior across different implementations.

## Registry System

The **Registry** is the core mechanism that allows you to register and manage custom form components, field types, and plugins. It enables extensibility and modularity, letting you:

- Register new input components (e.g., custom selects, date pickers)
- Register custom validation rules
- Register layout components for responsive design
- Register stepper components for multi-step forms
- Use tree-shaking to import only the components you need

This system ensures that your forms can be extended and customized for any use case, while keeping configuration fully serializable and type-safe.

## Constraint-Based Logic

The **Constraint System** enables sophisticated form behavior through JSON configuration:

- **Dynamic Visibility**: Show/hide fields based on other field values
- **Conditional Validation**: Make fields required based on conditions
- **State Management**: Enable/disable fields dynamically
- **Array Field Support**: Constraint logic works within dynamic arrays
- **Performance Optimized**: Uses React Hook Form's `useWatch` for efficient updates

All constraint logic is defined in JSON and evaluated in real-time as users interact with the form.

## Actions System

The **Actions System** enables you to define what happens when a form is submitted or when certain events occur. Actions are declared in the form configuration and can include:

- Submitting data to an API endpoint
- Triggering custom logic or side effects
- Chaining multiple actions (sequential workflows)

Actions are fully configurable and support custom plugins, making it easy to implement complex workflows directly from your JSON config.

## Documentation

### Getting Started

- [Introduction](./apps/www/src/pages/docs/introduction.mdx)
- [Installation](./apps/www/src/pages/docs/installation.mdx)
- [Quick Start](./apps/www/src/pages/docs/quick-start.mdx)

### Core Concepts

- [Type System & Augmentation](./packages/core/TYPE_SYSTEM.md) - **Learn how to create custom field types**
- [Actions](./apps/www/src/pages/docs/actions/how-it-works.mdx)
- [Components](./apps/www/src/pages/docs/components/how-it-works.mdx)
- [Hooks](./apps/www/src/pages/docs/hooks/index.mdx)
- [Layouts](./apps/www/src/pages/docs/layout/how-it-works.mdx)

### Package Documentation

- [@json-form-engine/core README](./packages/core/README.md)
- [@json-form-engine/react REGISTRATION](./packages/react/REGISTRATION.md)

See the [`/docs`](./apps/www/src/pages/docs/) folder for more.

## Example Pages

- **[Basic Form](./apps/www/src/pages/docs/examples/basic-form.mdx)**: JSON-based form validation fundamentals.
- **[Contact Form](./apps/www/src/pages/docs/examples/contact-form.mdx)**: Complete contact form with validation.
- **[Registration Flow](./apps/www/src/pages/docs/examples/registration-flow.mdx)**: Multi-step registration with complex validation.
- **[Survey Form](./apps/www/src/pages/docs/examples/survey-form.mdx)**: Dynamic survey with conditional fields.
- **[Sequential Actions](./apps/www/src/pages/docs/examples/sequential-actions.mdx)**: Complex workflows with chained actions.

## License

MIT

---

Built with React, TypeScript, and Zod. Open source and MIT licensed.
