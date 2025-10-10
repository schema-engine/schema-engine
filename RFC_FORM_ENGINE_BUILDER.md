# RFC: Form Engine Builder - Unified Configuration System

## Status

**DRAFT** - Open for Discussion

## Summary

This RFC proposes a complete redesign of the form engine using a **builder pattern** with a focus on **full serialization** and **Zod v4 native features**.

**Key Changes**:

- Single `FormEngineBuilder` class (builder pattern)
- Object-based registration with **explicit type annotations** (no `as const` needed)
- **Framework-agnostic** - `render` property works with React, Vue, Svelte, or any framework
- **Component category system** for semantic organization (elements, layouts, steppers)
- **Action system** - Event handlers separate from components (submit, reset, notification, etc.)
- 100% serializable form configurations (JSON)
- Native Zod v4 JSON Schema generation (no external deps)
- Zod metadata and registries for rich tooling support

**Type Safety Approach**:

```typescript
// ✅ Simple, clean type annotation - infer config from schema
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: TextInput, // Framework-agnostic renderer
	schema: TextInputConfigSchema,
	metadata: {
		category: ElementCategory.INPUT, // Type system provides IntelliSense
	},
};
```

**Benefits of This Approach**:

- ✅ **DRY principle** - Schema defines config shape, no repetition
- ✅ **Framework-agnostic** - `render` works with React, Vue, Svelte, etc.
- ✅ **Unified metadata** - `ComponentMetadata` shared across elements/layouts/steppers
- ✅ **Element-specific category** - Only elements have `category` for filtering/validation
- ✅ **Full IntelliSense** - Type system enforces `ElementCategory` with autocomplete
- ✅ **Type inference** - Render function gets typed props automatically
- ✅ **Better error messages** - Validates at definition point
- ✅ **Self-documenting** - Type shows exact config structure
- ✅ **No `as const` needed** - Clean, simple declarations

**Metadata Design**:

```typescript
// Base metadata (shared by all components)
interface ComponentMetadata {
	name: string;
	description: string;
	tags?: string[];
	deprecated?: boolean;
	version?: string;
}

// Elements extend with category (for filtering/validation)
interface ElementMetadata extends ComponentMetadata {
	category: ElementCategory; // Required for semantic grouping
}

// Layouts and Steppers use base ComponentMetadata (no category needed)
```

**Core Principle**: Form configurations are plain JSON that can be stored, transmitted, and manipulated by external tools (form builders, CMSs, etc.), while the `FormEngine` provides the renderers and runtime logic.

## Problem Statement

The current form engine architecture has several pain points:

### Current Issues

1. **Fragmented Registration**

   - Separate registries for fields, layouts, steppers
   - Registration scattered across multiple files
   - No central place to see what's configured

2. **Complex Type System**

   - Module augmentation for type safety
   - Generic type inference issues
   - Difficult to understand for new developers

3. **Poor Developer Experience**

   - Hard to discover available components
   - No clear entry point
   - Type safety requires manual workarounds (`satisfies`)

4. **Runtime vs Compile Time**
   - Registries are runtime-only
   - No way to get compile-time component list
   - Type augmentation feels disconnected from usage

### What We Want

```typescript
// Import registration objects from libraries
import { textInputRegistration, emailInputRegistration } from "./fields";
import { cardLayoutRegistration } from "./layouts";

// Single entry point, strongly typed, all configuration in one place
const formEngine = new FormEngineBuilder()
	.addField(textInputRegistration) // ✅ Just pass the object!
	.addField(emailInputRegistration)
	.addLayout(cardLayoutRegistration)
	.build();

// Or bulk registration
const formEngine = new FormEngineBuilder()
	.addFields([textInputRegistration, emailInputRegistration])
	.addLayouts([cardLayoutRegistration])
	.build();

// Usage is simple and typed
const config = formEngine.createForm({
	fields: [
		{ id: "email", componentId: "email" }, // Autocomplete works!
	],
	layout: { layoutId: "card" }, // Only registered layouts!
});
```

## Proposed Solution

### Core Architecture

```
FormEngineBuilder (Builder Pattern)
  ├── ElementRegistry (Internal) - inputs, headings, images, buttons, etc.
  ├── LayoutRegistry (Internal) - card, split, grid, etc.
  ├── StepperRegistry (Internal) - multi-step navigation
  ├── SchemaRegistry (Custom Zod Registry)
  └── build() → FormEngine (Immutable, Runtime)
```

### Element Categories System

Elements are organized into **four closed categories** that define their behavior and requirements:

| Category          | Purpose                            | Requires 'name'? | Examples                             |
| ----------------- | ---------------------------------- | ---------------- | ------------------------------------ |
| **`input`**       | Form inputs that collect user data | ✅ **YES**       | text, email, select, checkbox, radio |
| **`content`**     | Static display content             | ❌ No            | heading, paragraph, image            |
| **`decoration`**  | Visual/layout helpers              | ❌ No            | divider, spacer, separator           |
| **`interactive`** | Interactive non-input elements     | ❌ No            | button, link                         |

**Key Rules**:

- ✅ **Unique IDs**: `componentId` must be unique across ALL elements
- ✅ **'name' validation**: Only `'input'` category elements require `name` field in config schema
- ✅ **Closed set**: Category must be one of the four values above
- ✅ **Type safety**: Category is enforced at TypeScript compile-time via explicit type annotation

**Type Annotation Pattern**:

```typescript
// ✅ Simple, clean type annotation - infer from schema
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	component: TextInput,
	schema: TextInputConfigSchema,
	metadata: {
		name: "Text Input",
		category: ElementCategory.INPUT, // Type system enforces valid category
	},
};
```

**Why This Approach?**

- ✅ **Minimal repetition** - Only specify the schema once, infer the config type
- ✅ **Better error messages** - TypeScript validates at the point of definition
- ✅ **Self-documenting** - Type shows exactly what config shape is expected
- ✅ **Full IntelliSense** - Type system provides autocomplete for `category: ElementCategory`
- ✅ **No `as const` needed** - Type system handles everything
- ✅ **DRY principle** - Don't repeat componentId, category, etc. in the type

**Benefits**:

1. **Clear semantics** - Category tells you exactly what the element does
2. **Validation rules** - Only inputs need `name` for form data collection
3. **UI organization** - Form builders can group by category
4. **Filtering** - Easy to find all inputs vs content elements
5. **Type discrimination** - Different prop requirements based on category

### 1. Registration Objects (Exportable, Reusable)

**Key Principle**: Zod schemas are the single source of truth for both validation AND metadata.

```typescript
/**
 * Component categories define the type and behavior of renderable components
 *
 * - 'input': Form inputs that collect user data (require 'name' prop)
 * - 'content': Static content elements (headings, paragraphs, images)
 * - 'decoration': Visual/layout helpers (dividers, spacers)
 * - 'interactive': Interactive non-input elements (buttons, links)
 * - 'layout': Container components (card, grid, tabs)
 * - 'stepper': Multi-step navigation components
 */
export const ComponentCategory = {
	INPUT: "input",
	CONTENT: "content",
	DECORATION: "decoration",
	INTERACTIVE: "interactive",
	LAYOUT: "layout",
	STEPPER: "stepper",
} as const;

export type ComponentCategory = (typeof ComponentCategory)[keyof typeof ComponentCategory];

/**
 * Element registration object - can be exported from component library
 *
 * Element categories:
 * - 'input': Form inputs (text, email, select, checkbox) - MUST have 'name' in config schema
 * - 'content': Static content (heading, paragraph, image) - NO 'name' field
 * - 'decoration': Visual helpers (divider, spacer, separator) - NO 'name' field
 * - 'interactive': Non-input interactions (button, link) - NO 'name' field
 *
 * Category is stored in metadata for:
 * - UI organization (form builders group by category)
 * - Filtering (getElementsByCategory method)
 * - Validation rules (category determines if 'name' field required)
 * - Clear semantics (tells you what the element does)
 *
 * The Zod schema includes:
 * - Validation rules (runtime)
 * - Type inference (compile-time)
 * - JSON Schema generation (for tooling)
 * - Metadata via .describe() and Zod v4 metadata
 *
 * Type parameter is the inferred schema type (z.infer<typeof Schema>)
 *
 * Framework-agnostic: 'render' can be React component, Vue component, Svelte, etc.
 */
interface ElementRegistration<TConfig = any> {
	componentId: string; // MUST be unique across all elements
	render: (props: TConfig) => any; // Framework-agnostic renderer (React, Vue, Svelte, etc.)
	schema: z.ZodType<TConfig>; // Zod schema is the source of truth
	metadata: ElementMetadata; // Element metadata with category
}

/**
 * Universal metadata for all components (elements, layouts, steppers)
 *
 * All components share the same base metadata structure for consistency.
 * Elements additionally require a 'category' field for semantic grouping.
 */
interface ComponentMetadata {
	name: string;
	description: string;
	tags?: string[];
	deprecated?: boolean;
	version?: string;
}

/**
 * Element-specific metadata extends the base metadata with category
 *
 * Category is essential for:
 * - UI organization in form builders
 * - Filtering elements by type
 * - Validation rules (inputs require 'name' field)
 * - Clear semantic grouping
 *
 * Note: IntelliSense/autocomplete for category is provided by the TypeScript type system
 * because this interface constrains `category` to the `ComponentCategory` type.
 * The IDE reads the type definition and offers autocomplete based on the union of values.
 */
interface ElementMetadata extends ComponentMetadata {
	category: ComponentCategory; // Required for elements - TypeScript enforces valid values
}

/**
 * Layout registration object - can be exported from component library
 *
 * Layouts are container components that organize child elements.
 */
interface LayoutRegistration<TConfig = any> {
	componentId: string;
	render: (props: TConfig) => any;
	schema: z.ZodType<TConfig>;
	metadata: LayoutMetadata;
}

interface LayoutMetadata extends ComponentMetadata {
	category: ComponentCategory.LAYOUT; // Always 'layout'
}

/**
 * Stepper registration object - can be exported from component library
 *
 * Steppers handle multi-step form navigation and progression.
 */
interface StepperRegistration<TConfig = any> {
	componentId: string;
	render: (props: TConfig) => any;
	schema: z.ZodType<TConfig>;
	metadata: StepperMetadata;
}

interface StepperMetadata extends ComponentMetadata {
	category: ComponentCategory.STEPPER; // Always 'stepper'
}

/**
 * Action registration object - can be exported from action library
 *
 * Actions are event handlers that respond to form triggers (submit, reset, etc.).
 * They don't render UI but execute logic when triggered.
 * Actions are NOT components - they are pure logic handlers.
 */
interface ActionRegistration<TConfig = any> {
	actionType: string; // MUST be unique across all actions (e.g., 'submit', 'reset')
	execute: (config: TConfig, context: ActionExecutionContext) => Promise<ActionExecutionResult>;
	schema: z.ZodType<TConfig>;
	metadata: ActionMetadata;
}

/**
 * Action metadata - separate from ComponentMetadata
 * Actions are not components, they are event handlers
 */
interface ActionMetadata {
	name: string;
	description: string;
	defaultTriggers?: ActionTrigger[]; // When this action typically runs (optional)
	tags?: string[];
	deprecated?: boolean;
	version?: string;
}

/**
 * Action triggers - events that can trigger action execution
 */
type ActionTrigger =
	| "form_start"
	| "form_change"
	| "form_submit"
	| "step_change"
	| "step_submit"
	| "submit_start"
	| "submit_success"
	| "submit_error"
	| "submit_complete"
	| "manual_save"
	| "manual_reset";

/**
 * Action execution context passed to all action handlers
 */
interface ActionExecutionContext {
	formId: string;
	formData: Record<string, any>;
	currentStep: number;
	totalSteps: number;
	isValid: boolean;
	errors: Record<string, any>;
	form: any; // Framework-specific form instance (e.g., UseFormReturn for React)
	metadata: {
		stepStartTime: number;
		totalFormTime: number;
		userInteractions: number;
	};
}

/**
 * Action execution result returned by action handlers
 */
interface ActionExecutionResult {
	success: boolean;
	message?: string;
	error?: string;
	data?: any;
	shouldContinue?: boolean; // Whether to continue action chain
}

/**
 * Layout registration object - can be exported from component library
 *
 * Type parameter is the inferred schema type (z.infer<typeof Schema>)
 * Framework-agnostic: 'render' can be React component, Vue component, Svelte, etc.
 */
interface LayoutRegistration<TConfig = any> {
	layoutId: string;
	render: (props: TConfig) => any; // Framework-agnostic renderer
	schema: z.ZodType<TConfig>;
	metadata: ComponentMetadata; // Universal component metadata
}

/**
 * Stepper registration object - can be exported from component library
 *
 * Type parameter is the inferred schema type (z.infer<typeof Schema>)
 * Framework-agnostic: 'render' can be React component, Vue component, Svelte, etc.
 */
interface StepperRegistration<TConfig = any> {
	stepperId: string;
	render: (props: TConfig) => any; // Framework-agnostic renderer
	schema: z.ZodType<TConfig>;
	metadata: ComponentMetadata; // Universal component metadata
}
```

