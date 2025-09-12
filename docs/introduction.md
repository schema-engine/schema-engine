# Introduction to Form Engine

> **The form library that doesn't fight you back.**

## Why Form Engine Exists

I've been there. You've been there. We've all been there.

You start a new project, and forms seem simple enough. A contact form here, a registration form there. "I'll just use React Hook Form," you think. "It's great!" And it is.

But then requirements evolve. The client wants conditional fields. Marketing needs auto-save drafts. Product wants multi-step wizards. Analytics needs tracking. You need custom validation rules. Different layouts. Mobile optimization. Integration with your existing component library.

Before you know it, you're writing the same wrapper components over and over. Managing form state manually. Building custom validation systems. Wrestling with complex conditional logic. Your forms become a tangled mess of imperative code that nobody wants to touch.

**I was tired of building the same form infrastructure on every project.**

After years of this dance—trying different libraries, building custom solutions, hitting the same walls repeatedly—I had an epiphany. What if forms could be **purely declarative**? What if complex form behavior could be defined in simple JSON? What if your existing component library could just... work?

Form Engine was born from this frustration and refined through countless real-world projects.

## What Makes Form Engine Different

### It's JSON-Driven, Not Component-Driven

Instead of writing this:

```jsx
<form onSubmit={handleSubmit}>
	<div className="grid grid-cols-2 gap-4">
		<div>
			<label htmlFor="firstName">First Name</label>
			<input id="firstName" {...register("firstName", { required: "Required" })} />
			{errors.firstName && <span>{errors.firstName.message}</span>}
		</div>
		<div>
			<label htmlFor="lastName">Last Name</label>
			<input id="lastName" {...register("lastName", { required: "Required" })} />
			{errors.lastName && <span>{errors.lastName.message}</span>}
		</div>
	</div>
	{/* Imagine 20 more fields like this... */}
</form>
```

You write this:

```json
{
	"id": "contact-form",
	"title": "Contact Information",
	"fields": [
		{
			"id": "firstName",
			"type": "input",
			"label": "First Name",
			"validation": [{ "type": "required" }],
			"grid": { "column": 1 }
		},
		{
			"id": "lastName",
			"type": "input",
			"label": "Last Name",
			"validation": [{ "type": "required" }],
			"grid": { "column": 2 }
		}
	]
}
```

**One JSON schema. Infinite possibilities.**

### Your Components, Your Rules

Form Engine doesn't come with pre-built inputs that you have to style. Instead, it provides a **registration system** that wraps your existing components:

```typescript
// Register your existing Button component
registerComponent("button", ({ formProps, ...props }) => (
	<YourButton disabled={!formProps.isValid} {...props} />
));

// Now it works seamlessly in any form
```

No vendor lock-in. No style constraints. No "FormEngine-looking" forms. Just your components, enhanced with form superpowers.

### Actions, Not Just Validation

Most form libraries focus on validation and submission. Form Engine thinks bigger. What about auto-saving drafts? Analytics tracking? Multi-step navigation? Email notifications? Complex business logic?

```json
{
	"actions": [
		{
			"id": "auto-save",
			"type": "auto_save_draft",
			"interval": 30000,
			"triggers": ["form_change"]
		},
		{
			"id": "track-submission",
			"type": "gtm_event",
			"event": "form_submit",
			"triggers": ["submit_success"]
		},
		{
			"id": "send-notification",
			"type": "notification",
			"message": "Form submitted successfully!",
			"triggers": ["submit_success"]
		}
	]
}
```

**Forms become intelligent workflows, not just data collection.**

### Built for Real-World Complexity

Form Engine was built for the complex scenarios other libraries struggle with:

- **Multi-step wizards** with complex navigation logic
- **Conditional fields** that show/hide based on user input
- **Dynamic arrays** for variable-length lists
- **Responsive layouts** that adapt to screen size
- **Auto-save functionality** with conflict resolution
- **Integration hooks** for external systems
- **Custom validation** beyond basic rules
- **Performance optimization** for large forms

But it starts simple. A basic contact form is still just a few lines of JSON.

## The Philosophy: JSON-Driven UI

At its core, Form Engine embraces a **JSON-driven UI** philosophy:

1. **Configuration over Code**: Define behavior declaratively, not imperatively
2. **Composition over Inheritance**: Build complex forms from simple, reusable pieces
3. **Adaptation over Replacement**: Enhance existing components rather than replacing them
4. **Evolution over Revolution**: Start simple, grow complex as needed

This isn't just about forms—it's a different way of thinking about user interfaces. When your UI is data, it becomes:

- **Versionable**: Store form definitions in your database
- **A/B testable**: Switch forms without code deploys
- **User-configurable**: Let power users customize their experience
- **Translatable**: Multi-language support becomes trivial
- **Portable**: Move forms between projects effortlessly

## What You Can Build

With Form Engine, we've built:

- **E-commerce checkouts** with conditional shipping and payment options
- **Multi-tenant SaaS onboarding** with custom field sets per organization
- **Survey platforms** with branching logic and conditional questions
- **CRM contact forms** with lead scoring and automatic assignment
- **Application forms** with file uploads and digital signatures
- **Configuration wizards** for complex software setup
- **User profile editors** with role-based field visibility

The common thread? They all started as JSON configurations and grew organically as requirements evolved.

## Ready to Start?

If you're tired of rebuilding the same form infrastructure on every project... If you want forms that grow with your requirements instead of fighting them... If you believe that complex problems deserve elegant solutions...

**Welcome to Form Engine.**

Let's build something amazing together.

---

_Built by a developer who was tired of forms being harder than they need to be._
