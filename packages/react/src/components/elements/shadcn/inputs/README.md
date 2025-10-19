# Field Development Guide

## Overview

This guide explains best practices for creating custom field components in the form engine. Fields are the building blocks of forms, representing individual input controls that users interact with.

## Key Principles

### 1. Extend BaseFieldSchema

**Important**: All field types **must extend** `BaseFieldSchema` from `@json-form-engine/core/schemas/base-field`.

```typescript
import { z } from "zod";
import { BaseFieldSchema } from "@json-form-engine/core/schemas/base-field";

export const MyFieldSchema = BaseFieldSchema.extend({
	$type: z.literal("my-field"),
	// Add your field-specific properties
	customProp: z.string().optional(),
});
```

**Why?** `BaseFieldSchema` provides essential properties that all fields need: `name`, `label`, `description`, `disabled`, `readonly`, `rules` (validation), `grid` (layout), `style`, `className`, and `constraints` (conditional logic).

### 2. Use useControlledFormElement Hook

All fields should use the `useControlledFormElement` hook (or `useAdapterControlledFormElement` for adapter-aware fields) to integrate with the form system:

```tsx
import { useControlledFormElement, combineHandlers } from "@/hooks";

export function MyField({ onChange: propsOnChange, onBlur: propsOnBlur, ...config }: MyFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	// Your field implementation
}
```

**What it provides**:

- `value`: Current field value
- `error`: Validation error message
- `onChange`: Form-connected change handler
- `onBlur`: Form-connected blur handler
- `fieldProps`: Common HTML attributes (id, name, disabled, aria-\*)
- `isRequired`: Whether field is required based on validation rules
- `containerStyles`: Grid layout and custom styles
- `labelProps`: Label element attributes
- `errorProps`: Error message attributes

### 3. Support Optional Event Handlers

Fields should accept optional `onChange`, `onBlur`, and `onFocus` handlers for additional external usage:

```typescript
export type MyFieldProps = MyFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
```

Combine them with the form-connected handlers using `combineHandlers`:

```tsx
<Input
	value={value}
	onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
	onBlur={combineHandlers(onBlur, propsOnBlur)}
	onFocus={propsOnFocus}
/>
```

## Field Component Template

Here's a complete template for creating a new field component:

```tsx
// my-field.tsx
import { useControlledFormElement, combineHandlers } from "@/hooks";
import { FieldGroup } from "@/components/form/field-group";
import type { MyFieldProps } from "./my-field.types";

/**
 * My Field Component
 * Description of what this field does and when to use it
 */
export function MyField({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: MyFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	// Extract field-specific config with defaults
	const { variant = "default", showHelper = true } = config;

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				htmlFor={config.id}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				{config.description && showHelper ? (
					<p className="text-sm text-muted-foreground mb-2">{config.description}</p>
				) : null}

				{/* Your field UI component */}
				<input
					{...fieldProps}
					type="text"
					value={value || ""}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					placeholder={config.placeholder}
					className={config.className}
				/>
			</FieldGroup>
		</div>
	);
}
```

```typescript
// my-field.types.ts
import { z } from "zod";
import { BaseFieldSchema } from "@json-form-engine/core/schemas/base-field";

/**
 * My field specific properties schema
 * Only includes serializable props that we want to configure
 * Validation is handled by the rules key in BaseFieldSchema
 */
export const MyFieldExtensionSchema = z.object({
	variant: z.enum(["default", "outline", "ghost"]).default("default"),
	showHelper: z.boolean().optional(),
	maxLength: z.number().optional(),
});

/**
 * Complete field schema
 */
export const MyFieldSchema = BaseFieldSchema.extend({
	$type: z.literal("my-field"),
	...MyFieldExtensionSchema.shape,
});

/**
 * Field configuration type
 */
export type MyFieldConfig = z.infer<typeof MyFieldSchema>;

/**
 * Field component props interface
 * Adds optional handlers for standalone usage
 */
export type MyFieldProps = MyFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

/**
 * Example field configuration for documentation
 */
export const myFieldExample: MyFieldConfig = {
	$type: "my-field",
	name: "exampleField",
	label: "Example Field",
	description: "This is an example field",
	placeholder: "Enter value...",
	variant: "default",
	showHelper: true,
};
```

