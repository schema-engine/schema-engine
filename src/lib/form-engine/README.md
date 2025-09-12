# Form Engine Library

A comprehensive, type-safe form rendering engine built with React Hook Form, Zod validation, and declarative configuration architecture. The Form Engine provides advanced features including responsive grid layouts, multi-step forms, conditional logic, array fields, and a powerful action system.

## Quick Start

### Basic Form Setup

```typescript
import { FormRenderer } from "@/lib/form-engine";

const basicFormConfig = {
	id: "contact-form",
	title: "Contact Information",
	steps: [
		{
			id: "contact-details",
			title: "Contact Details",
			fields: [
				{
					type: "input",
					name: "firstName",
					label: "First Name",
					validation: [{ type: "required", message: "First name is required" }],
				},
				{
					type: "input",
					name: "email",
					label: "Email",
					inputType: "email",
					validation: [
						{ type: "required", message: "Email is required" },
						{ type: "email", message: "Invalid email format" },
					],
				},
			],
		},
	],
};

export function ContactForm() {
	const handleSubmit = (data: any) => {
		console.log("Form submitted:", data);
	};

	return <FormRenderer config={basicFormConfig} onSubmit={handleSubmit} />;
}
```

### Registry Setup

Import field components you need (tree-shakable):

```typescript
// Import only the fields you use for optimal bundle size
import "@/components/form/registries/input.registry";
import "@/components/form/registries/select.registry";
import "@/components/form/registries/checkbox.registry";

// Or import all for development convenience
import "@/components/form/registries";
```

## Available Field Types

The Form Engine supports a comprehensive set of field types with full TypeScript support:

```typescript
// Input fields with various types
{
  type: "input",
  inputType: "text" | "email" | "password" | "url" | "tel" | "search",
  name: "fieldName",
  label: "Field Label",
  validation: [...]
}

// Select dropdowns
{
  type: "select",
  options: [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" }
  ],
  multiple: true, // For multi-select
  searchable: true // Enable search
}

// Number inputs with constraints
{
  type: "number",
  min: 0,
  max: 100,
  step: 0.1,
  precision: 2
}

// Textarea for long text
{
  type: "textarea",
  rows: 4,
  maxLength: 500
}

// Checkbox for boolean values
{
  type: "checkbox",
  checked: false // Default value
}

// Radio buttons for single selection
{
  type: "radio",
  options: [...],
  orientation: "horizontal" | "vertical"
}

// File uploads
{
  type: "file",
  accept: ".pdf,.doc,.docx",
  multiple: true,
  maxSize: 5242880 // 5MB
}

// Date/time inputs
{
  type: "date",
  dateType: "date" | "datetime-local" | "time",
  min: "2024-01-01",
  max: "2024-12-31"
}

// Toggle switches
{
  type: "switch",
  size: "sm" | "md" | "lg"
}

// Dynamic arrays
{
  type: "array",
  elements: [...], // Array of field configs
  minItems: 1,
  maxItems: 5
}
```

## Multi-Step Forms

Create complex multi-step forms with built-in navigation and validation:

```typescript
const multiStepFormConfig = {
	id: "registration-flow",
	title: "User Registration",
	steps: [
		{
			id: "personal-info",
			title: "Personal Information",
			fields: [
				{ type: "input", name: "firstName", label: "First Name" },
				{ type: "input", name: "lastName", label: "Last Name" },
				{ type: "input", name: "email", label: "Email", inputType: "email" },
			],
		},
		{
			id: "preferences",
			title: "Preferences",
			fields: [
				{
					type: "select",
					name: "theme",
					label: "Preferred Theme",
					options: [
						{ value: "light", label: "Light" },
						{ value: "dark", label: "Dark" },
					],
				},
				{
					type: "checkbox",
					name: "newsletter",
					label: "Subscribe to newsletter",
				},
			],
		},
	],
	stepper: {
		variant: "default", // "default" | "pills" | "arrows" | "dots"
		orientation: "horizontal", // "horizontal" | "vertical"
		showStepNumbers: true,
		validateOnNext: true,
	},
};

// The FormRenderer automatically detects multi-step configuration
<FormRenderer config={multiStepFormConfig} onSubmit={handleSubmit} />;
```