### 2. Configurator Class (Builder Pattern)

```typescript
/**
 * Custom registry for form engine schemas
 *
 * Why use a custom registry instead of z.globalRegistry?
 *
 * 1. Isolation - Form engine schemas don't pollute the global registry
 * 2. Type safety - Custom metadata structure enforced by TypeScript
 * 3. Namespacing - Prefix IDs with component type (field:text, layout:card)
 * 4. Interlinked schemas - Generate schemas with $ref for efficient distribution
 * 5. Export control - Only form engine schemas, not all Zod schemas
 * 6. JSON Schema generation - Generate complete schema bundle for external tools
 */
type FormEngineSchemaMetadata = {
	id: string; // Unique ID (e.g., 'element:text', 'element:heading')
	componentType: "element" | "layout" | "stepper"; // Component type
	componentId: string; // Component identifier (MUST be unique)
	title: string; // Human-readable name
	description?: string; // Component description
	category?: ElementCategory | string; // Element category ('input', 'content', 'decoration', 'interactive')
	examples?: z.$output[]; // Type-safe examples
	deprecated?: boolean; // Deprecation flag
};

class FormEngineBuilder<
	TElements extends Record<string, any> = {},
	TLayouts extends Record<string, any> = {},
	TSteppers extends Record<string, any> = {}
> {
	private elements = new Map();
	private layouts = new Map();
	private steppers = new Map();
	private actions = new Map();
	private schemaRegistry = z.registry<FormEngineSchemaMetadata>();

	/**
	 * Register an element component (input, heading, image, button, etc.)
	 * Also registers the schema in the custom registry for JSON Schema generation
	 *
	 * @throws Error if componentId is already registered (must be unique)
	 */
	addElement<TReg extends ElementRegistration>(
		registration: TReg
	): FormEngineBuilder<
		TElements & {
			[K in TReg["componentId"]]: z.infer<TReg["schema"]>;
		},
		TLayouts,
		TSteppers
	> {
		const { componentId, render, schema, metadata } = registration;

		// Enforce uniqueness
		if (this.elements.has(componentId)) {
			throw new Error(
				`Element componentId "${componentId}" is already registered. ` +
					`Component IDs must be unique across all elements.`
			);
		}

		// Store registration (renderer is framework-agnostic)
		this.elements.set(componentId, { render, schema, metadata });

		// Register schema in custom registry for JSON Schema generation
		schema.register(this.schemaRegistry, {
			id: `element:${componentId}`,
			componentType: "element",
			componentId: componentId,
			title: metadata.name,
			description: metadata.description,
			category: metadata.category,
			examples: schema.meta()?.examples,
		});

		return this as any;
	}

	/**
	 * Register multiple elements at once
	 *
	 * @throws Error if any componentId is already registered (must be unique)
	 */
	addElements<TRegs extends readonly ElementRegistration[]>(
		registrations: TRegs
	): FormEngineBuilder<
		TElements & {
			[K in TRegs[number]["componentId"]]: z.infer<
				Extract<TRegs[number], { componentId: K }>["schema"]
			>;
		},
		TLayouts,
		TSteppers
	> {
		for (const registration of registrations) {
			const { componentId, render, schema, metadata } = registration;

			// Enforce uniqueness
			if (this.elements.has(componentId)) {
				throw new Error(
					`Element componentId "${componentId}" is already registered. ` +
						`Component IDs must be unique across all elements.`
				);
			}

			// Store registration (renderer is framework-agnostic)
			this.elements.set(componentId, { render, schema, metadata });

			// Register schema in custom registry
			schema.register(this.schemaRegistry, {
				id: `element:${componentId}`,
				componentType: "element",
				componentId: componentId,
				title: metadata.name,
				description: metadata.description,
				category: metadata.category,
				examples: schema.meta()?.examples,
			});
		}
		return this as any;
	}

	/**
	 * Register a layout component
	 * Also registers the schema in the custom registry for JSON Schema generation
	 */
	addLayout<TReg extends LayoutRegistration>(
		registration: TReg
	): FormEngineBuilder<
		TFields,
		TLayouts & {
			[K in TReg["layoutId"]]: z.infer<TReg["schema"]>;
		},
		TSteppers
	> {
		const { layoutId, render, schema, metadata } = registration;

		// Store registration (renderer is framework-agnostic)
		this.layouts.set(layoutId, { render, schema, metadata });

		// Register schema in custom registry for JSON Schema generation
		schema.register(this.schemaRegistry, {
			id: `layout:${layoutId}`,
			componentType: "layout",
			componentId: layoutId,
			title: metadata.name,
			description: metadata.description,
			category: metadata.category,
			examples: schema.meta()?.examples,
		});

		return this as any;
	}

	/**
	 * Register multiple layouts at once
	 */
	addLayouts<TRegs extends readonly LayoutRegistration[]>(
		registrations: TRegs
	): FormEngineBuilder<
		TFields,
		TLayouts & {
			[K in TRegs[number]["layoutId"]]: z.infer<Extract<TRegs[number], { layoutId: K }>["schema"]>;
		},
		TSteppers
	> {
		for (const registration of registrations) {
			const { layoutId, render, schema, metadata } = registration;

			// Store registration (renderer is framework-agnostic)
			this.layouts.set(layoutId, { render, schema, metadata });

			// Register schema in custom registry
			schema.register(this.schemaRegistry, {
				id: `layout:${layoutId}`,
				componentType: "layout",
				componentId: layoutId,
				title: metadata.name,
				description: metadata.description,
				category: metadata.category,
				examples: schema.meta()?.examples,
			});
		}
		return this as any;
	}

	/**
	 * Register a stepper component
	 * Also registers the schema in the custom registry for JSON Schema generation
	 */
	addStepper<TReg extends StepperRegistration>(
		registration: TReg
	): FormEngineBuilder<
		TFields,
		TLayouts,
		TSteppers & {
			[K in TReg["stepperId"]]: z.infer<TReg["schema"]>;
		}
	> {
		const { stepperId, render, schema, metadata } = registration;

		// Store registration (renderer is framework-agnostic)
		this.steppers.set(stepperId, { render, schema, metadata });

		// Register schema in custom registry for JSON Schema generation
		schema.register(this.schemaRegistry, {
			id: `stepper:${stepperId}`,
			componentType: "stepper",
			componentId: stepperId,
			title: metadata.name,
			description: metadata.description,
			category: metadata.category,
			examples: schema.meta()?.examples,
		});

		return this as any;
	}

	/**
	 * Register multiple steppers at once
	 */
	addSteppers<TRegs extends readonly StepperRegistration[]>(
		registrations: TRegs
	): FormEngineBuilder<
		TFields,
		TLayouts,
		TSteppers & {
			[K in TRegs[number]["stepperId"]]: z.infer<
				Extract<TRegs[number], { stepperId: K }>["schema"]
			>;
		}
	> {
		for (const registration of registrations) {
			const { stepperId, render, schema, metadata } = registration;

			// Store registration (renderer is framework-agnostic)
			this.steppers.set(stepperId, { render, schema, metadata });

			// Register schema in custom registry
			schema.register(this.schemaRegistry, {
				id: `stepper:${stepperId}`,
				componentType: "stepper",
				componentId: stepperId,
				title: metadata.name,
				description: metadata.description,
				category: metadata.category,
				examples: schema.meta()?.examples,
			});
		}
		return this as any;
	}

	/**
	 * Register an action handler (submit, reset, notification, etc.)
	 * Actions don't render UI but execute logic when triggered
	 */
	addAction<TReg extends ActionRegistration>(
		registration: TReg
	): FormEngineBuilder<TElements, TLayouts, TSteppers> {
		const { actionType, execute, schema, metadata } = registration;

		// Enforce uniqueness
		if (this.actions.has(actionType)) {
			throw new Error(
				`Action type "${actionType}" is already registered. ` +
					`Action types must be unique across all actions.`
			);
		}

		// Store registration
		this.actions.set(actionType, { execute, schema, metadata });

		// Register schema in custom registry for JSON Schema generation
		schema.register(this.schemaRegistry, {
			id: `action:${actionType}`,
			componentType: "action",
			componentId: actionType,
			title: metadata.name,
			description: metadata.description,
			category: metadata.category,
			examples: schema.meta()?.examples,
		});

		return this;
	}

	/**
	 * Register multiple actions at once
	 */
	addActions<TRegs extends readonly ActionRegistration[]>(
		registrations: TRegs
	): FormEngineBuilder<TElements, TLayouts, TSteppers> {
		for (const registration of registrations) {
			const { actionType, execute, schema, metadata } = registration;

			// Enforce uniqueness
			if (this.actions.has(actionType)) {
				throw new Error(
					`Action type "${actionType}" is already registered. ` +
						`Action types must be unique across all actions.`
				);
			}

			// Store registration
			this.actions.set(actionType, { execute, schema, metadata });

			// Register schema in custom registry
			schema.register(this.schemaRegistry, {
				id: `action:${actionType}`,
				componentType: "action",
				componentId: actionType,
				title: metadata.name,
				description: metadata.description,
				category: metadata.category,
				examples: schema.meta()?.examples,
			});
		}
		return this;
	}

	/**
	 * Build the immutable FormEngine instance
	 * Passes the schema registry to the engine for JSON Schema generation
	 */
	build(): FormEngine<TElements, TLayouts, TSteppers> {
		return new FormEngine(
			new Map(this.elements),
			new Map(this.layouts),
			new Map(this.steppers),
			new Map(this.actions),
			this.schemaRegistry // Pass registry to engine
		);
	}
}
```

### 3. FormEngine Class (Runtime & Serialization)