```typescript
// my-field.registration.ts
import { MyField } from "./my-field";
import type { MyFieldConfig, MyFieldProps } from "./my-field.types";
import { MyFieldSchema } from "./my-field.types";
import type { ElementRegistration } from "@json-form-engine/core";

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			"my-field": MyFieldConfig;
		}
	}
}

export const MyFieldRegistration: ElementRegistration<MyFieldConfig, MyFieldProps> = {
	$type: "my-field",
	render: MyField,
	schema: MyFieldSchema,
	metadata: {
		name: "My Field",
		description: "A custom field for...",
		category: "input",
	},
};
```

## Common Field Patterns

### Pattern 1: Simple Text Input

```tsx
import { Input } from "@/shadcn/ui/input";
import { FieldGroup } from "@/components/form/field-group";
import { useControlledFormElement, combineHandlers } from "@/hooks";

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				htmlFor={config.id}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				<Input
					{...fieldProps}
					type={config.inputType || "text"}
					value={value || ""}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					placeholder={config.placeholder}
				/>
				{config.description ? (
					<p className="text-sm text-muted-foreground mb-2">{config.description}</p>
				) : null}
			</FieldGroup>
		</div>
	);
}
```

### Pattern 2: Checkbox/Switch (Boolean)

```tsx
import { Checkbox } from "@/shadcn/ui/checkbox";
import { Label } from "@/shadcn/ui/label";
import { useControlledFormElement, combineHandlers } from "@/hooks";

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: CheckboxFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } =
		useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description ? (
				<p className="text-sm text-muted-foreground">{config.description}</p>
			) : null}
			<div className="flex items-center space-x-2">
				<Checkbox
					{...fieldProps}
					checked={Boolean(field.value)}
					onCheckedChange={(checked) => combineHandlers(field.onChange, propsOnChange)(checked)}
					onBlur={combineHandlers(field.onBlur, propsOnBlur)}
				/>
				{config.label ? <Label {...labelProps}>{config.label}</Label> : null}
			</div>
			{errorProps ? <div {...errorProps}>{fieldState.error?.message}</div> : null}
		</div>
	);
}
```

