# Base UI Form Action Elements

This directory contains form action components built using [Base UI](https://base-ui.com/) components.

## Available Action Elements

- **Submit Button** (`submit`) - Form submission button that handles submitting state

## Component Structure

Each action follows a consistent 3-file pattern:

- `[name].types.ts` - TypeScript types and Zod schemas
- `[name].tsx` - React component implementation
- `[name].registration.ts` - Element registration (`defineStatic`)

## Submit Button

### Overview

The submit button component provides a button that submits the form while displaying a loading state during submission.

### Configuration

```typescript
{
	$type: 'submit',
	name: 'submitBtn',
	label: 'Submit Form', // Button text
	disabled: false, // Optional: disable button
	className: 'custom-class', // Optional: custom CSS classes
	style: { '--button-margin': '1rem' }, // Optional: CSS custom properties only, read by your own CSS
}
```

### Usage Example

```typescript
import { SubmitButtonElementRegistration } from '@components/schema-engine/forms/actions';
import { createFormEngine } from '@schema-engine/forms';

const engine = createFormEngine({ elements: [SubmitButtonElementRegistration] });

// In your form config
const formConfig = {
	fields: [
		{
			$type: 'input',
			name: 'email',
			label: 'Email',
			// ... other config
		},
		{
			$type: 'submit',
			name: 'submit',
			label: 'Send Email',
		},
	],
};
```

### Features

- ✅ Automatic loading state during form submission
- ✅ Disabled when form is submitting
- ✅ Customizable button text via `label`
- ✅ Optional `onClick` handler for additional actions
- ✅ Support for custom styling and CSS classes
- ✅ Proper ARIA attributes for accessibility

### Button States

**Default State:**

- Shows the configured label text
- Enabled and clickable

**Submitting State:**

- Displays "Submitting..."
- Disabled to prevent multiple submissions
- Sets `aria-busy="true"` for screen readers

**Error/Completion:**

- Returns to default state after submission completes

### Styling

```typescript
{
	$type: 'submit',
	name: 'submit',
	label: 'Submit',
	className: 'btn-large btn-primary',
	style: {
		'--button-margin': '1.5rem',
	},
}
```

### Conditional Display

Show submit button based on conditions:

```typescript
{
	$type: 'submit',
	name: 'submit',
	label: 'Complete Registration',
	constraints: [
		{
			field: 'agreeToTerms',
			operator: 'equals',
			value: true,
			$type: 'show',
		},
	],
}
```

### Standalone Usage

```tsx
import { SubmitButton } from '@components/schema-engine/forms/actions';

export function MyForm() {
	return (
		<form>
			{/* Form fields */}
			<SubmitButton $type="submit" name="submit" label="Save Changes" onClick={() => console.log('Submitted')} />
		</form>
	);
}
```

## See Also

- [Base UI Form Elements Overview](../README.md)
- [Input Elements](../inputs/README.md)