### Manual Stepper Control

For advanced use cases, you can use the stepper components directly:

```typescript
import { Stepper } from "@/lib/form-engine";

<Stepper sections={formSections} currentStep={currentStep}>
	<Stepper.Header variant="default" orientation="horizontal" className="mb-8" />
	<Stepper.Content>{/* Current step content */}</Stepper.Content>
	<Stepper.Navigation
		previousButton={{ label: "Back", variant: "outline" }}
		nextButton={{ label: "Next", variant: "default" }}
	/>
</Stepper>;
```

## Responsive Grid Layout

Create responsive form layouts with CSS Grid and mobile-first cascade behavior:

```typescript
const responsiveFormConfig = {
	id: "responsive-form",
	steps: [
		{
			id: "contact",
			title: "Contact Information",
			fields: [
				{
					type: "input",
					name: "firstName",
					label: "First Name",
					grid: {
						responsive: {
							default: { column: "1 / -1" }, // Full width on mobile
							md: { column: "1 / 2" }, // Half width on tablet+
						},
					},
				},
				{
					type: "input",
					name: "lastName",
					label: "Last Name",
					grid: {
						responsive: {
							default: { column: "1 / -1" }, // Full width on mobile
							md: { column: "2 / 3" }, // Second column on tablet+
						},
					},
				},
				{
					type: "input",
					name: "email",
					label: "Email",
					grid: {
						responsive: {
							default: { column: "1 / -1" }, // Full width on all devices
						},
					},
				},
			],
		},
	],
	grid: {
		columns: 1,
		gap: "1rem",
		responsive: {
			default: { columns: 1, gap: "1rem" }, // Single column on mobile
			md: { columns: 2, gap: "1.5rem" }, // Two columns on tablet
			lg: { columns: 3, gap: "2rem" }, // Three columns on desktop
		},
	},
};
```

### Device Emulation for Testing

Test responsive layouts without resizing your browser:

```typescript
import { ViewportPreview } from "@/lib/form-engine";

<ViewportPreview title="Mobile Preview">
	<FormRenderer config={responsiveFormConfig} />
</ViewportPreview>;
```

**Breakpoint System:**

- `default`: Base mobile styles (required)
- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

Values cascade upward - if you don't define `md`, it inherits from `sm` or `default`.

## Form Actions

Add powerful actions to handle form submission, auto-saving, analytics, and more:

### Submit Actions

```typescript
const formWithSubmit = {
  id: "contact-form",
  steps: [...],
  actions: [
    {
      id: "main-submit",
      type: "submit",
      endpoint: "/api/contact",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      successMessage: "Thank you for your message!",
      errorMessage: "Something went wrong. Please try again.",
      resetAfterSubmit: true,
      collectMetadata: true
    }
  ]
};
```

### Auto-Save Draft

Automatically save form progress with multiple strategies:

```typescript
const formWithAutoSave = {
  id: "long-form",
  steps: [...],
  actions: [
    // Save on user changes (debounced)
    {
      id: "auto-save-changes",
      type: "auto_save_draft",
      mode: "debounced",
      formId: "long-form",
      debounceMs: 2000,
      showNotification: false
    },
    // Backup save every 30 seconds
    {
      id: "auto-save-backup",
      type: "auto_save_draft",
      mode: "interval",
      formId: "long-form",
      intervalMs: 30000,
      showNotification: false
    }
  ]
};
```

### Analytics Integration

Track form interactions with Google Tag Manager:

