# Base UI Form Input Elements

This directory contains form input field components built using [Base UI](https://base-ui.com/) components.

## Available Input Elements

- **Input** (`input`) - Text input field with multiple input types (text, email, password, url, tel, search, date)
- **Textarea** (`textarea`) - Multi-line text input field
- **Number** (`number`) - Number input field with min/max/step support
- **Select** (`select`) - Dropdown select field for choosing from multiple options
- **Radio** (`radio`) - Radio button group with horizontal/vertical orientation
- **Checkbox** (`checkbox`) - Single checkbox input field for boolean values
- **Checkbox Group** (`checkbox-group`) - Multiple checkboxes for multi-select
- **Switch** (`switch`) - Toggle switch field for boolean values
- **Slider** (`slider`) - Range slider input with configurable min/max/step
- **Input OTP** (`input-otp`) - One-time password input with multiple slots

## Component Structure

Each component follows a consistent 3-file pattern:

- `form-[name].types.ts` - TypeScript types and Zod schemas
- `form-[name].tsx` - React component implementation
- `form-[name].registration.ts` - Element registration (`defineInput` / `defineStatic`)

## Quick Start

### Import Elements

```typescript
// Install `schema-form` or an individual item first, then import locally.
import {
	InputElementRegistration,
	TextareaElementRegistration,
	SelectElementRegistration,
	CheckboxElementRegistration,
	RadioElementRegistration,
	SwitchElementRegistration,
	NumberElementRegistration,
	SliderElementRegistration,
	CheckboxGroupElementRegistration,
	InputOTPElementRegistration,
} from '@/components/schema-engine/forms/inputs';
```

### Register in Form Engine

```typescript
import { createFormEngine } from '@schema-engine/forms';

const engine = createFormEngine({
	elements: [
		InputElementRegistration,
		TextareaElementRegistration,
		SelectElementRegistration,
		CheckboxElementRegistration,
		RadioElementRegistration,
		SwitchElementRegistration,
		NumberElementRegistration,
		SliderElementRegistration,
		CheckboxGroupElementRegistration,
		InputOTPElementRegistration,
	],
});
```

### Use in Form Configuration

```typescript
const formConfig = {
	fields: [
		{
			$type: 'input',
			name: 'email',
			label: 'Email Address',
			inputType: 'email',
			placeholder: 'Enter your email',
			rules: [{ type: 'required', message: 'Email is required' }],
		},
		{
			$type: 'textarea',
			name: 'message',
			label: 'Message',
			placeholder: 'Enter your message',
			rows: 5,
		},
		{
			$type: 'select',
			name: 'country',
			label: 'Country',
			options: [
				{ value: 'us', label: 'United States' },
				{ value: 'ca', label: 'Canada' },
				{ value: 'uk', label: 'United Kingdom' },
			],
		},
		{
			$type: 'checkbox-group',
			name: 'interests',
			label: 'Interests',
			options: [
				{ value: 'sports', label: 'Sports' },
				{ value: 'music', label: 'Music' },
				{ value: 'reading', label: 'Reading' },
			],
		},
		{
			$type: 'slider',
			name: 'rating',
			label: 'Rating',
			min: 0,
			max: 10,
			step: 1,
		},
		{
			$type: 'input-otp',
			name: 'otp',
			label: 'Verification Code',
			length: 6,
		},
	],
};
```

## Common Configuration Options

### Input Field

```typescript
{
	$type: 'input',
	name: 'fieldName',
	label: 'Field Label',
	inputType: 'text', // text, email, password, url, tel, search, date
	placeholder: 'Enter value...',
	disabled: false,
	autoComplete: 'off',
	autoFocus: false,
	spellCheck: true,
	rules: [...], // Validation rules
}
```

### Textarea Field

```typescript
{
	$type: 'textarea',
	name: 'fieldName',
	label: 'Field Label',
	rows: 5,
	cols: 40,
	resize: 'both', // none, both, horizontal, vertical
	placeholder: 'Enter text...',
	spellCheck: true,
	wrap: 'soft', // hard, soft
}
```

### Select Field

```typescript
{
	$type: 'select',
	name: 'fieldName',
	label: 'Choose Option',
	options: [
		{ value: 'opt1', label: 'Option 1', disabled: false },
		{ value: 'opt2', label: 'Option 2' },
	],
	placeholder: 'Select...',
}
```

`select` is intentionally single-value. Use `combobox` with `multiple: true`
when a chips-based multi-selection is needed.

### Radio Field

```typescript
{
	$type: 'radio',
	name: 'fieldName',
	label: 'Choose One',
	options: [
		{ value: 'opt1', label: 'Option 1' },
		{ value: 'opt2', label: 'Option 2' },
	],
	orientation: 'vertical', // vertical, horizontal
}
```

### Checkbox Group

```typescript
{
	$type: 'checkbox-group',
	name: 'fieldName',
	label: 'Select Multiple',
	options: [
		{ value: 'opt1', label: 'Option 1' },
		{ value: 'opt2', label: 'Option 2' },
	],
	orientation: 'vertical', // vertical, horizontal
}
```

### Slider Field

```typescript
{
	$type: 'slider',
	name: 'fieldName',
	label: 'Select Range',
	min: 0,
	max: 100,
	step: 1,
	orientation: 'horizontal', // horizontal, vertical
}
```

### Input OTP

```typescript
{
	$type: 'input-otp',
	name: 'fieldName',
	label: 'Enter Code',
	length: 6,
	pattern: 'numeric', // numeric, alphanumeric
	incompleteMessage: 'Enter all 6 characters', // optional, shown for a partly filled code
}
```

The field schema adds an exact-length rule that accepts an empty code or one with every slot filled, unless you write a `minLength`, `maxLength` or `pattern` rule. Headless `validateFormValues` and the renderer apply the same rule.

## Features

All Base UI form input elements:

- ✅ Integrate seamlessly with form engine validation and state management
- ✅ Support standard field properties (name, label, description, disabled, readonly, etc.)
- ✅ Include proper error handling and display
- ✅ Support custom event handlers (onChange, onBlur, onFocus)
- ✅ Fully typed with TypeScript and Zod schemas
- ✅ Follow the same patterns as shadcn/ui elements
- ✅ Accessible with proper ARIA attributes
- ✅ Support grid layout and custom styling

## Validation

All fields support validation through the `rules` property:

```typescript
{
	$type: 'input',
	name: 'email',
	label: 'Email',
	rules: [
		{ type: 'required', message: 'Email is required' },
		{ type: 'email', message: 'Invalid email format' },
		{ type: 'minLength', value: 5, message: 'Email too short' },
		{ type: 'maxLength', value: 100, message: 'Email too long' },
	],
}
```

## Styling

Fields support CSS classes and, as an escape hatch, CSS custom properties through `style`
(keys must start with `--`; any other key fails validation):

```typescript
{
	$type: 'input',
	name: 'fieldName',
	label: 'Field',
	style: {
		'--field-gap': '1rem',
	},
	className: 'my-custom-class',
}
```

## Grid Layout

Position fields in a CSS Grid:

```typescript
{
	$type: 'input',
	name: 'firstName',
	label: 'First Name',
	grid: {
		column: '1 / 2',
		row: 'auto',
		justifySelf: 'start',
		alignSelf: 'center',
		responsive: {
			sm: { column: '1 / 3' },
			md: { column: '1 / 2' },
		},
	},
}
```

## Conditional Logic

Show/hide or enable/disable fields based on conditions:

```typescript
{
	$type: 'textarea',
	name: 'otherReason',
	label: 'Please explain',
	constraints: [
		{
			field: 'reason',
			operator: 'equals',
			value: 'other',
			action: 'show', // show, hide, enable, disable, require
		},
	],
}
```

## Array Elements

Array registrations declare `containerKind: 'array'`; the engine uses this
metadata to seed normalized defaults independently of the widget name.
Add appends `createArrayRowDefault` from `@schema-engine/forms`, the same row
value the Radiant renderer builds. Whether rows are scalar is decided from the
live form values, as in Radiant. A disabled array disables its add and remove
buttons; `FormElement` disables its rows.

## See Also

- [Base UI Form Elements Overview](../README.md)
- [Field Development Guide](../../shadcn/inputs/README.md)
- [Submit Button Action](../actions/index.ts)
