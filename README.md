# JSON Form Engine

> http://json-form-engine.andeeplus.com

**JSON Form Engine** is a JSON-based, type-safe form builder for React. Define your forms entirely in JSON, and get automatic validation, real-time error handling, and Zod schemas for free.

## Features

- **JSON Configuration**: Define forms in JSON with automatic validation generation.
- **Responsive Grids**: Advanced layout system with device emulation and breakpoint management.
- **Conditional Logic**: Dynamic field rendering based on real-time form state.
- **Type Safety**: Zod validation schemas are created automatically from your configuration.
- **100% Serializable**: All form configs are serializable and portable.
- **Auto-Generated Schemas**: Validation and types are generated from your config.
- **Real-time Validation**: Instant feedback as users fill out forms.
- **Tree-Shakable**: Optimized for modern bundlers.

## Quick Start

Get up and running in three simple steps:

1. **Define Structure**  
   Create your form configuration in JSON format with field definitions.
2. **Auto-Generate**  
   Validation schemas and types are automatically created from your config.
3. **Render & Validate**  
   Display your form with real-time validation and error handling.

## Example

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
					"id": "email",
					"name": "email",
					"componentId": "input",
					"inputType": "email",
					"label": "Email Address",
					"placeholder": "Enter your email",
					"rules": [
						{ "type": "required", "message": "Email is required" },
						{ "type": "email", "message": "Please enter a valid email address" }
					]
				},
				{
					"id": "message",
					"name": "message",
					"componentId": "textarea",
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
```

## Registry System

The **Registry** is the core mechanism that allows you to register and manage custom form components, field types, and plugins. It enables extensibility and modularity, letting you:

- Register new input components (e.g., custom selects, date pickers)
- Register custom validation rules
- Register layout or UI plugins (@todo)

This system ensures that your forms can be extended and customized for any use case, while keeping configuration fully serializable and type-safe.

## Actions System

The **Actions System** enables you to define what happens when a form is submitted or when certain events occur. Actions are declared in the form configuration and can include:

- Submitting data to an API endpoint
- Triggering custom logic or side effects
- Chaining multiple actions (sequential workflows)

Actions are fully configurable and support custom plugins, making it easy to implement complex workflows directly from your JSON config.

## Documentation

- [Introduction](./apps/www/src/pages/docs/introduction.mdx)
- [Installation](./apps/www/src/pages/docs/installation.mdx)
- [Quick Start](./apps/www/src/pages/docs/quick-start.mdx)
- [Actions](./apps/www/src/pages/docs/actions/how-it-works.mdx)
- [Components](./apps/www/src/pages/docs/components/how-it-works.mdx)
- [Examples](./apps/www/src/pages/docs/examples/basic-form.mdx)
- [Hooks](./apps/www/src/pages/docs/hooks/index.mdx)
- [Layouts](./apps/www/src/pages/docs/layout/how-it-works.mdx)

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
