# Schema Generation Service

The `SchemaGenerator` service provides comprehensive JSON Schema generation from Zod schemas, with full support for nested and recursive properties.

## Overview

The schema generator is responsible for converting Zod schemas into JSON Schema format, handling:

- **Nested schemas**: Automatically creates proper `$ref` relationships
- **Recursive schemas**: Handles circular references via Zod's registry system
- **Multiple component types**: Elements, layouts, steppers, and actions
- **Schema normalization**: Ensures consistent output format
- **Multiple JSON Schema versions**: draft-4, draft-7, draft-2020-12, openapi-3.0

## Architecture

### Separation of Concerns

Previously, schema generation logic was embedded in `FormEngine`. Now it's extracted into a dedicated service:

```typescript
FormEngine
  ├─ registries (data storage)
  └─ schemaGenerator (schema generation logic) ← New service
```

**Benefits:**

- ✅ Single Responsibility Principle
- ✅ Easier to test independently
- ✅ More maintainable
- ✅ Reusable across different contexts
- ✅ Clear API for schema generation

### How It Works

The `SchemaGenerator` delegates to Zod's native JSON Schema generation (`z.toJSONSchema()`) which:

1. **Uses Zod Registry**: All component schemas are registered in a Zod registry during build
2. **Generates Schemas**: Zod automatically creates JSON schemas with proper `$ref` links
3. **Handles Nesting**: When a schema references another (e.g., `person` contains `address`), Zod creates `$ref` pointers
4. **Handles Recursion**: Circular references are resolved via the registry system

## Usage

### Basic Usage

```typescript
import { FormEngineBuilder } from "@schema-engine/forms";

const engine = new FormEngineBuilder()
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.build();

// Get form config schema
const configSchema = engine.generateFormConfigSchema();
```

### Advanced Usage

```typescript
// Generate schema with specific JSON Schema version
const configSchema = engine.generateFormConfigSchema({
	target: "openapi-3.0",
	additionalProperties: false,
});
```

## Nested and Recursive Properties

### Nested Properties Example

```typescript
// Define nested schemas
const addressSchema = z.object({
	$type: z.literal("address"),
	street: z.string(),
	city: z.string(),
	country: z.string(),
});

const personSchema = z.object({
	$type: z.literal("person"),
	name: z.string(),
	address: addressSchema, // Nested reference
});

const engine = new FormEngineBuilder()
	.addElement({
		$type: "address",
		schema: addressSchema,
		metadata: { name: "Address", category: "input" },
		render: () => null,
	})
	.addElement({
		$type: "person",
		schema: personSchema,
		metadata: { name: "Person", category: "input" },
		render: () => null,
	})
	.build();

const schema = engine.generateJSONSchemaCollection();
```

**Generated Schema:**

```json
{
	"schemas": {
		"element:address": {
			"$id": "#/definitions/element:address",
			"type": "object",
			"properties": {
				"$type": { "type": "string", "const": "address" },
				"street": { "type": "string" },
				"city": { "type": "string" },
				"country": { "type": "string" }
			}
		},
		"element:person": {
			"$id": "#/definitions/element:person",
			"type": "object",
			"properties": {
				"$type": { "type": "string", "const": "person" },
				"name": { "type": "string" },
				"address": { "$ref": "#/definitions/element:address" }
			}
		}
	}
}
```

### Recursive Properties Example

```typescript
// Define recursive schema (e.g., nested comments)
const commentSchema: z.ZodType<Comment> = z.lazy(() =>
	z.object({
		$type: z.literal("comment"),
		text: z.string(),
		author: z.string(),
		replies: z.array(commentSchema).optional(), // Recursive reference
	})
);

const engine = new FormEngineBuilder()
	.addElement({
		$type: "comment",
		schema: commentSchema,
		metadata: { name: "Comment Thread", category: "input" },
		render: () => null,
	})
	.build();

const schema = engine.generateJSONSchemaCollection();
```

**Generated Schema:**

```json
{
	"schemas": {
		"element:comment": {
			"$id": "#/definitions/element:comment",
			"type": "object",
			"properties": {
				"$type": { "type": "string", "const": "comment" },
				"text": { "type": "string" },
				"author": { "type": "string" },
				"replies": {
					"type": "array",
					"items": { "$ref": "#/definitions/element:comment" }
				}
			}
		}
	}
}
```

## API Reference

### SchemaGenerator

#### `generateComponentSchemas(schemaRegistry, options?)`

Generate individual JSON schemas for all registered components.

**Parameters:**

- `schemaRegistry`: Zod registry containing all component schemas
- `options.target?`: JSON Schema version ('draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0')
- `options.uriGenerator?`: Custom URI generator for $ref links

**Returns:** `{ schemas: Record<string, any> }`

#### `generateUnifiedSchema(schemaRegistry, options?)`

## API Reference

### FormEngine

#### `generateFormConfigSchema(options?)`

Generate JSON schema for form configuration objects.

**Parameters:**

- `options.target?`: JSON Schema version ('draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0')
- `options.additionalProperties?`: Allow additional properties

**Returns:** JSON Schema for form configuration

**Example:**

```typescript
const schema = engine.generateFormConfigSchema({
	target: "draft-2020-12",
	additionalProperties: false,
});
```

## Testing

The schema generator is fully tested for:

- ✅ Nested schema relationships
- ✅ Recursive schema references
- ✅ Multiple component types
- ✅ Custom URI generation
- ✅ Different JSON Schema versions

See `test/engine/json-schema.test.ts` for comprehensive test coverage.

## Implementation Details

### Metadata Handling

The generator ensures the metadata field allows additional properties for flexible form configuration.

### Zod Registry System

Zod v4's registry system enables:

- **Automatic $ref generation**: Schemas reference each other by ID
- **Circular reference handling**: Recursive schemas work out of the box
- **Metadata attachment**: Each schema carries component metadata
- **Type safety**: Full TypeScript support

### Why This Approach?

**Dynamic vs. Hardcoded:**

- ❌ **Hardcoded**: Manually building JSON schema objects (fragile, unmaintainable)
- ✅ **Dynamic**: Building Zod schemas, then generating JSON schema (flexible, automatic)

**Benefits of Dynamic Approach:**

- Schema automatically reflects registered components
- Adding new properties requires updating one place (Zod schema)
- Type-safe with full IntelliSense support
- Handles complex nesting and recursion automatically
- Leverages Zod's battle-tested JSON Schema generation

## Migration Guide

If you have custom schema generation logic, migrate to the service:

**Before:**

```typescript
// Manual schema construction
const schema = {
	type: "object",
	properties: {
		// ... manually built properties
	},
};
```

**After:**

```typescript
// Use the service
const generator = new SchemaGenerator();
const schema = generator.generateFormConfigSchema(formConfigSchema, schemaRegistry, options);
```

## See Also

- [Form Engine Builder](../builder/README.md)
- [Zod v4 Registry Documentation](https://zod.dev)
- [JSON Schema Specification](https://json-schema.org)