### Pattern 3: Select/Dropdown with Options

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shadcn/ui/select";
import { Label } from "@/shadcn/ui/label";
import { useControlledFormElement, combineHandlers } from "@/hooks";

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: SelectFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } =
		useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label ? <Label {...labelProps}>{config.label}</Label> : null}
			{config.description ? (
				<p className="text-sm text-muted-foreground">{config.description}</p>
			) : null}
			<Select
				value={field.value || ""}
				onValueChange={(value) => combineHandlers(field.onChange, propsOnChange)(value)}
				disabled={fieldProps.disabled}
			>
				<SelectTrigger {...fieldProps} onBlur={combineHandlers(field.onBlur, propsOnBlur)}>
					<SelectValue placeholder={config.placeholder} />
				</SelectTrigger>
				<SelectContent>
					{config.options.map((option) => (
						<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{errorProps ? <div {...errorProps}>{fieldState.error?.message}</div> : null}
		</div>
	);
}
```

### Pattern 4: Radio Group

```tsx
import { RadioGroup, RadioGroupItem } from "@/shadcn/ui/radio-group";
import { Label } from "@/shadcn/ui/label";
import { useControlledFormElement, combineHandlers } from "@/hooks";

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: RadioFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } =
		useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label ? <Label {...labelProps}>{config.label}</Label> : null}
			{config.description ? (
				<p className="text-sm text-muted-foreground">{config.description}</p>
			) : null}
			<RadioGroup
				{...fieldProps}
				value={field.value || ""}
				onValueChange={(value) => combineHandlers(field.onChange, propsOnChange)(value)}
				onBlur={combineHandlers(field.onBlur, propsOnBlur)}
				className={config.orientation === "horizontal" ? "flex space-x-4" : "space-y-2"}
			>
				{config.options.map((option) => (
					<div key={option.value} className="flex items-center space-x-2">
						<RadioGroupItem value={String(option.value)} disabled={option.disabled} />
						<Label htmlFor={`${config.id}-${option.value}`}>{option.label}</Label>
					</div>
				))}
			</RadioGroup>
			{errorProps ? <div {...errorProps}>{fieldState.error?.message}</div> : null}
		</div>
	);
}
```

### Pattern 5: Array/Repeatable Fields

For fields that manage arrays of values:

```tsx
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/shadcn/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function FormArrayElements({ onChange: propsOnChange, ...config }: ArrayElementsProps) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: config.name,
	});

	const handleAdd = () => {
		const defaultValue = config.elements.reduce((acc, element) => {
			acc[element.name] = element.defaultValue || "";
			return acc;
		}, {});
		append(defaultValue);
	};

	const canAdd = !config.maxItems || fields.length < config.maxItems;
	const canRemove = !config.minItems || fields.length > config.minItems;

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label ? <Label>{config.label}</Label> : null}
			{fields.map((field, index) => (
				<div key={field.id} className="flex gap-2">
					<div className="flex-1">{/* Render field elements */}</div>
					{canRemove ? (
						<Button type="button" variant="ghost" onClick={() => remove(index)}>
							<Trash2 className="h-4 w-4" />
						</Button>
					) : null}
				</div>
			))}
			{canAdd ? (
				<Button type="button" variant="outline" onClick={handleAdd}>
					<Plus className="h-4 w-4 mr-2" />
					Add Item
				</Button>
			) : null}
		</div>
	);
}
```

## BaseFieldSchema Properties

All fields inherit these properties:

```typescript
interface BaseField {
	// Required
	name: string; // Form field name for submission
	$type: string; // Field component identifier

	// Common properties
	id?: string; // HTML element ID
	label?: string; // Display label
	description?: string; // Help text
	placeholder?: string; // Placeholder text

	// State
	disabled?: boolean; // Disable field
	readonly?: boolean; // Read-only mode
	defaultValue?: any; // Initial value

	// Validation
	rules?: ValidationRule[]; // Validation rules

	// Styling
	className?: string; // CSS classes
	style?: Record<string, any>; // Inline styles

	// Layout
	grid?: ElementGridConfig; // Grid positioning

	// Conditional Logic
	constraints?: ConstraintLogic[]; // Show/hide/enable/disable rules
}
```

### Validation Rules

Fields support validation through the `rules` array:

```typescript
{
	name: 'email',
	$type: 'input',
	label: 'Email',
	rules: [
		{ type: 'required', message: 'Email is required' },
		{ type: 'email', message: 'Invalid email format' },
		{ type: 'minLength', value: 5, message: 'Email too short' },
	]
}
```

### Grid Layout

Fields support CSS Grid positioning:

```typescript
{
	name: 'firstName',
	$type: 'input',
	grid: {
		column: '1 / 2',     // Grid column placement
		row: 'auto',         // Grid row placement
		justifySelf: 'start', // Horizontal alignment
		alignSelf: 'center',  // Vertical alignment
		responsive: {
			sm: { column: '1 / 3' },
			md: { column: '1 / 2' }
		}
	}
}
```

### Conditional Logic

Fields can be shown/hidden based on other field values:

```typescript
{
	name: 'otherReason',
	$type: 'textarea',
	constraints: [
		{
			field: 'reason',
			operator: 'equals',
			value: 'other',
			action: 'show'  // or 'hide', 'enable', 'disable', 'require'
		}
	]
}
```

## FieldGroup Component

Use the `FieldGroup` component for consistent field layout:

```tsx
<FieldGroup
	label={config.label || config.name}
	htmlFor={config.id}
	hiddenLabel={!config.label}
	required={isRequired}
	error={error}
	className={config.className}