```typescript
class FormEngine<
	TElements extends Record<string, any>,
	TLayouts extends Record<string, any>,
	TSteppers extends Record<string, any>
> {
	constructor(
		private elements: ReadonlyMap<string, ElementRegistration>,
		private layouts: ReadonlyMap<string, LayoutRegistration>,
		private steppers: ReadonlyMap<string, StepperRegistration>,
		private actions: ReadonlyMap<string, ActionRegistration>,
		private schemaRegistry: z.Registry<FormEngineSchemaMetadata>
	) {}

	// ============================================
	// Renderer Access (Runtime)
	// ============================================

	/**
	 * Get an element renderer (framework-agnostic, not serializable)
	 * Works for all element types: inputs, headings, images, buttons, etc.
	 * Returns the render function registered for this element
	 */
	getElement<K extends keyof TElements>(componentId: K) {
		return this.elements.get(componentId as string);
	}

	/**
	 * Get a layout renderer (framework-agnostic, not serializable)
	 */
	getLayout<K extends keyof TLayouts>(layoutId: K) {
		return this.layouts.get(layoutId as string);
	}

	/**
	 * Get a stepper renderer (framework-agnostic, not serializable)
	 */
	getStepper<K extends keyof TSteppers>(stepperId: K) {
		return this.steppers.get(stepperId as string);
	}

	/**
	 * Get an action handler (not serializable)
	 * Actions execute logic when triggered (submit, reset, notification, etc.)
	 */
	getAction(actionType: string) {
		return this.actions.get(actionType);
	}

	/**
	 * Execute an action with the given config and context
	 * Validates the config against the action's schema before execution
	 */
	async executeAction(
		actionType: string,
		config: any,
		context: ActionExecutionContext
	): Promise<ActionExecutionResult> {
		const registration = this.actions.get(actionType);
		if (!registration) {
			return {
				success: false,
				error: `Unknown action type: ${actionType}`,
			};
		}

		// Validate config against action schema
		try {
			const validConfig = registration.schema.parse(config);
			return await registration.execute(validConfig, context);
		} catch (error) {
			return {
				success: false,
				error: `Action validation failed: ${error.message}`,
			};
		}
	}

	// ============================================
	// Form Configuration (Serializable)
	// ============================================

	/**
	 * Create a fully serializable form configuration
	 *
	 * Returns ONLY serializable data (no React components, no functions)
	 * Can be:
	 * - Saved to database
	 * - Sent over network
	 * - Converted to JSON
	 * - Used by form builders/editors
	 * - Versioned in git
	 *
	 * @returns SerializableFormConfig - Plain JSON object
	 */
	createForm<TFormData = any>(config: {
		id?: string;
		title?: string;
		description?: string;
		elements: Array<{
			id: string;
			componentId: keyof TElements; // Only registered elements!
			config?: TElements[keyof TElements]; // Config is serializable
			validation?: any; // Additional validation rules (for inputs)
		}>;
		layout?: {
			layoutId: keyof TLayouts; // Only registered layouts!
			config?: TLayouts[keyof TLayouts];
		};
		stepper?: {
			stepperId: keyof TSteppers; // Only registered steppers!
			config?: TSteppers[keyof TSteppers];
		};
	}): SerializableFormConfig<TFormData> {
		// Validate using Zod schemas
		this.validateFormConfig(config);

		// Return plain object (no React components, no functions)
		return {
			id: config.id || generateId(),
			title: config.title,
			description: config.description,
			elements: config.elements.map((element) => ({
				id: element.id,
				componentId: element.componentId as string,
				config: element.config,
				validation: element.validation,
			})),
			layout: config.layout
				? {
						layoutId: config.layout.layoutId as string,
						config: config.layout.config,
				  }
				: undefined,
			stepper: config.stepper
				? {
						stepperId: config.stepper.stepperId as string,
						config: config.stepper.config,
				  }
				: undefined,
		};
	}

	/**
	 * Validate a form configuration against registered schemas
	 */
	private validateFormConfig(config: any): void {
		// Validate each element's config against its schema
		for (const element of config.elements) {
			const registration = this.elements.get(element.componentId);
			if (!registration) {
				throw new Error(`Unknown element component: ${element.componentId}`);
			}
			if (element.config) {
				registration.schema.parse(element.config);
			}
		}

		// Validate layout config
		if (config.layout) {
			const registration = this.layouts.get(config.layout.layoutId);
			if (!registration) {
				throw new Error(`Unknown layout: ${config.layout.layoutId}`);
			}
			if (config.layout.config) {
				registration.schema.parse(config.layout.config);
			}
		}

		// Validate stepper config
		if (config.stepper) {
			const registration = this.steppers.get(config.stepper.stepperId);
			if (!registration) {
				throw new Error(`Unknown stepper: ${config.stepper.stepperId}`);
			}
			if (config.stepper.config) {
				registration.schema.parse(config.stepper.config);
			}
		}
	}

	// ============================================
	// Parsing & Validation (External Data)
	// ============================================

	/**
	 * Generate the FormConfig Zod schema based on registered components
	 *
	 * This schema is built automatically from:
	 * - All registered element schemas (inputs, headings, images, etc.)
	 * - All registered layout schemas
	 * - All registered stepper schemas
	 *
	 * No hardcoding - the schema reflects what's actually registered!
	 */
	private getFormConfigSchema() {
		// Build union schema for all registered element componentIds
		const elementComponentIds = Array.from(this.elements.keys());
		const elementComponentIdSchema =
			elementComponentIds.length > 0
				? z.enum(elementComponentIds as [string, ...string[]])
				: z.never();

		// Build discriminated union for element configs
		const elementConfigSchemas = elementComponentIds.map((componentId) => {
			const registration = this.elements.get(componentId)!;
			return z.object({
				id: z.string(),
				componentId: z.literal(componentId),
				config: registration.schema.optional(),
				validation: z.any().optional(),
			});
		});

		const elementSchema =
			elementConfigSchemas.length > 0
				? z.discriminatedUnion("componentId", elementConfigSchemas as any)
				: z.object({
						id: z.string(),
						componentId: z.never(),
						config: z.any().optional(),
						validation: z.any().optional(),
				  });

		// Build union schema for all registered layout layoutIds
		const layoutIds = Array.from(this.layouts.keys());
		const layoutIdSchema =
			layoutIds.length > 0 ? z.enum(layoutIds as [string, ...string[]]) : z.never();

		// Build discriminated union for layout configs
		const layoutConfigSchemas = layoutIds.map((layoutId) => {
			const registration = this.layouts.get(layoutId)!;
			return z.object({
				layoutId: z.literal(layoutId),
				config: registration.schema.optional(),
			});
		});

		const layoutSchema =
			layoutConfigSchemas.length > 0
				? z.discriminatedUnion("layoutId", layoutConfigSchemas as any)
				: z.object({
						layoutId: z.never(),
						config: z.any().optional(),
				  });

		// Build union schema for all registered stepper stepperIds
		const stepperIds = Array.from(this.steppers.keys());
		const stepperIdSchema =
			stepperIds.length > 0 ? z.enum(stepperIds as [string, ...string[]]) : z.never();

		// Build discriminated union for stepper configs
		const stepperConfigSchemas = stepperIds.map((stepperId) => {
			const registration = this.steppers.get(stepperId)!;
			return z.object({
				stepperId: z.literal(stepperId),
				config: registration.schema.optional(),
			});
		});

		const stepperSchema =
			stepperConfigSchemas.length > 0
				? z.discriminatedUnion("stepperId", stepperConfigSchemas as any)
				: z.object({
						stepperId: z.never(),
						config: z.any().optional(),
				  });

		// Build the complete FormConfig schema
		return z.object({
			id: z.string(),
			title: z.string().optional(),
			description: z.string().optional(),
			elements: z.array(elementSchema),
			layout: layoutSchema.optional(),
			stepper: stepperSchema.optional(),
		});
	}

	/**
	 * Parse and validate a serializable form config from external sources
	 *
	 * The schema is automatically generated from registered components.
	 * Each field/layout/stepper config is validated against its registered schema.
	 *
	 * Use this when loading forms from:
	 * - Database (JSON column)
	 * - API responses
	 * - JSON files
	 * - Form builders
	 * - External tools
	 *
	 * @throws ZodError if validation fails
	 * @returns Validated and typed form config
	 *
	 * @example
	 * // From database
	 * const dbConfig = await db.forms.findOne({ id: 'contact' });
	 * const validConfig = formEngine.parseFormConfig(dbConfig);
	 *
	 * // From API
	 * const apiConfig = await fetch('/api/forms/123').then(r => r.json());
	 * const validConfig = formEngine.parseFormConfig(apiConfig);
	 *
	 * // From JSON file
	 * const fileConfig = JSON.parse(fs.readFileSync('form.json', 'utf-8'));
	 * const validConfig = formEngine.parseFormConfig(fileConfig);
	 */
	parseFormConfig(config: unknown): SerializableFormConfig {
		const FormConfigSchema = this.getFormConfigSchema();
		return FormConfigSchema.parse(config);
	}

	/**
	 * Safe parse - returns success/error result instead of throwing
	 *
	 * Use this when you want to handle errors gracefully
	 *
	 * @example
	 * const result = formEngine.safeParseFormConfig(unknownData);
	 * if (result.success) {
	 *   console.log('Valid config:', result.data);
	 * } else {
	 *   console.error('Invalid config:', result.error);
	 * }
	 */
	safeParseFormConfig(
		config: unknown
	): { success: true; data: SerializableFormConfig } | { success: false; error: z.ZodError } {
		try {
			const data = this.parseFormConfig(config);
			return { success: true, data };
		} catch (error) {
			if (error instanceof z.ZodError) {
				return { success: false, error };
			}
			throw error;
		}
	}

	/**
	 * Parse form config from JSON string
	 *
	 * @example
	 * const jsonString = '{"id":"contact","fields":[...]}';
	 * const config = formEngine.parseFormConfigJSON(jsonString);
	 */
	parseFormConfigJSON(json: string): SerializableFormConfig {
		try {
			const parsed = JSON.parse(json);
			return this.parseFormConfig(parsed);
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Validate if a config is valid without throwing
	 *
	 * @example
	 * if (formEngine.isValidFormConfig(data)) {
	 *   // data is valid
	 * }
	 */
	isValidFormConfig(config: unknown): config is SerializableFormConfig {
		const result = this.safeParseFormConfig(config);
		return result.success;
	}

	/**
	 * Parse and validate an element config
	 *
	 * @example
	 * const emailConfig = { label: 'Email', required: true };
	 * const validConfig = formEngine.parseElementConfig('email', emailConfig);
	 *
	 * const headingConfig = { text: 'Welcome', level: 'h1' };
	 * const validConfig = formEngine.parseElementConfig('heading', headingConfig);
	 */
	parseElementConfig<K extends keyof TElements>(componentId: K, config: unknown): TElements[K] {
		const registration = this.elements.get(componentId as string);
		if (!registration) {
			throw new Error(`Unknown element component: ${componentId as string}`);
		}
		return registration.schema.parse(config);
	}

	/**
	 * Parse and validate a layout config
	 *
	 * @example
	 * const layoutConfig = { maxWidth: 'md', padding: 'lg' };
	 * const validConfig = formEngine.parseLayoutConfig('card', layoutConfig);
	 */
	parseLayoutConfig<K extends keyof TLayouts>(layoutId: K, config: unknown): TLayouts[K] {
		const registration = this.layouts.get(layoutId as string);
		if (!registration) {
			throw new Error(`Unknown layout: ${layoutId as string}`);
		}
		return registration.schema.parse(config);
	}

	/**
	 * Parse and validate a stepper config
	 *
	 * @example
	 * const stepperConfig = { showProgress: true };
	 * const validConfig = formEngine.parseStepperConfig('default', stepperConfig);
	 */
	parseStepperConfig<K extends keyof TSteppers>(stepperId: K, config: unknown): TSteppers[K] {
		const registration = this.steppers.get(stepperId as string);
		if (!registration) {
			throw new Error(`Unknown stepper: ${stepperId as string}`);
		}
		return registration.schema.parse(config);
	}

	/**
	 * Get detailed validation errors for debugging
	 *
	 * Uses the automatically generated FormConfig schema to provide
	 * precise error messages with full path information.
	 *
	 * @example
	 * const errors = formEngine.getValidationErrors(invalidConfig);
	 * console.log(errors);
	 * // [
	 * //   { path: ['fields', 0, 'componentId'], message: 'Invalid enum value. Expected "text" | "email", received "invalid"' },
	 * //   { path: ['layout', 'config', 'maxWidth'], message: 'Invalid enum value. Expected "sm" | "md" | "lg", received "xl"' }
	 * // ]
	 */
	getValidationErrors(config: unknown): Array<{ path: (string | number)[]; message: string }> {
		const result = this.safeParseFormConfig(config);
		if (result.success) {
			return [];
		}
		return result.error.errors.map((err) => ({
			path: err.path,
			message: err.message,
		}));
	}

	// ============================================
	// JSON Schema Generation (For Tooling)
	// ============================================

	/**
	 * Generate JSON Schema for all registered components
	 *
	 * Uses Zod v4's NATIVE z.toJSONSchema() with custom registry - no external dependencies!
	 * All schemas are interlinked via $ref for efficient schema distribution
	 *
	 * Also generates the FormConfig schema automatically from registered components.
	 *
	 * Perfect for:
	 * - Form builders (auto-generate property editors)
	 * - Visual editors (drag & drop components)
	 * - Documentation generation (auto-generate API docs)
	 * - External tools/integrations (OpenAPI, etc.)
	 * - AI structured outputs
	 */
	toJSONSchema(options?: {
		target?: "draft-2020-12" | "draft-7" | "draft-4" | "openapi-3.0";
		uri?: (id: string) => string; // Custom URI resolver for $ref
	}): {
		formConfigSchema: any; // Generated FormConfig schema
		schemas: Record<string, any>; // All component schemas with $ref support
		byType: {
			elements: Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>;
			layouts: Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>;
			steppers: Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>;
		};
	} {
		// Generate the FormConfig schema from registered components
		const FormConfigSchema = this.getFormConfigSchema();
		const formConfigSchema = z.toJSONSchema(FormConfigSchema, {
			target: options?.target || "draft-2020-12",
		});

		// Generate interlinked JSON Schemas from the custom registry
		const { schemas } = z.toJSONSchema(this.schemaRegistry, {
			target: options?.target || "draft-2020-12",
			uri: options?.uri || ((id) => `#/components/schemas/${id}`),
		});

		// Organize schemas by component type
		const byType = {
			elements: {} as Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>,
			layouts: {} as Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>,
			steppers: {} as Record<string, { schemaRef: string; metadata: FormEngineSchemaMetadata }>,
		};

		// Group schemas by component type
		for (const [schema, metadata] of this.schemaRegistry.entries()) {
			const uri = options?.uri?.(metadata.id) || `#/components/schemas/${metadata.id}`;

			if (metadata.componentType === "element") {
				byType.elements[metadata.componentId] = {
					schemaRef: uri,
					metadata,
				};
			} else if (metadata.componentType === "layout") {
				byType.layouts[metadata.componentId] = {
					schemaRef: uri,
					metadata,
				};
			} else if (metadata.componentType === "stepper") {
				byType.steppers[metadata.componentId] = {
					schemaRef: uri,
					metadata,
				};
			}
		}

		return { formConfigSchema, schemas, byType };
	}

	/**
	 * Generate JSON Schema for a specific component type
	 *
	 * @example
	 * const elementSchemas = formEngine.toJSONSchemaByType('elements', { target: 'openapi-3.0' });
	 */
	toJSONSchemaByType(
		type: "elements" | "layouts" | "steppers",
		options?: {
			target?: "draft-2020-12" | "draft-7" | "draft-4" | "openapi-3.0";
			uri?: (id: string) => string;
		}
	): Record<string, { schema: any; metadata: FormEngineSchemaMetadata }> {
		const result: Record<string, { schema: any; metadata: FormEngineSchemaMetadata }> = {};

		// Filter schemas by component type and generate JSON Schema for each
		for (const [schema, metadata] of this.schemaRegistry.entries()) {
			const isMatchingType =
				(type === "elements" && metadata.componentType === "element") ||
				(type === "layouts" && metadata.componentType === "layout") ||
				(type === "steppers" && metadata.componentType === "stepper");

			if (isMatchingType) {
				result[metadata.componentId] = {
					schema: z.toJSONSchema(schema, options),
					metadata,
				};
			}
		}

		return result;
	}

	/**
	 * Export all schemas from the custom registry
	 * Useful for saving schemas to disk or sending to external tools
	 *
	 * @example
	 * const allSchemas = formEngine.exportSchemas({
	 *   target: 'openapi-3.0',
	 *   uri: (id) => `https://api.example.com/schemas/${id}.json`
	 * });
	 */
	exportSchemas(options?: {
		target?: "draft-2020-12" | "draft-7" | "draft-4" | "openapi-3.0";
		uri?: (id: string) => string;
	}) {
		return z.toJSONSchema(this.schemaRegistry, options);
	}

	// ============================================
	// Introspection (For Discovery)
	// ============================================

	/**
	 * Get all registered component IDs
	 */
	getRegisteredElements(): ReadonlyArray<string> {
		return Array.from(this.elements.keys());
	}

	/**
	 * Get elements filtered by category
	 *
	 * @example
	 * // Get all input elements (for form validation)
	 * const inputs = formEngine.getElementsByCategory(ElementCategory.INPUT);
	 *
	 * // Get all content elements (for preview mode)
	 * const content = formEngine.getElementsByCategory(ElementCategory.CONTENT);
	 */
	getElementsByCategory(category: ElementCategory): ReadonlyArray<{
		componentId: string;
		metadata: ElementMetadata;
	}> {
		const result: Array<{ componentId: string; metadata: ElementMetadata }> = [];

		for (const [componentId, registration] of this.elements.entries()) {
			if (registration.metadata.category === category) {
				result.push({
					componentId,
					metadata: registration.metadata,
				});
			}
		}

		return result;
	}

	getRegisteredLayouts(): ReadonlyArray<string> {
		return Array.from(this.layouts.keys());
	}

	getRegisteredSteppers(): ReadonlyArray<string> {
		return Array.from(this.steppers.keys());
	}

	getRegisteredActions(): ReadonlyArray<string> {
		return Array.from(this.actions.keys());
	}

	/**
	 * Get component metadata (no React components, serializable)
	 */
	getElementMetadata<K extends keyof TElements>(componentId: K): ElementMetadata {
		return this.elements.get(componentId as string)?.metadata;
	}

	getLayoutMetadata<K extends keyof TLayouts>(layoutId: K): LayoutMetadata {
		return this.layouts.get(layoutId as string)?.metadata;
	}

	getStepperMetadata<K extends keyof TSteppers>(stepperId: K): StepperMetadata {
		return this.steppers.get(stepperId as string)?.metadata;
	}

	getActionMetadata(actionType: string): ActionMetadata | undefined {
		return this.actions.get(actionType)?.metadata;
	}
}