```typescript
const formWithAnalytics = {
  id: "conversion-form",
  steps: [
    {
      id: "lead-info",
      fields: [...],
      actions: [
        // Track step completion
        {
          id: "step-tracking",
          type: "gtm_event",
          eventName: "form_step_complete",
          eventData: { step: "lead-info" },
          includeFormData: ["email", "source"], // Only specific fields
          includeMetadata: true
        }
      ]
    }
  ],
  actions: [
    // Track form submission
    {
      id: "conversion-tracking",
      type: "gtm_event",
      eventName: "form_conversion",
      eventData: {
        conversion_type: "lead",
        form_version: "v2"
      },
      includeFormData: true, // All form data
      includeMetadata: true
    }
  ]
};
```

### GDPR-Compliant Data Handling

Auto-save actions automatically respect user consent preferences:

```typescript
import { useGDPRConsent } from "@/lib/form-engine";

function MyForm() {
	const gdpr = useGDPRConsent();

	// Check consent status
	if (!gdpr.hasConsent()) {
		// Auto-save will show consent prompt automatically
	}

	return <FormRenderer config={formConfig} />;
}
```

## Conditional Logic

Show/hide fields dynamically based on user input:

```typescript
const conditionalFormConfig = {
	id: "conditional-form",
	steps: [
		{
			id: "preferences",
			fields: [
				{
					type: "select",
					name: "userType",
					label: "User Type",
					options: [
						{ value: "basic", label: "Basic User" },
						{ value: "premium", label: "Premium User" },
						{ value: "enterprise", label: "Enterprise User" },
					],
				},
				{
					type: "input",
					name: "premiumFeatures",
					label: "Premium Features Needed",
					constraints: [
						{
							field: "userType",
							operator: "equals",
							value: "premium",
							action: "show",
						},
					],
				},
				{
					type: "textarea",
					name: "enterpriseRequirements",
					label: "Enterprise Requirements",
					constraints: [
						{
							field: "userType",
							operator: "equals",
							value: "enterprise",
							action: "show",
						},
					],
				},
				{
					type: "number",
					name: "teamSize",
					label: "Team Size",
					constraints: [
						{
							field: "userType",
							operator: "not_equals",
							value: "basic",
							action: "show",
						},
					],
				},
			],
		},
	],
};
```

### Available Constraint Operators

- **Equality**: `equals`, `not_equals`
- **Content**: `contains`, `not_contains`
- **Comparison**: `greater_than`, `less_than`
- **Existence**: `is_empty`, `is_not_empty`

### Available Constraint Actions

- **Visibility**: `show`, `hide`
- **Interaction**: `enable`, `disable`
- **Validation**: `require` (makes field required when condition is met)

### Multiple Constraints

Fields can have multiple constraints (AND logic):

```typescript
{
  type: "input",
  name: "advancedOptions",
  constraints: [
    { field: "userType", operator: "equals", value: "premium", action: "show" },
    { field: "hasExperience", operator: "equals", value: true, action: "show" }
  ]
  // Only shows when user is premium AND has experience
}
```

## Dynamic Array Fields

Create repeatable field groups for dynamic data collection:

```typescript
const arrayFormConfig = {
	id: "contacts-form",
	steps: [
		{
			id: "contacts",
			title: "Contact Information",
			fields: [
				{
					type: "array",
					name: "contacts",
					label: "Contact List",
					elements: [
						{
							type: "input",
							name: "name",
							label: "Full Name",
							validation: [{ type: "required", message: "Name is required" }],
						},
						{
							type: "input",
							name: "email",
							label: "Email Address",
							inputType: "email",
							validation: [
								{ type: "required", message: "Email is required" },
								{ type: "email", message: "Invalid email format" },
							],
						},
						{
							type: "select",
							name: "relationship",
							label: "Relationship",
							options: [
								{ value: "family", label: "Family" },
								{ value: "friend", label: "Friend" },
								{ value: "colleague", label: "Colleague" },
							],
						},
					],
					minItems: 1,
					maxItems: 5,
					addButtonText: "Add Contact",
					removeButtonText: "Remove Contact",
				},
			],
		},
	],
};
```