>
	{/* Your field input */}
</FieldGroup>
```

**What it provides**:

- Consistent label styling
- Required indicator (\*)
- Error message display
- Proper accessibility attributes
- Screen reader support

## Hook API Reference

### useControlledFormElement

The primary hook for field integration:

```typescript
const {
	value, // Current field value
	error, // Validation error string
	onChange, // Form-connected change handler
	onBlur, // Form-connected blur handler
	fieldProps, // Common HTML attributes
	isRequired, // Whether field is required
	containerStyles, // Grid + custom styles
	labelProps, // Label element attributes
	errorProps, // Error message attributes
	gridStyles, // Grid layout styles
} = useControlledFormElement(config);
```

### combineHandlers

Utility to combine multiple event handlers:

```typescript
// Combines form handler with optional prop handler
<Input
	onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
	onBlur={combineHandlers(onBlur, propsOnBlur)}
/>
```

## Field Categories

Organize fields by category in metadata:

```typescript
export const MyFieldRegistration: ElementRegistration = {
	$type: "my-field",
	render: MyField,
	schema: MyFieldSchema,
	metadata: {
		name: "My Field",
		description: "Description",
		category: "input", // or 'selection', 'layout', 'advanced', etc.
	},
};
```

Common categories:

- `input`: Text inputs, numbers, dates
- `selection`: Checkboxes, radios, selects
- `text`: Textareas, rich text editors
- `layout`: Containers, dividers, spacers
- `advanced`: File uploads, arrays, custom components

## Type Augmentation

Extend the global `ElementRegistry` to get type safety:

```typescript
declare global {
	namespace FormEngine {
		interface ElementRegistry {
			"my-field": MyFieldConfig;
		}
	}
}
```

This enables:

- Type-safe field configuration in JSON schemas
- IntelliSense for field properties
- Compile-time validation of field configs

## Testing Your Field

Test your field with various configurations:

```typescript
// Test 1: Basic field
const basicField = {
	$type: "my-field",
	name: "testField",
	label: "Test Field",
};

// Test 2: Required field with validation
const requiredField = {
	$type: "my-field",
	name: "requiredField",
	label: "Required Field",
	rules: [{ type: "required", message: "This field is required" }],
};

// Test 3: Disabled field
const disabledField = {
	$type: "my-field",
	name: "disabledField",
	label: "Disabled Field",
	disabled: true,
};

// Test 4: Field with conditional logic
const conditionalField = {
	$type: "my-field",
	name: "conditionalField",
	label: "Conditional Field",
	constraints: [
		{
			field: "showField",
			operator: "equals",
			value: true,
			action: "show",
		},
	],
};

// Test 5: Field with grid layout
const gridField = {
	$type: "my-field",
	name: "gridField",
	label: "Grid Field",
	grid: {
		column: "1 / 3",
		responsive: {
			sm: { column: "1 / 2" },
		},
	},
};
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Not Using FieldProps Spread

```tsx
// Wrong: Missing important attributes
<input
	id={config.id}
	value={value}
	onChange={onChange}
/>

// Correct: Spread fieldProps for all attributes
<input
	{...fieldProps}
	value={value}
	onChange={onChange}
/>
```

### ❌ Mistake 2: Forgetting combineHandlers

```tsx
// Wrong: Only using form handler
<input onChange={onChange} />

// Correct: Combine form and prop handlers
<input onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)} />
```

### ❌ Mistake 3: Not Applying containerStyles

```tsx
// Wrong: Missing grid layout
<div>
	<FieldGroup>...</FieldGroup>
</div>

// Correct: Apply container styles
<div style={containerStyles}>
	<FieldGroup>...</FieldGroup>
</div>
```