/**
 * Serializable form configuration type
 * Contains ONLY plain JSON - no React components, no functions
 */
interface SerializableFormConfig<TFormData = any> {
	id: string;
	title?: string;
	description?: string;
	elements: Array<{
		id: string;
		componentId: string; // Can be: 'text', 'email', 'heading', 'image', 'button', etc.
		config?: Record<string, any>; // Plain object
		validation?: any; // Only for input elements
	}>;
	layout?: {
		layoutId: string;
		config?: Record<string, any>;
	};
	stepper?: {
		stepperId: string;
		config?: Record<string, any>;
	};
	// Future: actions, conditional logic, etc.
}
```

### 4. Zod Schema Pattern

Each element/layout/stepper uses a Zod schema to define and validate its configuration:

```typescript
export const TextInputConfigSchema = z
	.object({
		componentId: z.literal("text"),
		name: z.string(),
		label: z.string().optional(),
		placeholder: z.string().optional(),
		type: z.enum(["text", "password", "search"]).default("text"),
		required: z.boolean().default(false),
	})
	.strict();
```

**The schema provides:**

- Runtime validation
- TypeScript type inference via `z.infer<typeof Schema>`
- JSON Schema generation (Zod v4 native support)

### 5. Validation Rules System

The Form Engine includes a comprehensive validation system built on Zod that converts strongly-typed validation rules into Zod schemas:

```typescript
// Validation rules use a discriminated union - fully type-safe!
export const ValidationRuleSchema = z.union([
	z.object({
		type: z.literal("required"),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal("email"),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal("minLength"),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal("pattern"),
		value: z.string(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal("async"),
		url: z.string(),
		method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
		dependencies: z.array(z.string()).optional(),
		message: z.string().optional(),
	}),
	// ... 30+ more validation types
]);

// TypeScript types for all validation rules
type ValidationRule =
	| RequiredRule
	| EmailRule
	| MinLengthRule
	| MaxLengthRule
	| PatternRule
	| AsyncRule
	| MinRule
	| MaxRule
	| UrlRule
	| UuidRule
	| DateTimeRule
	| IpRule
	| CidrRule
	| JwtRule
	| HashRule
	| Base64Rule
	| StringFormatRule;

// Example: Input field with validation rules
export const EmailInputConfigSchema = z
	.object({
		componentId: z.literal("email"),
		name: z.string(),
		label: z.string().optional(),
		placeholder: z.string().optional(),
		// Strongly-typed validation rules
		rules: z.array(ValidationRuleSchema).optional(),
	})
	.strict();

// In form configuration (serializable JSON, but type-checked!)
{
	componentId: "email",
	name: "email",
	label: "Email Address",
	rules: [
		{ type: "required", message: "Email is required" }, // ✅ Type-checked
		{ type: "email", message: "Invalid email format" }, // ✅ Type-checked
		{ type: "minLength", value: 5, message: "Email too short" } // ✅ Type-checked - value is number
	]
}
```

**Built-in Validation Types:**

**String Validations:**

- `required` - Field is required
- `email` - Valid email address
- `minLength` - Minimum string length
- `maxLength` - Maximum string length
- `pattern` - Regex pattern match
- `url` - Valid URL
- `uuid` - Valid UUID (v1-v5)

**Number Validations:**

- `min` - Minimum value
- `max` - Maximum value

**Array Validations:**

- `minItems` - Minimum array length
- `maxItems` - Maximum array length

**Format Validations:**

- `ip` - IP address (v4/v6)
- `cidr` - CIDR notation
- `datetime` - ISO datetime
- `date` - Date validation
- `time` - Time validation
- `jwt` - JWT token
- `hash` - Hash validation
- `base64` - Base64 encoding

**Async Validation:**

- `async` - Server-side validation via HTTP

```typescript
// Async validation example
{
	type: "async",
	url: "/api/validate-username",
	method: "POST",
	message: "Username already taken",
	dependencies: ["username"] // Re-validate when these fields change
}
```

**Validation Registry:**

```typescript
import { validationRegistry, isFieldRequired, createZodSchemaFromRules } from "@form-engine/core";

// Convert rules to Zod schema (single rule)
const rule: ValidationRule = { type: "email", message: "Invalid email" };
const schema = validationRegistry.createSchema(rule);
// Generates: z.string().email("Invalid email")

// Convert multiple rules to combined schema
const rules: ValidationRule[] = [
	{ type: "required", message: "Email is required" },
	{ type: "email", message: "Invalid email format" },
	{ type: "minLength", value: 5, message: "Too short" },
];

const combinedSchema = createZodSchemaFromRules(rules);
// Generates: z.string().min(1).email().min(5)

// Utility: Check if field is required
const isRequired = isFieldRequired(rules); // true

// Register custom validation types
validationRegistry.register({
	type: "phone",
	category: "string",
	handler: (rule: ValidationRule) => {
		const phoneRegex = /^\+?[1-9]\d{1,14}$/;
		return z.string().regex(phoneRegex, rule.message || "Invalid phone");
	},
});
```

**Default Validations:**

The system comes with 30+ pre-registered validation types:

```typescript
// From defaults.ts - all validations are strongly typed
export const defaultValidations: ValidationRegistration[] = [
	{
		type: "required",
		category: "generic",
		handler: (rule: ValidationRule) => z.string().min(1, rule.message || "This field is required"),
	},
	{
		type: "email",
		category: "string",
		handler: (rule: ValidationRule) =>
			z.string().email(rule.message || "Please enter a valid email address"),
	},
	{
		type: "minLength",
		category: "string",
		handler: (rule: ValidationRule) => {
			const lengthRule = rule as MinLengthRule;
			return z.string().min(lengthRule.value, rule.message);
		},
	},
	// ... 27+ more validations
];
```

**Benefits:**

- ✅ **Serializable** - Validation rules are plain JSON
- ✅ **Extensible** - Register custom validation types
- ✅ **Type-safe** - Built on Zod schemas
- ✅ **Async support** - Server-side validation
- ✅ **Framework-agnostic** - Works with any UI framework
- ✅ **Form builder friendly** - Easy to build UI for rule configuration
- ✅ **Dependency tracking** - Re-validate when dependent fields change

### 6. Component Library Exports

```typescript
// ============================================
// Component libraries export registration objects for ALL element types
// ============================================

// ============================================
// INPUT ELEMENTS (category: 'input')
// Input elements MUST have 'name' field for form data collection
// ============================================

// elements/text-input.ts
import { z } from "zod";

// Schema with metadata stored in Zod's registry
// INPUT ELEMENTS REQUIRE 'name' FIELD
export const TextInputConfigSchema = z
	.object({
		componentId: z.literal("text"),
		name: z.string().describe("Form field name (required for inputs)"), // ✅ REQUIRED for 'input' category
		label: z.string().optional().describe("Field label"),
		placeholder: z.string().optional(),
		required: z.boolean().default(false),
		type: z.enum(["text", "password", "search"]).default("text"),
		// Validation rules - strongly typed discriminated union
		rules: z.array(ValidationRuleSchema).optional().describe("Validation rules"),
	})
	.strict()
	.meta({
		id: "text-input-config",
		title: "Text Input Configuration",
	});

// Registration object - component metadata separate from schema
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text", // ✅ Must be unique
	render: TextInput, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: TextInputConfigSchema,
	metadata: {
		name: "Text Input",
		description: "Single line text input",
		category: ElementCategory.INPUT, // ✅ Required for elements, used for filtering/validation
		tags: ["basic", "text", "form"],
	},
};

// elements/email-input.ts
export const EmailInputConfigSchema = z
	.object({
		componentId: z.literal("email"),
		name: z.string().describe("Form field name (required for inputs)"), // ✅ REQUIRED for 'input' category
		label: z.string().optional().describe("Field label"),
		placeholder: z.string().optional(),
		required: z.boolean().default(false),
		// Validation rules - strongly typed discriminated union
		rules: z.array(ValidationRuleSchema).optional().describe("Validation rules"),
	})
	.strict()
	.meta({
		id: "email-input-config",
		title: "Email Input Configuration",
		examples: [
			{
				componentId: "email",
				name: "email",
				label: "Email Address",
				placeholder: "you@example.com",
				rules: [
					{ type: "required", message: "Email is required" },
					{ type: "email", message: "Invalid email format" },
				],
			},
		],
	});

export const emailInputRegistration: ElementRegistration<z.infer<typeof EmailInputConfigSchema>> = {
	componentId: "email", // ✅ Must be unique
	render: EmailInput, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: EmailInputConfigSchema,
	metadata: {
		name: "Email Input",
		description: "Email address input with validation",
		category: ElementCategory.INPUT, // ✅ Required for elements, enables filtering/validation
		tags: ["email", "validation", "form"],
	},
};

// ============================================
// CONTENT ELEMENTS (category: 'content')
// Content elements do NOT require 'name' - they're display-only
// ============================================

// elements/heading.ts
export const HeadingConfigSchema = z
	.object({
		componentId: z.literal("heading"),
		text: z.string().describe("Heading text"),
		level: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).default("h2"),
		align: z.enum(["left", "center", "right"]).optional(),
		// ❌ NO 'name' field - content elements don't collect data
	})
	.strict()
	.meta({
		id: "heading-config",
		title: "Heading Configuration",
		examples: [
			{ componentId: "heading", text: "Welcome", level: "h1" },
			{ componentId: "heading", text: "Personal Information", level: "h2" },
		],
	});

export const headingRegistration: ElementRegistration<z.infer<typeof HeadingConfigSchema>> = {
	componentId: "heading", // ✅ Must be unique
	render: Heading, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: HeadingConfigSchema,
	metadata: {
		name: "Heading",
		description: "Text heading (h1-h6)",
		category: ElementCategory.CONTENT, // ✅ Content elements don't require 'name' field
		tags: ["typography", "heading", "text"],
	},
};

// elements/image.ts
export const ImageConfigSchema = z
	.object({
		componentId: z.literal("image"),
		src: z.string().url().describe("Image URL"),
		alt: z.string().describe("Alt text for accessibility"),
		width: z.number().optional(),
		height: z.number().optional(),
		fit: z.enum(["cover", "contain", "fill"]).optional(),
		// ❌ NO 'name' field - content elements don't collect data
	})
	.strict()
	.meta({
		id: "image-config",
		title: "Image Configuration",
	});

export const imageRegistration: ElementRegistration<z.infer<typeof ImageConfigSchema>> = {
	componentId: "image", // ✅ Must be unique
	render: Image, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: ImageConfigSchema,
	metadata: {
		name: "Image",
		description: "Display an image",
		category: ElementCategory.CONTENT, // ✅ Content elements don't require 'name' field
		tags: ["image", "media", "visual"],
	},
};