### Simple Array Fields

For arrays of a single field type:

```typescript
{
  type: "array",
  name: "skills",
  label: "Skills",
  elements: [
    {
      type: "input",
      name: "skill",
      label: "Skill",
      placeholder: "e.g., JavaScript, Python, Design..."
    }
  ],
  minItems: 1,
  maxItems: 10,
  addButtonText: "Add Skill"
}
```

Array fields automatically handle:

- Adding/removing items with buttons
- Validation for each array item
- Minimum/maximum item constraints
- Unique key generation for React rendering

## Validation System

Define validation rules once in your configuration - Zod schemas are automatically generated:

```typescript
const validatedFormConfig = {
	id: "registration-form",
	autoGenerateSchema: true, // Enable automatic schema generation
	steps: [
		{
			id: "user-info",
			fields: [
				{
					type: "input",
					name: "username",
					label: "Username",
					validation: [
						{ type: "required", message: "Username is required" },
						{ type: "minLength", value: 3, message: "Username must be at least 3 characters" },
						{ type: "maxLength", value: 20, message: "Username cannot exceed 20 characters" },
						{
							type: "pattern",
							value: "^[a-zA-Z0-9_]+$",
							message: "Username can only contain letters, numbers, and underscores",
						},
					],
				},
				{
					type: "input",
					name: "email",
					label: "Email",
					inputType: "email",
					validation: [
						{ type: "required", message: "Email is required" },
						{ type: "email", message: "Please enter a valid email address" },
					],
				},
				{
					type: "input",
					name: "password",
					label: "Password",
					inputType: "password",
					validation: [
						{ type: "required", message: "Password is required" },
						{ type: "minLength", value: 8, message: "Password must be at least 8 characters" },
						{
							type: "custom",
							message:
								"Password must contain at least one uppercase letter, one lowercase letter, and one number",
							validator: (value: string) => {
								return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value);
							},
						},
					],
				},
				{
					type: "number",
					name: "age",
					label: "Age",
					validation: [
						{ type: "required", message: "Age is required" },
						{ type: "min", value: 18, message: "You must be at least 18 years old" },
						{ type: "max", value: 120, message: "Please enter a valid age" },
					],
				},
			],
		},
	],
};
```

### Available Validation Rules

- **Required**: `{ type: "required", message: "..." }`
- **String Length**: `{ type: "minLength", value: 5, message: "..." }`, `{ type: "maxLength", value: 100, message: "..." }`
- **Numeric Range**: `{ type: "min", value: 0, message: "..." }`, `{ type: "max", value: 100, message: "..." }`
- **Format Validation**: `{ type: "email", message: "..." }`, `{ type: "url", message: "..." }`
- **Pattern Matching**: `{ type: "pattern", value: "regex", message: "..." }`
- **Custom Validation**: `{ type: "custom", message: "...", validator: (value) => boolean }`

### Automatic Schema Generation

The validation rules automatically generate equivalent Zod schemas:

```typescript
// This validation config:
validation: [
	{ type: "required", message: "Email is required" },
	{ type: "email", message: "Invalid email" },
	{ type: "minLength", value: 5, message: "Too short" },
];

// Automatically becomes:
z.string().min(1, "Email is required").email("Invalid email").min(5, "Too short");
```

No need to write Zod schemas manually - they're generated from your field configurations!

## Advanced Usage

### Custom Field Components

Extend the Form Engine with your own field types:

```typescript
import { registry } from "@/lib/form-engine";

// Create a custom field component
function CustomRatingField({ config, value, onChange }: FieldProps) {
  return (
    <div>
      <label>{config.label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={value >= rating ? "text-yellow-500" : "text-gray-300"}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

// Register the custom field
registry.register("rating", CustomRatingField);

// Use in your form config
{
  type: "rating",
  name: "satisfaction",
  label: "How satisfied are you?",
  defaultValue: 0
}
```