### ❌ Mistake 4: Hardcoding Required Indicator

```tsx
// Wrong: Manually adding asterisk
<label>{config.label} *</label>

// Correct: Use isRequired from hook
<FieldGroup required={isRequired}>
	{/* Field content */}
</FieldGroup>
```

### ❌ Mistake 5: Not Extending BaseFieldSchema

```tsx
// Wrong: Creating schema from scratch
export const MyFieldSchema = z.object({
	$type: z.literal("my-field"),
	name: z.string(),
	// Missing all base properties
});

// Correct: Extend BaseFieldSchema
export const MyFieldSchema = BaseFieldSchema.extend({
	$type: z.literal("my-field"),
	// Add field-specific properties
});
```

### ✅ Correct Approach Summary

```tsx
// 1. Extend BaseFieldSchema
export const MyFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('my-field'),
	customProp: z.string().optional(),
});

// 2. Use useControlledFormElement
const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
	useControlledFormElement(config);

// 3. Apply containerStyles
<div style={containerStyles}>

// 4. Use FieldGroup for consistency
<FieldGroup label={config.label} required={isRequired} error={error}>

// 5. Spread fieldProps and combine handlers
<input
	{...fieldProps}
	value={value || ''}
	onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
	onBlur={combineHandlers(onBlur, propsOnBlur)}
/>
```

## FAQs

### Q: How do I handle complex value types (objects, arrays)?

**A:** Define the value type in your field config and handle it in onChange:

```tsx
const { value, onChange } = useControlledFormElement(config);
// value can be any type: string, number, boolean, object, array, etc.

onChange({ nested: "value" }); // Object
onChange(["item1", "item2"]); // Array
```

### Q: How do I add custom validation?

**A:** Use the `rules` array with custom validation:

```typescript
{
	name: 'password',
	$type: 'input',
	rules: [
		{ type: 'required', message: 'Password required' },
		{
			type: 'custom',
			validator: (value) => value.length >= 8,
			message: 'Password must be at least 8 characters'
		}
	]
}
```

### Q: Can I use field components outside of forms?

**A:** Yes, but you need to provide the form context or handle state manually:

```tsx
// Standalone with React Hook Form
<FormProvider {...methods}>
	<MyField name="field" $type="my-field" label="Field" />
</FormProvider>

// Or manage state manually
<MyField
	name="field"
	$type="my-field"
	label="Field"
	onChange={(value) => setState(value)}
/>
```

### Q: How do I style my field component?

**A:** Multiple approaches:

```tsx
// 1. Via className prop
<MyField className="custom-class" />

// 2. Via style prop
<MyField style={{ marginTop: '1rem' }} />

// 3. In the component itself
<div className={cn('my-field', config.className)}>
```

### Q: How do I handle async validation?

**A:** Use async validation rules:

```typescript
{
	name: 'username',
	$type: 'input',
	rules: [
		{
			type: 'async',
			validator: async (value) => {
				const exists = await checkUsername(value);
				return !exists;
			},
			message: 'Username already taken'
		}
	]
}
```

### Q: Can I nest fields within fields?

**A:** Yes, use array fields or container fields:

```tsx
// Array field with nested elements
{
	$type: 'array-elements',
	name: 'items',
	elements: [
		{ $type: 'input', name: 'title', label: 'Title' },
		{ $type: 'textarea', name: 'description', label: 'Description' }
	]
}
```

## See Also

- [Existing Field Examples](./form-input.tsx)
- [FieldGroup Component](../field-group.tsx)
- [BaseFieldSchema](../../../../core/src/schemas/base-field.ts)
- [useControlledFormElement Hook](../../../hooks/use-controlled-form-element.ts)
- [Layout Development Guide](../../layouts/README.md)
- [Stepper Development Guide](../../steppers/README.md)