// ============================================
// DECORATION ELEMENTS (category: 'decoration')
// Decoration elements are visual/layout helpers - no 'name' required
// ============================================

// elements/divider.ts
export const DividerConfigSchema = z
	.object({
		componentId: z.literal("divider"),
		thickness: z.enum(["thin", "medium", "thick"]).optional(),
		color: z.string().optional(),
		spacing: z.enum(["sm", "md", "lg"]).optional(),
		// ❌ NO 'name' field - decoration elements are visual helpers
	})
	.strict()
	.meta({
		id: "divider-config",
		title: "Divider Configuration",
	});

export const dividerRegistration: ElementRegistration<z.infer<typeof DividerConfigSchema>> = {
	componentId: "divider", // ✅ Must be unique
	render: Divider, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: DividerConfigSchema,
	metadata: {
		name: "Divider",
		description: "Horizontal divider line",
		category: ElementCategory.DECORATION, // ✅ Decoration elements are visual helpers
		tags: ["divider", "separator", "spacing"],
	},
};

// layouts/card-layout.ts
export const CardLayoutConfigSchema = z
	.object({
		layoutId: z.literal("card"),
		maxWidth: z.enum(["sm", "md", "lg", "xl"]).optional(),
		padding: z.enum(["sm", "md", "lg"]).optional(),
		shadowSize: z.enum(["sm", "md", "lg", "xl"]).optional(),
	})
	.strict()
	.meta({
		id: "card-layout-config",
		title: "Card Layout Configuration",
	});

export const cardLayoutRegistration: LayoutRegistration<z.infer<typeof CardLayoutConfigSchema>> = {
	layoutId: "card",
	render: CardLayout, // Framework-agnostic (React, Vue, Svelte, etc.)
	schema: CardLayoutConfigSchema,
	metadata: {
		name: "Card Layout",
		description: "Centered card layout",
		category: "container",
		tags: ["card", "centered"],
	},
};

// Or export multiple at once from an index
// elements/index.ts
export const elementRegistrations = {
	// Input elements
	text: textInputRegistration,
	email: emailInputRegistration,
	select: selectInputRegistration,

	// Content elements
	heading: headingRegistration,
	image: imageRegistration,
	divider: dividerRegistration,
} as const;

// ============================================
// ACTIONS (NOT components - event handlers)
// Actions execute logic when triggered, they don't render UI
// ============================================

// actions/submit-action.ts
import { z } from "zod";

export const SubmitActionConfigSchema = z
	.object({
		id: z.string().min(1),
		type: z.literal("submit"),
		endpoint: z.string().url().describe("API endpoint for submission"),
		method: z.enum(["POST", "PUT", "PATCH"]).default("POST"),
		successMessage: z.string().optional(),
		errorMessage: z.string().optional(),
		redirectUrl: z.string().url().optional(),
		triggers: z.array(z.string()).optional().default(["form_submit"]),
	})
	.strict()
	.meta({
		id: "submit-action-config",
		title: "Submit Action Configuration",
		examples: [
			{
				id: "submit-form",
				type: "submit",
				endpoint: "/api/forms/submit",
				method: "POST",
				successMessage: "Form submitted successfully!",
			},
		],
	});

export const submitActionRegistration: ActionRegistration<
	z.infer<typeof SubmitActionConfigSchema>
> = {
	actionType: "submit",
	execute: async (config, context) => {
		// Submit logic here
		const response = await fetch(config.endpoint, {
			method: config.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(context.formData),
		});

		if (!response.ok) {
			return {
				success: false,
				error: config.errorMessage || "Submission failed",
			};
		}

		const data = await response.json();
		return {
			success: true,
			message: config.successMessage,
			data,
		};
	},
	schema: SubmitActionConfigSchema,
	metadata: {
		name: "Submit Action",
		description: "Submits form data to an API endpoint",
		defaultTriggers: ["form_submit"],
		tags: ["submit", "api", "http"],
	},
};

// actions/reset-action.ts
export const ResetActionConfigSchema = z
	.object({
		id: z.string().min(1),
		type: z.literal("reset"),
		confirmMessage: z.string().optional(),
		resetToDefaults: z.boolean().default(true),
		triggers: z.array(z.string()).optional().default(["manual_reset"]),
	})
	.strict();

export const resetActionRegistration: ActionRegistration<z.infer<typeof ResetActionConfigSchema>> =
	{
		actionType: "reset",
		execute: async (config, context) => {
			if (config.confirmMessage) {
				const confirmed = window.confirm(config.confirmMessage);
				if (!confirmed) {
					return {
						success: false,
						message: "Reset cancelled",
						shouldContinue: false,
					};
				}
			}

			context.form.reset();
			return {
				success: true,
				message: "Form reset successfully",
			};
		},
		schema: ResetActionConfigSchema,
		metadata: {
			name: "Reset Action",
			description: "Resets form to initial or default values",
			defaultTriggers: ["manual_reset"],
			tags: ["reset", "clear", "form"],
		},
	};

// actions/notification-action.ts
export const NotificationActionConfigSchema = z
	.object({
		id: z.string().min(1),
		type: z.literal("show_notification"),
		message: z.string().min(1),
		variant: z.enum(["success", "error", "warning", "info"]).default("info"),
		duration: z.number().positive().optional().default(3000),
		triggers: z.array(z.string()).optional(),
	})
	.strict();

export const notificationActionRegistration: ActionRegistration<
	z.infer<typeof NotificationActionConfigSchema>
> = {
	actionType: "show_notification",
	execute: async (config, context) => {
		// Notification logic here (toast, alert, etc.)
		console.log(`[${config.variant}] ${config.message}`);
		return {
			success: true,
			message: "Notification displayed",
		};
	},
	schema: NotificationActionConfigSchema,
	metadata: {
		name: "Notification Action",
		description: "Displays a notification message to the user",
		defaultTriggers: ["submit_success", "submit_error"],
		tags: ["notification", "toast", "alert"],
	},
};

// actions/index.ts
export const actionRegistrations = {
	submit: submitActionRegistration,
	reset: resetActionRegistration,
	show_notification: notificationActionRegistration,
} as const;
```

### Complete Registration Example

Here's what a complete element registration looks like with the new pattern:

```typescript
// elements/text-input.ts
import { z } from "zod";
import { ElementRegistration, ElementCategory } from "@json-form-engine/core";

// 1. Define the config schema
const TextInputConfigSchema = z
	.object({
		componentId: z.literal("text"),
		name: z.string(), // Required for 'input' category
		label: z.string().optional(),
		placeholder: z.string().optional(),
		type: z.enum(["text", "password", "search"]).default("text"),
		required: z.boolean().default(false),
	})
	.strict();

// 2. Define the React component
const TextInput: React.FC<z.infer<typeof TextInputConfigSchema>> = (props) => {
	return (
		<div>
			{props.label && <label>{props.label}</label>}
			<input
				type={props.type}
				name={props.name}
				placeholder={props.placeholder}
				required={props.required}
			/>
		</div>
	);
};

// 3. Export the registration - Clean, simple, type-safe!
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: TextInput, // ✅ Framework-agnostic (React, Vue, Svelte, etc.)
	schema: TextInputConfigSchema,
	metadata: {
		name: "Text Input",
		description: "Single line text input",
		category: ElementCategory.INPUT, // ✅ Type-checked, no 'as const' needed
		tags: ["basic", "text", "form"],
	},
};

// That's it! No:
// ❌ as const
// ❌ satisfies ElementRegistration<...>
// ❌ Repeating componentId/category in generics
// ✅ Just clean, simple, type-safe code
// ✅ Framework-agnostic - works with React, Vue, Svelte, etc.
```

**Key Benefits**:

1. **Minimal boilerplate** - Define schema once, infer everywhere
2. **Full type safety** - TypeScript validates structure automatically
3. **IntelliSense everywhere** - Type system provides autocomplete for `category: ElementCategory`
4. **Self-documenting** - Type annotation shows exact config shape
5. **Easy to write** - No complex generic parameters or `as const` needed
6. **Framework-agnostic** - Works with React, Vue, Svelte, or any UI framework

### Framework-Agnostic Design

The `render` property accepts any function that takes props and returns rendered output. This makes the form engine truly universal:

```typescript
// React
export const ReactTextInput: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: (props) => <input {...props} />, // ✅ React JSX
	schema: TextInputConfigSchema,
	metadata: {
		/* ... */
	},
};

// Vue
export const VueTextInput: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: (props) => h("input", props), // ✅ Vue render function
	schema: TextInputConfigSchema,
	metadata: {
		/* ... */
	},
};

// Svelte (with adapter)
export const SvelteTextInput: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: (props) => new TextInput({ target: el, props }), // ✅ Svelte component
	schema: TextInputConfigSchema,
	metadata: {
		/* ... */
	},
};

// Solid.js
export const SolidTextInput: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: (props) => <input {...props} />, // ✅ Solid JSX
	schema: TextInputConfigSchema,
	metadata: {
		/* ... */
	},
};

// Even plain HTML strings!
export const HTMLTextInput: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	render: (props) => `<input type="${props.type}" name="${props.name}" />`, // ✅ HTML string
	schema: TextInputConfigSchema,
	metadata: {
		/* ... */
	},
};
```

**Benefits**:

- ✅ **One schema, many frameworks** - Same config schema works everywhere
- ✅ **Easy migration** - Switch frameworks without changing form configs
- ✅ **Framework packages** - Separate packages like `@form-engine/react`, `@form-engine/vue`
- ✅ **Future-proof** - New frameworks supported without breaking changes

### 7. Usage Example

```typescript
// ============================================
// 1. Configuration (one place, one time)
// ============================================

import { FormEngineBuilder } from "@json-form-engine/react";

// Import registration objects from libraries
import { textInputRegistration, emailInputRegistration } from "./elements/inputs";
import { headingRegistration, imageRegistration, dividerRegistration } from "./elements/content";
import { cardLayoutRegistration, splitLayoutRegistration } from "./layouts";
import { defaultStepperRegistration } from "./steppers";

// Or import in bulk
// import { elementRegistrations } from './elements';
// import { layoutRegistrations } from './layouts';

export const formEngine = new FormEngineBuilder()
	// Register elements - inputs, content, interactive, etc.
	.addElement(textInputRegistration)
	.addElement(emailInputRegistration)
	.addElement(headingRegistration)
	.addElement(imageRegistration)
	.addElement(dividerRegistration)

	// Register layouts
	.addLayout(cardLayoutRegistration)
	.addLayout(splitLayoutRegistration)

	// Register steppers
	.addStepper(defaultStepperRegistration)

	// Build immutable engine
	.build();

// ============================================
// Or even simpler with bulk registration
// ============================================

export const formEngine = new FormEngineBuilder()
	.addElements([
		// Input elements
		textInputRegistration,
		emailInputRegistration,
		selectInputRegistration,
		// Content elements
		headingRegistration,
		imageRegistration,
		dividerRegistration,
	])
	.addLayouts([cardLayoutRegistration, splitLayoutRegistration])
	.addSteppers([defaultStepperRegistration])
	// Register actions - event handlers (NOT components)
	.addActions([submitActionRegistration, resetActionRegistration, notificationActionRegistration])
	.build();

// ============================================
// 2. Third-party packages can export registrations
// ============================================

// @mycompany/design-system
export const designSystemRegistrations = {
	fields: [customTextRegistration, customSelectRegistration, customDatePickerRegistration],
	layouts: [brandedCardLayoutRegistration, brandedHeroLayoutRegistration],
};

// Your app - just import and use!
import { designSystemRegistrations } from "@mycompany/design-system";

const formEngine = new FormEngineBuilder()
	.addElements(designSystemRegistrations.elements)
	.addLayouts(designSystemRegistrations.layouts)
	.build();

// ============================================
// 3. Usage (strongly typed, autocomplete works)
// ============================================

// Example: Login form with heading
const loginForm = formEngine.createForm({
	elements: [
		{
			id: "title",
			componentId: "heading", // ✅ Content element - no 'name' needed
			config: {
				text: "Welcome Back",
				level: "h1",
				align: "center",
			},
		},
		{
			id: "divider1",
			componentId: "divider", // ✅ Decoration element - no 'name' needed
			config: {
				spacing: "md",
			},
		},
		{
			id: "email-field",
			componentId: "email", // ✅ Input element - 'name' is REQUIRED
			config: {
				name: "email", // ✅ Required for 'input' category (form data collection)
				label: "Email Address",
				placeholder: "you@example.com",
				required: true,
				// Validation rules as JSON (serializable)
				rules: [
					{ type: "required", message: "Email is required" },
					{ type: "email", message: "Please enter a valid email" },
					{ type: "minLength", value: 5, message: "Email too short" },
				],
			},
		},
		{
			id: "password-field",
			componentId: "text", // ✅ Input element - 'name' is REQUIRED
			config: {
				name: "password", // ✅ Required for 'input' category (form data collection)
				label: "Password",
				type: "password",
				required: true,
				// Validation rules
				rules: [
					{ type: "required", message: "Password is required" },
					{ type: "minLength", value: 8, message: "Password must be at least 8 characters" },
					{
						type: "pattern",
						value: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
						message: "Password must contain uppercase, lowercase, and number",
					},
				],
			},
		},
	],
	layout: {
		layoutId: "card", // ✅ Autocomplete: 'card' | 'split'
		config: {
			maxWidth: "md",
			padding: "lg",
		},
	},
	actions: [
		// Actions execute when form events occur
		{
			id: "submit-login",
			type: "submit",
			endpoint: "/api/auth/login",
			method: "POST",
			successMessage: "Login successful!",
			triggers: ["form_submit"], // Execute on form submission
		},
		{
			id: "success-notification",
			type: "show_notification",
			message: "Welcome back!",
			variant: "success",
			triggers: ["submit_success"], // Execute AFTER successful submit
		},
		{
			id: "error-notification",
			type: "show_notification",
			message: "Login failed. Please try again.",
			variant: "error",
			triggers: ["submit_error"], // Execute AFTER failed submit
		},
	],
});