### Form Configuration Management

Organize form configurations in a centralized location:

```typescript
// src/configs/forms/contact-forms.ts
export const contactFormConfig = {
  id: "contact-form",
  title: "Get in Touch",
  steps: [...]
};

export const feedbackFormConfig = {
  id: "feedback-form",
  title: "Share Feedback",
  steps: [...]
};

// Use in components
import { contactFormConfig } from "@/configs/forms/contact-forms";

function ContactPage() {
  return <FormRenderer config={contactFormConfig} onSubmit={handleSubmit} />;
}
```

### Integration with External APIs

Handle form submission with custom logic:

```typescript
function MyForm() {
	const handleSubmit = async (data: any) => {
		try {
			// Custom submission logic
			const response = await fetch("/api/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (response.ok) {
				toast.success("Form submitted successfully!");
			} else {
				toast.error("Submission failed. Please try again.");
			}
		} catch (error) {
			console.error("Submission error:", error);
			toast.error("Network error. Please check your connection.");
		}
	};

	return <FormRenderer config={formConfig} onSubmit={handleSubmit} />;
}
```

### Performance Optimization

```typescript
// Tree-shake unused field components in production
import "@/components/form/registries/input.registry";
import "@/components/form/registries/select.registry";
import "@/components/form/registries/textarea.registry";
// Only these three field types will be bundled

// For development, import all for convenience
import "@/components/form/registries"; // All field types
```

## API Reference

### Core Hooks

````typescript
```typescript
import {
	useActionExecutor,
	useConstraintLogic,
	useGDPRConsent,
	useFormGridStyles,
	useFieldGridStyles,
} from "@/lib/form-engine";

// Action management
const actionExecutor = useActionExecutor();
// Actions are now handled automatically by the form provider
// or can be executed directly via actionExecutor.executeTrigger()
````

// Conditional logic evaluation
const { isVisible, isEnabled, isRequired } = useConstraintLogic(fieldConfig.constraints, formWatch);

// GDPR consent management
const gdpr = useGDPRConsent();
if (gdpr.hasConsent()) {
// Enable data storage features
}

// Grid system styling
const containerStyles = useFormGridStyles(gridConfig);
const fieldStyles = useFieldGridStyles(fieldConfig.grid);

````

### Type Definitions

```typescript
import type {
	FormConfig,
	FieldConfig,
	FormStep,
	FormActionConfig,
	GridLayoutConfig,
	ConstraintLogic,
	ValidationRule,
} from "@/lib/form-engine";
````

### Components

```typescript
import {
  FormRenderer,
  Stepper,
  ViewportPreview
} from "@/lib/form-engine";

// Main form renderer
<FormRenderer
  config={formConfig}
  onSubmit={handleSubmit}
  onChange={handleChange}
/>

// Manual stepper control
<Stepper sections={sections} currentStep={step}>
  <Stepper.Header variant="default" />
  <Stepper.Content>{content}</Stepper.Content>
  <Stepper.Navigation />
</Stepper>

// Responsive testing
<ViewportPreview title="Mobile Preview">
  <FormRenderer config={config} />
</ViewportPreview>
```

## Examples

Complete working examples can be found in:

- **Basic Forms**: `src/configs/forms/demo-forms.ts`
- **Multi-Step Forms**: `src/configs/forms/showcase-forms.ts`
- **Responsive Layouts**: `src/configs/forms/responsive-forms.ts`
- **Conditional Logic**: `src/configs/forms/conditional-forms.ts`
- **Field Constraints**: `src/configs/forms/constraints-forms.ts`

## Architecture

For detailed information about the Form Engine's internal architecture, design patterns, and extension points, see [ARCHITECTURE.md](./ARCHITECTURE.md).
