# Form Engine Type System

## What It Is

A type-safe, extensible field type system that provides:

- ✅ **Auto-completion** for field `componentId` values
- ✅ **Type safety** for field-specific properties
- ✅ **Compile-time validation** of form configurations
- ✅ **Extensibility** for custom field types

## Using Built-in Types

When you create a form configuration with the type annotation, you get full type safety:

```typescript
import type { FormConfig } from "@json-form-engine/core/schemas";

const config: FormConfig = {
	id: "my-form",
	steps: [
		{
			id: "step-1",
			title: "User Info",
			elements: [
				{
					componentId: "input", // ← TypeScript autocompletes this
					id: "email",
					name: "email",
					inputType: "email", // ← Field-specific properties are type-checked
				},
			],
		},
	],
};
```

### What You Get

- **Autocomplete**: Press Ctrl+Space on `componentId` to see all available field types
- **Error Detection**: Invalid `componentId` values show errors immediately
- **Property Validation**: Each field type's specific properties are validated
- **Suggestions**: TypeScript suggests the correct value when you make a typo

## Setup for Applications

Choose one method to load the types:

### Option 1: tsconfig.json (Recommended)

```json
{
	"compilerOptions": {
		"types": ["@json-form-engine/core", "@json-form-engine/react"]
	}
}
```

### Option 2: Triple-Slash Directive

In a `.d.ts` file (e.g., `modules.d.ts`):

```typescript
/// <reference types="@json-form-engine/react/types" />
```

### Option 3: Direct Import

```typescript
import "@json-form-engine/react"; // Types are loaded automatically
```

## Creating Custom Field Types

### 1. Define Your Field Configuration

```typescript
// custom-slider.types.ts
import { z } from "zod";
import { BaseFieldSchema } from "@json-form-engine/core/schemas/base-field";

// Define field-specific properties
export const SliderFieldExtensionSchema = z.object({
	min: z.number().default(0),
	max: z.number().default(100),
	step: z.number().default(1),
	showValue: z.boolean().optional(),
});

// Complete field schema
export const SliderFieldConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal("slider"),
	...SliderFieldExtensionSchema.shape,
});

// TypeScript type
export type SliderFieldConfig = z.infer<typeof SliderFieldConfigSchema>;
```

### 2. Register the Type

Add module augmentation to extend the global registry:

```typescript
// Still in custom-slider.types.ts
declare module "@json-form-engine/core/schemas/field-config" {
	namespace FormEngine {
		interface FieldConfigRegistry {
			slider: SliderFieldConfig;
		}
	}
}
```

### 3. Create a Type Entry Point

Create a `types.ts` file that imports all your field types:

```typescript
// types.ts
import type { SliderFieldConfig } from "./custom-slider.types";
import type { RatingFieldConfig } from "./custom-rating.types";

// Re-export all types
export type { SliderFieldConfig, RatingFieldConfig };
```

### 4. Export from Package

```typescript
// index.ts
export * from "./types";
```

### 5. Use Your Custom Field

```typescript
const config: FormConfig = {
	id: "my-form",
	steps: [
		{
			id: "step-1",
			title: "Rate Us",
			elements: [
				{
					componentId: "slider", // ✅ Your custom type appears in autocomplete
					id: "rating",
					name: "rating",
					min: 1,
					max: 5,
					showValue: true,
				},
			],
		},
	],
};
```

## Available Types

### Core Types

- `FormEngine.FieldConfig` - Union of all registered field configurations
- `FormEngine.ComponentId` - Union of all valid `componentId` strings
- `FormEngine.GetFieldConfig<T>` - Get specific field config by componentId
- `FormEngine.FieldConfigRegistry` - Interface to extend with new types

### Using Type Utilities

```typescript
// Get all valid componentId values
type AllFields = FormEngine.ComponentId;
// Result: "input" | "select" | "textarea" | ... | "yourCustomField"

// Get specific field configuration
type InputConfig = FormEngine.GetFieldConfig<"input">;

// Check if a field is valid
function isValidField(config: any): config is FormEngine.FieldConfig {
	return config && typeof config.componentId === "string";
}
```

## Package Configuration

### For Library Authors

Add to your `package.json`:

```json
{
	"exports": {
		"./types": {
			"types": "./dist/types.d.ts"
		}
	}
}
```

Ensure your build process compiles `types.ts` to `dist/types.d.ts`.

## Type Safety Features

### Strict Element Typing

The `elements` array in form steps is strictly typed:

```typescript
// ✅ Valid
elements: [
	{
		componentId: "input",
		id: "field1",
		name: "field1",
	},
];

// ❌ Error: Type '"unknown"' is not assignable...
elements: [
	{
		componentId: "unknown",
		id: "field2",
		name: "field2",
	},
];
```

### Field-Specific Properties

Each field type validates its own properties:

```typescript
// ✅ Valid - 'options' is required for select fields
{
  componentId: 'select',
  id: 'country',
  name: 'country',
  options: [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
  ]
}

// ❌ Error: Property 'options' is missing
{
  componentId: 'select',
  id: 'country',
  name: 'country',
}
```

## Troubleshooting

### Types Not Loading

1. **Restart TypeScript Server**

   - VS Code: Command Palette → "TypeScript: Restart TS Server"
   - Or reload the window

2. **Verify Package is Built**

   ```bash
   ls -la node_modules/@your-package/dist/*.d.ts
   ```

3. **Check tsconfig.json**

   - Ensure the package is in the `types` array
   - Or use triple-slash directives

4. **Clear Cache**
   ```bash
   rm -rf node_modules/.cache
   ```

### Circular Reference Errors

The type system uses a specific pattern to avoid circular references while maintaining type safety:

```typescript
// Zod schema uses z.any() for elements
export const FormStepSchema = z.object({
	// ...
	elements: z.array(z.any()), // Avoids circular reference
});

// TypeScript type overrides with strict typing
export type FormStep = Omit<z.infer<typeof FormStepSchema>, "elements"> & {
	elements: FormEngine.FieldConfig[]; // Strict type checking
};
```

This pattern is already implemented in `@json-form-engine/core`. When creating your own forms, use the `FormConfig` type for full type safety.

## Best Practices

✅ **Always use the `FormConfig` type** when creating form configurations  
✅ **Extend `BaseField`** for all custom field types  
✅ **Use `z.literal()` for `componentId`** to enable strict type checking  
✅ **Create a `types.ts` entry point** that imports all field types  
✅ **Re-export types** to preserve imports in `.d.ts` files  
✅ **Document field properties** with JSDoc comments  
✅ **Test your types** by intentionally using invalid values

## Examples

See real implementations in `@json-form-engine/react`:

- Field type definitions: `src/components/form/fields/*.types.ts`
- Type entry point: `src/types.ts`
- Usage examples: `apps/www/src/configs/forms/*.ts`