// ============================================
// 4. Runtime renderer access
// ============================================

const EmailRenderer = formEngine.getElement("email");
const HeadingRenderer = formEngine.getElement("heading");
const CardLayoutRenderer = formEngine.getLayout("card");

// ============================================
// 5. Action execution (event handlers)
// ============================================

// Actions are triggered by form events
const context: ActionExecutionContext = {
	formId: loginForm.id,
	formData: { email: "user@example.com", password: "secret" },
	currentStep: 1,
	totalSteps: 1,
	isValid: true,
	errors: {},
	form: reactHookFormInstance,
	metadata: {
		stepStartTime: Date.now(),
		totalFormTime: 5000,
		userInteractions: 12,
	},
};

// Execute submit action
const submitResult = await formEngine.executeAction(
	"submit",
	{
		id: "submit-login",
		type: "submit",
		endpoint: "/api/auth/login",
		method: "POST",
		successMessage: "Login successful!",
	},
	context
);

if (submitResult.success) {
	// Execute success notification
	await formEngine.executeAction(
		"show_notification",
		{
			id: "success-notification",
			type: "show_notification",
			message: "Welcome back!",
			variant: "success",
		},
		context
	);
}

// ============================================
// 6. Tooling & Documentation
// ============================================

console.log("Available elements:", formEngine.getRegisteredElements());
// ['text', 'email', 'select', 'heading', 'image', 'divider']

console.log("Available layouts:", formEngine.getRegisteredLayouts());
// ['card', 'split']

console.log("Available actions:", formEngine.getRegisteredActions());
// ['submit', 'reset', 'show_notification']

// ============================================
// 7. Parsing & Validating External Data
// ============================================

// Parse from database
const dbConfig = await db.forms.findOne({ id: "contact-form" });
try {
	const validConfig = formEngine.parseFormConfig(dbConfig);
	console.log("Valid config from DB:", validConfig);
} catch (error) {
	if (error instanceof z.ZodError) {
		console.error("Validation errors:", error.errors);
	}
}

// Safe parse (no throw)
const apiConfig = await fetch("/api/forms/123").then((r) => r.json());
const result = formEngine.safeParseFormConfig(apiConfig);
if (result.success) {
	console.log("Valid config:", result.data);
} else {
	console.error("Invalid config:", result.error.errors);
	// Show user-friendly errors
	const errors = formEngine.getValidationErrors(apiConfig);
	errors.forEach((err) => {
		console.log(`Error at ${err.path.join(".")}: ${err.message}`);
	});
}

// Parse from JSON string
const jsonString = fs.readFileSync("./forms/contact.json", "utf-8");
const config = formEngine.parseFormConfigJSON(jsonString);

// Validate without throwing
if (formEngine.isValidFormConfig(unknownData)) {
	// TypeScript knows it's valid now
	renderForm(unknownData);
}

// Parse individual component configs
const emailConfig = formEngine.parseFieldConfig("email", {
	label: "Email Address",
	required: true,
	placeholder: "you@example.com",
});

const cardConfig = formEngine.parseLayoutConfig("card", {
	maxWidth: "md",
	padding: "lg",
});

// ============================================
// 6. JSON Schema Generation (Automatic from Registered Components)
// ============================================

// Generate complete schema bundle with $ref links
const { formConfigSchema, schemas, byType } = formEngine.toJSONSchema({
	target: "openapi-3.0",
	uri: (id) => `https://api.example.com/schemas/${id}.json`,
});

// formConfigSchema is automatically generated from registered components!
console.log(formConfigSchema);
// {
//   type: 'object',
//   properties: {
//     id: { type: 'string' },
//     title: { type: 'string' },
//     elements: {
//       type: 'array',
//       items: {
//         discriminator: { propertyName: 'componentId' },
//         oneOf: [  // Discriminated union - one schema per registered element!
//           {
//             type: 'object',
//             properties: {
//               id: { type: 'string' },
//               componentId: { const: 'text' },
//               config: { $ref: 'https://api.example.com/schemas/element:text.json' }
//             }
//           },
//           {
//             type: 'object',
//             properties: {
//               id: { type: 'string' },
//               componentId: { const: 'email' },
//               config: { $ref: 'https://api.example.com/schemas/element:email.json' }
//             }
//           },
//           {
//             type: 'object',
//             properties: {
//               id: { type: 'string' },
//               componentId: { const: 'heading' },
//               config: { $ref: 'https://api.example.com/schemas/element:heading.json' }
//             }
//           },
//           {
//             type: 'object',
//             properties: {
//               id: { type: 'string' },
//               componentId: { const: 'image' },
//               config: { $ref: 'https://api.example.com/schemas/element:image.json' }
//             }
//           }
//         ]
//       }
//     },
//     layout: {
//       discriminator: { propertyName: 'layoutId' },
//       oneOf: [  // One schema per registered layout!
//         {
//           type: 'object',
//           properties: {
//             layoutId: { const: 'card' },
//             config: { $ref: 'https://api.example.com/schemas/layout:card.json' }
//           }
//         }
//       ]
//     }
//   }
// }

// schemas contains ALL component schemas with $ref support
console.log(Object.keys(schemas));
// ['element:text', 'element:email', 'element:heading', 'element:image', 'element:divider', 'layout:card', 'layout:split']

// byType organizes schemas by component type
console.log(byType.elements);
// {
//   text: {
//     schemaRef: 'https://api.example.com/schemas/element:text.json',
//     metadata: { id: 'element:text', componentType: 'element', category: 'input', ... }
//   },
//   email: {
//     schemaRef: 'https://api.example.com/schemas/element:email.json',
//     metadata: { id: 'element:email', componentType: 'element', category: 'input', ... }
//   },
//   heading: {
//     schemaRef: 'https://api.example.com/schemas/element:heading.json',
//     metadata: { id: 'element:heading', componentType: 'element', category: 'content', ... }
//   },
//   image: {
//     schemaRef: 'https://api.example.com/schemas/element:image.json',
//     metadata: { id: 'element:image', componentType: 'element', category: 'content', ... }
//   },
//   ...
// }

// Get schemas for just one component type
const elementSchemas = formEngine.toJSONSchemaByType("elements", {
	target: "draft-2020-12",
});

// Export all schemas (for saving to disk, sending to external tools, etc.)
const allSchemas = formEngine.exportSchemas({
	target: "openapi-3.0",
	uri: (id) => `https://api.example.com/schemas/${id}.json`,
});

// Use in form builder - it gets the FormConfig schema + all component schemas!
<FormBuilder
	engine={formEngine}
	formConfigSchema={formConfigSchema} // Knows the structure of a complete form
	componentSchemas={schemas} // Knows each component's config schema
	onSave={(config) => db.forms.save(config)}
/>;
```

## Serialization: The Core Principle

### Everything is Serializable

The form configuration returned by `createForm()` is **100% serializable JSON**:

```typescript
const formConfig = formEngine.createForm({
	fields: [
		{
			id: "email",
			componentId: "email",
			config: {
				label: "Email Address",
				required: true,
				placeholder: "you@example.com",
			},
		},
	],
	layout: {
		layoutId: "card",
		config: { maxWidth: "md" },
	},
});

// ✅ Can be stringified
const json = JSON.stringify(formConfig);

// ✅ Can be saved to database
await db.forms.create({ data: formConfig });

// ✅ Can be sent over network
await fetch("/api/forms", { body: JSON.stringify(formConfig) });

// ✅ Can be versioned in git
fs.writeFileSync("forms/login.json", JSON.stringify(formConfig, null, 2));
```

### Use Cases Enabled by Serialization

#### 1. Form Builders (Visual Editors)

```typescript
// Form builder can use JSON Schema to build UI
const jsonSchema = formEngine.toJSONSchema();

// User drags and drops fields
// Builder generates serializable config
const formConfig = {
  fields: [
    { id: 'field1', componentId: 'text', config: {...} },
    { id: 'field2', componentId: 'email', config: {...} },
  ]
};

// Save to database
await saveForm(formConfig);
```

#### 2. CMS Integration

```typescript
// Form configs stored in CMS as JSON
const formConfig = await cms.getForm("contact-form");

// Render form from config
<FormRenderer engine={formEngine} config={formConfig} />;
```

#### 3. A/B Testing

```typescript
// Different form variants stored as JSON
const variantA = await db.forms.find({ id: "signup-v1" });
const variantB = await db.forms.find({ id: "signup-v2" });

// Dynamically render based on user segment
const config = isTestGroup ? variantB : variantA;
<FormRenderer engine={formEngine} config={config} />;
```

#### 4. Multi-Language Forms

```typescript
// Form structure is the same, only labels differ
const formConfig = await db.forms.find({ id: "contact" });
const translations = await i18n.getTranslations(locale);

// Merge translations into config
const localizedConfig = mergeTranslations(formConfig, translations);
```

#### 5. Form Templates/Marketplace

```typescript
// Share form templates as JSON files
import loginFormTemplate from "./templates/login-form.json";
import signupFormTemplate from "./templates/signup-form.json";

// Use template directly
<FormRenderer engine={formEngine} config={loginFormTemplate} />;
```

#### 6. Version Control

```yaml
# forms/contact-form.json (tracked in git)
{
  "id": "contact-form",
  "title": "Contact Us",
  "fields":
    [
      { "id": "name", "componentId": "text", "config": { ... } },
      { "id": "email", "componentId": "email", "config": { ... } },
    ],
}
```

#### 7. External Form Builders

```typescript
// External tool (e.g., Retool, Airtable) generates form config
// Your app consumes it via API
const rawConfig = await fetch("https://api.formbuilder.com/forms/123").then((r) => r.json());

// Parse and validate (throws if invalid)
const validConfig = formEngine.parseFormConfig(rawConfig);

// Render
<FormRenderer engine={formEngine} config={validConfig} />;
```

### Parsing & Validation: Runtime Safety

One of the most critical features is **runtime validation** of form configurations from external sources.

#### Why Parsing is Essential

When form configs come from:

- **Databases** - JSON columns, NoSQL documents
- **APIs** - External form builders, CMS systems
- **Files** - JSON templates, user uploads
- **Migration** - Old format to new format
- **User input** - Form builder UIs

You need to **validate the structure and values** before rendering.

#### Parsing Methods

```typescript
// ============================================
// 1. Parse (throws on error)
// ============================================

const dbConfig = await db.forms.findOne({ id: "contact" });

try {
	const validConfig = formEngine.parseFormConfig(dbConfig);
	renderForm(validConfig);
} catch (error) {
	if (error instanceof z.ZodError) {
		console.error("Invalid config:", error.errors);
		// [
		//   {
		//     path: ['fields', 0, 'componentId'],
		//     message: 'Unknown field component: invalid-component'
		//   }
		// ]
	}
}

// ============================================
// 2. Safe Parse (returns result object)
// ============================================

const apiConfig = await fetch("/api/forms/123").then((r) => r.json());
const result = formEngine.safeParseFormConfig(apiConfig);

if (result.success) {
	renderForm(result.data); // ✅ TypeScript knows it's valid
} else {
	showError(result.error); // ✅ Handle gracefully
}

// ============================================
// 3. Validate (boolean check)
// ============================================

if (formEngine.isValidFormConfig(unknownData)) {
	// TypeScript narrows the type
	renderForm(unknownData); // ✅ Type-safe
} else {
	showError("Invalid form configuration");
}

// ============================================
// 4. Get validation errors (debugging)
// ============================================

const errors = formEngine.getValidationErrors(invalidConfig);
errors.forEach((err) => {
	console.log(`Error at ${err.path.join(".")}: ${err.message}`);
});
// Error at fields.0.componentId: Unknown field component: invalid
// Error at layout.config.maxWidth: Invalid enum value. Expected 'sm' | 'md' | 'lg' | 'xl', received 'xxl'

// ============================================
// 5. Parse from JSON string
// ============================================

const jsonString = fs.readFileSync("./forms/contact.json", "utf-8");
const config = formEngine.parseFormConfigJSON(jsonString); // ✅ Handles JSON.parse errors

// ============================================
// 6. Parse individual components
// ============================================

// Validate field config
const emailConfig = formEngine.parseFieldConfig("email", {
	label: "Email Address",
	required: true,
	placeholder: "you@example.com",
});

// Validate layout config
const cardConfig = formEngine.parseLayoutConfig("card", {
	maxWidth: "md",
	padding: "lg",
});

// Validate stepper config
const stepperConfig = formEngine.parseStepperConfig("default", {
	showProgress: true,
	allowBack: false,
});
```

#### Real-World Use Cases

**1. Form Builder Application**

```typescript
// User creates form in visual builder
const builderOutput = formBuilder.export();

// Validate before saving
const result = formEngine.safeParseFormConfig(builderOutput);
if (!result.success) {
	showErrors(result.error.errors);
	return;
}

// Save to database
await db.forms.create(result.data);
```

**2. API Integration**

```typescript
// Load form from external API
async function loadExternalForm(formId: string) {
	const response = await fetch(`https://api.formbuilder.com/forms/${formId}`);
	const data = await response.json();

	// Parse and validate
	const result = formEngine.safeParseFormConfig(data);
	if (!result.success) {
		throw new ApiError("Invalid form configuration from external source", {
			errors: formEngine.getValidationErrors(data),
		});
	}

	return result.data;
}
```

**3. Migration Tool**

```typescript
// Migrate old form configs to new format
async function migrateOldForms() {
	const oldForms = await db.oldForms.findMany();
	const migrated = [];
	const errors = [];

	for (const oldForm of oldForms) {
		const newFormat = convertOldToNew(oldForm);
		const result = formEngine.safeParseFormConfig(newFormat);

		if (result.success) {
			migrated.push(result.data);
		} else {
			errors.push({ id: oldForm.id, errors: result.error });
		}
	}

	console.log(`Migrated: ${migrated.length}, Failed: ${errors.length}`);
	return { migrated, errors };
}
```

**4. Template Validation**

```typescript
// Validate form templates on startup
const templates = glob.sync("./templates/**/*.json");

templates.forEach((file) => {
	const content = fs.readFileSync(file, "utf-8");

	try {
		formEngine.parseFormConfigJSON(content);
		console.log(`✅ ${file} is valid`);
	} catch (error) {
		console.error(`❌ ${file} is invalid:`, error);
	}
});
```

**5. User Upload**

```typescript
// User uploads JSON form config
async function handleFormUpload(file: File) {
	const text = await file.text();

	try {
		const config = formEngine.parseFormConfigJSON(text);
		// Save or use config
		await saveForm(config);
		showSuccess("Form uploaded successfully");
	} catch (error) {
		if (error instanceof z.ZodError) {
			showValidationErrors(error.errors);
		} else {
			showError("Invalid JSON file");
		}
	}
}
```

#### Error Messages

The parser provides detailed, actionable error messages:

```typescript
const invalidConfig = {
	id: "test",
	fields: [
		{ id: "email", componentId: "invalid-component", config: {} },
		{ id: "name", componentId: "text", config: { maxLength: "not-a-number" } },
	],
	layout: { layoutId: "unknown-layout", config: {} },
};

const errors = formEngine.getValidationErrors(invalidConfig);
// [
//   {
//     path: ['fields', 0, 'componentId'],
//     message: 'Unknown field component: invalid-component'
//   },
//   {
//     path: ['fields', 1, 'config', 'maxLength'],
//     message: 'Expected number, received string'
//   },
//   {
//     path: ['layout', 'layoutId'],
//     message: 'Unknown layout: unknown-layout'
//   }
// ]
```

### Separation of Concerns

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  FormEngine (Runtime)                              │
│  - React components                                │
│  - Component logic                                 │
│  - Zod schemas                                     │
│  - NOT serializable                                │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ generates
                   ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│  FormConfig (Serializable)                         │
│  - Plain JSON object                               │
│  - Component IDs (strings)                         │
│  - Config objects (plain objects)                  │
│  - 100% serializable                               │
│  - Can be stored/transmitted anywhere              │
│                                                     │
└─────────────────────────────────────────────────────┘

**Note**: "Elements" include form inputs (text, email), content (headings, images),
interactive components (buttons), and layout helpers (spacers, dividers).
```

### JSON Schema Integration (Zod v4 Native)

Zod v4 provides **native JSON Schema generation** - no external dependencies needed!

```typescript
// Get JSON Schema for a specific field using Zod's native function
const fieldSchema = formEngine.getField('text').schema;
const jsonSchema = z.toJSONSchema(fieldSchema);

// Result: Standard JSON Schema (Draft 2020-12 by default)
{
  "id": "text-input-config",
  "title": "Text Input Configuration",
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "const": "text"
    },
    "label": {
      "type": "string",
      "description": "Label displayed above the input"
    },
    "required": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["componentId"],
  "additionalProperties": false
}

// Target different JSON Schema versions
z.toJSONSchema(fieldSchema, { target: 'draft-7' });
z.toJSONSchema(fieldSchema, { target: 'draft-4' });
z.toJSONSchema(fieldSchema, { target: 'openapi-3.0' }); // For OpenAPI!

// Get all schemas at once
const allSchemas = formEngine.toJSONSchema({ target: 'openapi-3.0' });
// => {
//   fields: { text: { schema: {...}, metadata: {...} }, ... },
//   layouts: { card: { schema: {...}, metadata: {...} }, ... },
//   steppers: { default: { schema: {...}, metadata: {...} }, ... }
// }

// Use this for:
// - Form builder UIs (auto-generate property editors)
// - API documentation (OpenAPI specs)
// - External integrations
// - Validation in other languages
// - AI structured outputs
```

**Key Features of Zod v4 JSON Schema**:

- ✅ Multiple target versions (Draft 2020-12, Draft 7, Draft 4, OpenAPI 3.0)
- ✅ Preserves `.describe()` as `description` field
- ✅ Preserves `.meta()` fields (title, examples, etc.)
- ✅ Handles cycles via `$ref`
- ✅ Supports reusable schemas via `$defs`
- ✅ Standard-compliant output

## Benefits

### 1. Element Category System

```typescript
// Clear categorization with validation rules
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text", // ✅ Must be unique
	render: TextInput, // ✅ Framework-agnostic
	schema: z.object({
		name: z.string(), // ✅ Required for 'input' category
		label: z.string(),
		// ...
	}),
	metadata: {
		name: "Text Input",
		category: ElementCategory.INPUT, // ✅ Type-checked by ElementMetadata
		// ...
	},
};

// Filter by category (with IntelliSense)
const inputs = formEngine.getElementsByCategory(ElementCategory.INPUT);
// [{ componentId: 'text', ... }, { componentId: 'email', ... }]

const content = formEngine.getElementsByCategory(ElementCategory.CONTENT);
// [{ componentId: 'heading', ... }, { componentId: 'image', ... }]
```

**Benefits**:

- ✅ **Clear semantics** - Category tells you exactly what the element does
- ✅ **Validation rules** - Only 'input' elements require 'name' field
- ✅ **UI organization** - Form builders can group elements by category
- ✅ **Filtering** - Easy to find inputs vs content vs decoration elements
- ✅ **Type safety** - Category enforced at compile-time with `satisfies`
- ✅ **Unique IDs** - componentId uniqueness enforced at registration time

### 2. Action System (Event Handlers)

```typescript
// Actions are NOT components - they're event handlers
export const submitActionRegistration: ActionRegistration<z.infer<typeof SubmitActionSchema>> = {
	actionType: "submit",
	execute: async (config, context) => {
		const response = await fetch(config.endpoint, {
			method: config.method,
			body: JSON.stringify(context.formData),
		});
		return { success: response.ok, data: await response.json() };
	},
	schema: SubmitActionSchema,
	metadata: {
		name: "Submit Action",
		description: "Submits form data to an API endpoint",
		defaultTriggers: ["form_submit"],
	},
};

// Register actions separately from components
const engine = new FormEngineBuilder()
	.addElements([textInputRegistration, emailInputRegistration])
	.addActions([submitActionRegistration, resetActionRegistration])
	.build();

// Execute actions on trigger events
await engine.executeAction("submit", submitConfig, context);
```

**Benefits**:

- ✅ **Clear separation** - Actions are NOT components, they're event handlers
- ✅ **Pure logic** - No UI rendering, just execute functions
- ✅ **Trigger-based** - Actions respond to form events (submit, reset, etc.)
- ✅ **Type-safe** - Full TypeScript support for action configs
- ✅ **Lifecycle** - Support for submit_start → submit_success/error → submit_complete
- ✅ **Plugin architecture** - Everything is a plugin (submit, reset, notification, etc.)
- ✅ **Sequential execution** - Predictable order, no race conditions

### 3. Validation Rules System

```typescript
// Validation rules are plain JSON
{
	componentId: "email",
	name: "email",
	rules: [
		{ type: "required", message: "Email is required" },
		{ type: "email", message: "Invalid email format" },
		{ type: "minLength", value: 5 }
	]
}

// Automatically converted to Zod schema
const schema = validationRegistry.createSchema(rules);
// z.string().min(1).email().min(5)

// Extensible - register custom validation types
validationRegistry.register({
	type: "phone",
	handler: (rule) => z.string().regex(/^\+?[1-9]\d{1,14}$/)
});
```

**Benefits**:

- ✅ **100% serializable** - Validation rules are plain JSON objects
- ✅ **Built on Zod** - Full type safety and runtime validation
- ✅ **Extensible** - Register custom validation types for your domain
- ✅ **Async validation** - Server-side validation via HTTP
- ✅ **Form builder friendly** - Easy to build UI for rule configuration
- ✅ **Framework-agnostic** - Works with any UI framework
- ✅ **30+ built-in types** - String, number, array, date, format, network validations
- ✅ **Dependency tracking** - Re-validate when dependent fields change

### 4. Object-Based Registration

```typescript
// Components export registration objects
export const textInputRegistration = {
  componentId: 'text',
  component: TextInput,
  schema: TextInputSchema,
  metadata: { name: 'Text Input', category: 'input', ... }
} as const;

// Just import and use!
const engine = new FormEngineBuilder()
  .addElement(textInputRegistration)
  .build();
```

**Benefits**:

- ✅ Reusable across projects
- ✅ Can be published as npm packages
- ✅ No function calls with multiple arguments
- ✅ Clear, self-documenting structure
- ✅ Easy to validate structure

### 5. Library Ecosystem

```typescript
// Third-party package
import { materialUIRegistrations } from "@form-engine/material-ui";

const engine = new FormEngineBuilder()
	.addElements(materialUIRegistrations.elements)
	.addLayouts(materialUIRegistrations.layouts)
	.build();
```

**Benefits**:

- ✅ Component libraries can provide registrations out of the box
- ✅ Copy-paste ready examples
- ✅ Version compatibility clear (schema versions match package versions)

### 6. Single Entry Point

- All configuration in one place
- Easy to see what's available
- No scattered registration files

### 7. Full Serialization Support

```typescript
// Form config is 100% JSON
const config = formEngine.createForm({...});
await db.forms.save(config); // ✅ Serializable
const json = JSON.stringify(config); // ✅ No functions/components
```

**Benefits**:

- ✅ Store in database (Postgres, MongoDB, etc.)
- ✅ Send over network (REST, GraphQL, etc.)
- ✅ Version control (git-friendly JSON files)
- ✅ Form builders can generate configs
- ✅ External tools can create/edit forms
- ✅ A/B testing with different configs
- ✅ Templates/marketplace for sharing

### 8. Automatic Schema Inference

```typescript
// You register components once...
const engine = new FormEngineBuilder()
	.addElement(textInputRegistration) // Input element
	.addElement(emailInputRegistration) // Input element
	.addElement(headingRegistration) // Content element
	.addElement(imageRegistration) // Content element
	.build();

// The FormConfig schema is automatically generated!
const { formConfigSchema } = engine.toJSONSchema();
// {
//   elements: {
//     items: {
//       oneOf: [
//         { componentId: { const: 'text' }, config: { $ref: '...' } },
//         { componentId: { const: 'email' }, config: { $ref: '...' } },
//         { componentId: { const: 'heading' }, config: { $ref: '...' } },
//         { componentId: { const: 'image' }, config: { $ref: '...' } }
//       ]
//     }
//   }
// }
```

**Benefits**:

- ✅ **Zero hardcoding** - schema is built from registrations
- ✅ **Always in sync** - register component = schema updated automatically
- ✅ **Type-safe parsing** - validates against actual registered components
- ✅ **Discriminated unions** - efficient validation with Zod's discriminated unions
- ✅ **Perfect for external tools** - external form builders get exact schema
- ✅ **No maintenance** - add/remove components, schema adjusts automatically

### 9. Native JSON Schema Generation (Zod v4)

```typescript
const { formConfigSchema, schemas } = formEngine.toJSONSchema({
	target: "openapi-3.0", // or 'draft-7', 'draft-4', 'draft-2020-12'
});

// Use for:
// - Form builder UIs (auto-generate property editors)
// - API documentation (OpenAPI 3.0 specs)
// - External integrations (any tool that supports JSON Schema)
// - Multi-language validation
// - AI structured outputs
```

**Benefits**:

- ✅ **Native Zod v4 feature** - no external dependencies!
- ✅ Multiple target versions (Draft 2020-12, 7, 4, OpenAPI 3.0)
- ✅ Standards-compliant output
- ✅ Automatic from Zod schemas (`.describe()`, `.meta()`)
- ✅ Works with any JSON Schema tooling
- ✅ Handles cycles and reused schemas via `$ref`
- ✅ Perfect for form builders and visual editors

### 10. Compile-Time Type Safety

- Type accumulation through builder pattern
- No module augmentation needed
- Autocomplete works naturally

### 11. Parsing & Validation (Runtime Safety)

```typescript
// Parse untrusted data from external sources
const dbConfig = await db.forms.find({ id: "contact" });
const validConfig = formEngine.parseFormConfig(dbConfig); // ✅ Throws if invalid

// Safe parse (no throw)
const result = formEngine.safeParseFormConfig(apiData);
if (result.success) {
	renderForm(result.data); // ✅ Type-safe
} else {
	showErrors(result.error); // ✅ User-friendly errors
}

// Validate structure
if (formEngine.isValidFormConfig(data)) {
	// TypeScript knows data is valid
}

// Get detailed errors
const errors = formEngine.getValidationErrors(invalidData);
// => [{ path: ['fields', 0, 'config', 'label'], message: 'Required' }]
```

**Benefits**:

- ✅ **Runtime safety** - Validate data from external sources (DB, API, files)
- ✅ **Type narrowing** - TypeScript knows data is valid after parsing
- ✅ **Clear errors** - Detailed validation messages with paths
- ✅ **Safe APIs** - `safeParse` doesn't throw, returns result object
- ✅ **Component validation** - Parse individual field/layout/stepper configs
- ✅ **JSON support** - Parse from JSON strings with error handling
- ✅ **Protection** - Prevents invalid data from reaching components

### 12. Better Developer Experience

```typescript
// Before (current)
registerField({
  componentId: 'text',
  component: TextInput,
  schema: TextInputSchema,
  metadata: { ... }
}); // Where? When? What's registered?

// After (proposed)
import { textInputRegistration } from './fields/text-input';

const engine = new FormEngineBuilder()
  .addField(textInputRegistration)  // ✅ Import and use
  .build();                         // ✅ Clear, immutable
```

### 13. Form Rendering from Serializable Config

```typescript
// FormRenderer takes engine + config
import { FormRenderer } from "@json-form-engine/react";

// Load config from anywhere (DB, API, JSON file, etc.)
const formConfig = await db.forms.find({ id: "contact-form" });

// Render the form
<FormRenderer
	engine={formEngine} // Has the React components
	config={formConfig} // Plain JSON config
	onSubmit={handleSubmit}
/>;

// Renderer looks up components by ID and renders them
// formConfig.fields[0].componentId -> 'email' -> formEngine.getField('email').component
```

**Flow**:

```
Serializable Config (JSON) → FormRenderer → React Components
   ↓                           ↓                    ↓
   config.fields[0]    →   engine.getField()  →  <EmailInput />
   config.layout       →   engine.getLayout() →  <CardLayout />
```

### 14. Tooling Support

```typescript
// Generate documentation
const fields = formEngine.getRegisteredFields();
fields.forEach(id => {
  const metadata = formEngine.getFieldMetadata(id);
  console.log(`${id}: ${metadata.description}`);
});

// JSON Schema generation for form builders
const jsonSchema = formEngine.toJSONSchema();

// Visual form builder component
<FormBuilder
  engine={formEngine}
  onSave={(config) => db.forms.save(config)}
/>

// Form editor loads JSON, saves JSON
<FormEditor
  engine={formEngine}
  initialConfig={formConfig}
  onChange={(config) => setFormConfig(config)}
/>
```

### 15. Testing

```typescript
// Easy to create test instances
const testEngine = new FormEngineBuilder()
	.addField("test", TestComponent, TestSchema, { name: "Test" })
	.build();

// No global state pollution
```

## Migration Path

### Phase 1: Build New System (Parallel)

- Create `FormEngineBuilder` class
- Keep existing registries working
- No breaking changes

### Phase 2: Provide Migration Helper

```typescript
// Auto-migrate from old registries
import { migrateFromRegistries } from "@json-form-engine/react/migrate";

const formEngine = migrateFromRegistries({
	fields: reactFieldRegistry,
	layouts: reactLayoutRegistry,
	steppers: reactStepperRegistry,
});
```

### Phase 3: Update Documentation

- New getting started guide
- Migration guide for existing users
- Example projects

### Phase 4: Deprecate Old System

- Mark old registries as deprecated
- Provide warnings
- Set removal date (e.g., v3.0.0)

## Advanced: Registry Patterns and Best Practices

### Custom Registry with Type Constraints

Create specialized registries that only accept certain schema types:

```typescript
import * as z from "zod";

// Registry that ONLY accepts string schemas
type StringFieldMeta = {
	id: string;
	title: string;
	maxLength?: number;
	pattern?: string;
};

const stringFieldRegistry = z.registry<
	StringFieldMeta,
	z.ZodString // Only ZodString schemas allowed
>();

// ✅ Works
stringFieldRegistry.add(z.string(), { id: "name", title: "Name", maxLength: 100 });

// ❌ Type error - ZodNumber not assignable to ZodString
stringFieldRegistry.add(z.number(), { id: "age", title: "Age" });
```

### Using `z.$output` for Type-Safe Examples

Reference the inferred type in your metadata:

```typescript
type ComponentMeta = {
	id: string;
	title: string;
	examples: z.$output[]; // Type-safe examples!
};

const componentRegistry = z.registry<ComponentMeta>();

// Examples are type-checked against the schema
const TextSchema = z
	.object({
		componentId: z.literal("text"),
		label: z.string(),
		value: z.string(),
	})
	.register(componentRegistry, {
		id: "text-field",
		title: "Text Field",
		examples: [
			// ✅ Valid - matches schema
			{ componentId: "text", label: "Name", value: "John" },

			// ❌ Type error - missing required fields
			{ label: "Name" },

			// ❌ Type error - wrong type
			{ componentId: "text", label: 123, value: "John" },
		],
	});
```

### Interlinked Schemas with `$ref`

For complex scenarios with many interrelated schemas, generate multiple JSON Schema files with `$ref` links:

```typescript
// 1. Define base config that other schemas reference
const BaseFieldConfigSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  required: z.boolean().default(false),
}).meta({
  id: 'base-field-config',
  title: 'Base Field Configuration',
});

// 2. Define schemas that extend the base
const TextInputConfigSchema = BaseFieldConfigSchema.extend({
  componentId: z.literal('text'),
  placeholder: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
}).strict().meta({
  id: 'text-input-config',
  title: 'Text Input Configuration',
});

const EmailInputConfigSchema = BaseFieldConfigSchema.extend({
  componentId: z.literal('email'),
  placeholder: z.string().optional(),
}).strict().meta({
  id: 'email-input-config',
  title: 'Email Input Configuration',
});

// 3. Generate interlinked JSON Schemas
const { schemas } = z.toJSONSchema(z.globalRegistry, {
  uri: (id) => `https://api.example.com/schemas/${id}.json`
});

// Result: Multiple schemas with $ref links
{
  'base-field-config': {
    "$id": "https://api.example.com/schemas/base-field-config.json",
    "title": "Base Field Configuration",
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "label": { "type": "string" },
      "required": { "type": "boolean", "default": false }
    },
    "required": ["id"]
  },
  'text-input-config': {
    "$id": "https://api.example.com/schemas/text-input-config.json",
    "title": "Text Input Configuration",
    "allOf": [
      { "$ref": "https://api.example.com/schemas/base-field-config.json" },
      {
        "type": "object",
        "properties": {
          "componentId": { "type": "string", "const": "text" },
          "placeholder": { "type": "string" },
          "minLength": { "type": "number" },
          "maxLength": { "type": "number" }
        }
      }
    ]
  },
  'email-input-config': {
    "$id": "https://api.example.com/schemas/email-input-config.json",
    "title": "Email Input Configuration",
    "allOf": [
      { "$ref": "https://api.example.com/schemas/base-field-config.json" },
      {
        "type": "object",
        "properties": {
          "componentId": { "type": "string", "const": "email" },
          "placeholder": { "type": "string" }
        }
      }
    ]
  }
}
```

**Benefits of Interlinked Schemas**:

- ✅ **Schema distribution** - Serve individual schemas from different URLs
- ✅ **Schema composition** - Schemas reference each other via `$ref`
- ✅ **Version management** - Different schema versions at different URLs
- ✅ **Caching** - External tools can cache referenced schemas
- ✅ **Reusability** - Base schemas can be extended by many variants
- ✅ **OpenAPI compatibility** - Generate OpenAPI specs with `$ref` components

### Multiple Registries for Different Purposes

Organize schemas into different registries based on their purpose:

```typescript
// Registry for public API schemas (external tools)
type PublicApiMeta = {
	id: string;
	title: string;
	description: string;
	examples: z.$output[];
	deprecated?: boolean;
};

const publicApiRegistry = z.registry<PublicApiMeta>();

// Registry for internal validation rules (not exposed)
type InternalValidationMeta = {
	validatorId: string;
	performance: "fast" | "slow";
	dependencies?: string[];
};

const validationRegistry = z.registry<InternalValidationMeta>();

// Registry for UI component metadata
type UIComponentMeta = {
	id: string;
	displayName: string;
	category: string;
	icon?: string;
	previewUrl?: string;
};

const uiComponentRegistry = z.registry<UIComponentMeta>();

// Same schema can be registered in multiple registries!
const EmailSchema = z.string().email();

EmailSchema.register(publicApiRegistry, {
	id: "email",
	title: "Email Address",
	description: "A valid email address",
	examples: ["user@example.com"],
})
	.register(validationRegistry, {
		validatorId: "email-validator",
		performance: "fast",
	})
	.register(uiComponentRegistry, {
		id: "email-input",
		displayName: "Email Input",
		category: "input",
		icon: "mail",
	});

// Query each registry independently
publicApiRegistry.get(EmailSchema);
// => { id: 'email', title: 'Email Address', ... }

validationRegistry.get(EmailSchema);
// => { validatorId: 'email-validator', performance: 'fast', ... }

uiComponentRegistry.get(EmailSchema);
// => { id: 'email-input', displayName: 'Email Input', ... }
```

### Registry Management Operations

```typescript
const myRegistry = z.registry<{ description: string }>();

const stringSchema = z.string();
const numberSchema = z.number();

// Add schemas
myRegistry.add(stringSchema, { description: "A string" });
myRegistry.add(numberSchema, { description: "A number" });

// Check existence
myRegistry.has(stringSchema); // => true

// Get metadata
myRegistry.get(stringSchema); // => { description: 'A string' }

// Remove schema
myRegistry.remove(stringSchema);
myRegistry.has(stringSchema); // => false

// Clear all
myRegistry.clear();

// Iterate all entries
for (const [schema, metadata] of myRegistry.entries()) {
	console.log(metadata.description);
}
```

### Important Notes

1. **The `id` field is special**: Zod throws an error if multiple schemas are registered with the same `id` value (prevents collisions)

2. **`.register()` is unique**: It's the ONLY Zod method that returns the original schema (not a new instance). This allows chaining multiple registrations:

   ```typescript
   const schema = z.string()
     .register(registry1, { ... })
     .register(registry2, { ... })
     .register(registry3, { ... });
   ```

3. **Metadata is instance-specific**: When you call `.meta()` or other Zod methods that return new instances, the metadata is NOT copied:

   ```typescript
   const A = z.string().meta({ description: "Original" });
   A.meta(); // => { description: 'Original' }

   const B = A.refine((_) => true);
   B.meta(); // => undefined (new instance, no metadata)
   ```

4. **Use `z.$output` and `z.$input`**: Reference inferred types in your metadata for type-safe examples and documentation

## Open Questions

1. **Default Components**: Should we provide a `createDefaultEngine()` with common components?

   ```typescript
   const engine = createDefaultEngine()
     .addField('custom', MyCustomField, ...)
     .build();
   ```

2. **Plugins**: How should we handle plugin systems?

   ```typescript
   const engine = new FormEngineBuilder().use(validationPlugin).use(i18nPlugin).build();
   ```

3. **Multiple Engines**: Should we support multiple engine instances?

   ```typescript
   const adminEngine = new FormEngineBuilder()...;
   const publicEngine = new FormEngineBuilder()...;
   ```

4. **React Context**: How do we provide the engine to components?

   ```typescript
   <FormEngineProvider engine={formEngine}>
   	<App />
   </FormEngineProvider>
   ```

5. **Lazy Loading**: Can components be lazy-loaded?
   ```typescript
   .addField('text', () => import('./text-input'), TextInputSchema, ...)
   ```

## Next Steps

1. **Feedback**: Get team feedback on this approach
2. **Prototype**: Build a working prototype
3. **Benchmark**: Compare performance with current system
4. **Documentation**: Write comprehensive docs
5. **Migration**: Plan migration for existing users

## Questions for Discussion

- Does this solve the core problems?
- Are there any dealbreakers?
- What about the open questions above?
- Should we keep any parts of the current system?
- Timeline for implementation?

---

**Author**: AI Assistant  
**Date**: October 9, 2025  
**Related Issues**: Type safety, DX improvements, architecture simplification
