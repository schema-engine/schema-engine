# Package Migration Guide - Form Engine Builder

## Overview

This document outlines the steps required to migrate packages in the form-engine monorepo to the new RFC architecture, transitioning from the current fragmented registration system to a unified builder pattern.

This guide covers:

- `@form-engine/core` - Core builder, engine, and type system
- `@form-engine/react` - React components and registrations

## General Package Update Process

For any package in the monorepo, follow these steps:

### 1. Plan and Design

- Review the RFC and understand the new architecture
- Identify breaking changes in your package
- Map old patterns to new patterns
- Document migration strategy

### 2. Update Implementation

- Create new files for new patterns
- Update existing files to use new patterns
- Remove deprecated code
- Update internal dependencies

### 3. Update Package Configuration

- Review and update `package.json` exports
- Update build configuration
- Update TypeScript configuration
- Update dependencies

### 4. Test and Validate

- Write/update tests for new patterns
- Run test suite
- Run build process
- Validate output

### 5. Document Changes

- Update README
- Create migration guides
- Update examples
- Update inline documentation

---

## Package-Specific Migration: `@form-engine/core`

### Current State

The core package contains:

- Fragmented registries (actions, layouts, steppers)
- Schema definitions
- Validation system
- Plugin architecture

### Target State

Unified builder pattern with:

- `FormEngineBuilder` - Single entry point for registration
- `FormEngine` - Immutable runtime engine
- Serializable configuration system
- JSON Schema generation

### Step 1: Create Type System

**Location**: `packages/core/src/types/`

Create new type definitions:

```typescript
// packages/core/src/types/categories.ts
export type ElementCategory = "input" | "content" | "decoration" | "interactive";

// packages/core/src/types/metadata.ts
export interface ComponentMetadata {
	name: string;
	description?: string;
	icon?: string;
	tags?: string[];
	version?: string;
}

export interface ElementMetadata extends ComponentMetadata {
	category: ElementCategory;
}

export interface ActionMetadata {
	name: string;
	description?: string;
	icon?: string;
}

// packages/core/src/types/registration.ts
export interface ElementRegistration<TConfig = unknown> {
	componentId: string;
	schema: z.ZodType<TConfig>;
	metadata: ElementMetadata;
	render: (props: TConfig & { onChange?: (value: unknown) => void }) => unknown;
}

export interface LayoutRegistration<TConfig = unknown> {
	layoutId: string;
	schema: z.ZodType<TConfig>;
	metadata: ComponentMetadata;
	render: (props: TConfig & { children: unknown }) => unknown;
}

export interface StepperRegistration<TConfig = unknown> {
	stepperId: string;
	schema: z.ZodType<TConfig>;
	metadata: ComponentMetadata;
	render: (props: TConfig) => unknown;
}

export interface ActionRegistration<TConfig = unknown> {
	actionType: string;
	schema: z.ZodType<TConfig>;
	metadata: ActionMetadata;
	execute: (context: ActionExecutionContext<TConfig>) => Promise<ActionExecutionResult>;
}
```

**New Files**:

- `packages/core/src/types/categories.ts`
- `packages/core/src/types/metadata.ts`
- `packages/core/src/types/registration.ts`
- `packages/core/src/types/index.ts` (barrel export)

### Step 2: Implement FormEngineBuilder

**Location**: `packages/core/src/builder/`

```typescript
// packages/core/src/builder/form-engine-builder.ts
export class FormEngineBuilder {
	private elements = new Map<string, ElementRegistration>();
	private layouts = new Map<string, LayoutRegistration>();
	private steppers = new Map<string, StepperRegistration>();
	private actions = new Map<string, ActionRegistration>();

	addElement<TConfig>(registration: ElementRegistration<TConfig>): this {
		// Validation logic
		return this;
	}

	addElements(registrations: ElementRegistration[]): this {
		for (const reg of registrations) {
			this.addElement(reg);
		}
		return this;
	}

	// Similar for layouts, steppers, actions...

	build(): FormEngine {
		return new FormEngine({
			elements: this.elements,
			layouts: this.layouts,
			steppers: this.steppers,
			actions: this.actions,
		});
	}
}
```

**New Files**:

- `packages/core/src/builder/form-engine-builder.ts`
- `packages/core/src/builder/validation.ts`
- `packages/core/src/builder/index.ts`

### Step 3: Implement FormEngine

**Location**: `packages/core/src/engine/`

```typescript
// packages/core/src/engine/form-engine.ts
export class FormEngine {
	constructor(private readonly registries: EngineRegistries) {}

	createForm(config: SerializableFormConfig): FormInstance {
		// Create form instance
	}

	getElement(componentId: string): ElementRegistration | undefined {
		return this.registries.elements.get(componentId);
	}

	// Other methods...
}
```

**New Files**:

- `packages/core/src/engine/form-engine.ts`
- `packages/core/src/engine/serialization.ts`
- `packages/core/src/engine/json-schema.ts`
- `packages/core/src/engine/index.ts`

### Step 4: Update Schemas

**Location**: `packages/core/src/schemas/`

Create serializable form config schema:

```typescript
// packages/core/src/schemas/serializable-form.ts
export const SerializableFormConfigSchema = z.object({
	fields: z.array(
		z.object({
			componentId: z.string(),
			config: z.unknown(), // Validated at runtime
		})
	),
	layout: z
		.object({
			layoutId: z.string(),
			config: z.unknown().optional(),
		})
		.optional(),
	stepper: z
		.object({
			stepperId: z.string(),
			config: z.unknown().optional(),
		})
		.optional(),
	actions: z
		.array(
			z.object({
				actionType: z.string(),
				trigger: z.string(),
				config: z.unknown().optional(),
			})
		)
		.optional(),
});
```

**Files to Update**:

- `packages/core/src/schemas/form-config.ts`
- `packages/core/src/schemas/field-config.ts`

**New Files**:

- `packages/core/src/schemas/serializable-form.ts`
- `packages/core/src/schemas/element-wrapper.ts`

### Step 5: Refactor Existing Registries

**Location**: `packages/core/src/actions/`, `packages/core/src/layouts/`, `packages/core/src/steppers/`

Update registries to work with builder:

```typescript
// packages/core/src/actions/action-registry.ts
// Remove global singleton pattern
// Provide utility functions for creating action registrations

export function createActionRegistration<TConfig>(
	actionType: string,
	schema: z.ZodType<TConfig>,
	metadata: ActionMetadata,
	execute: (context: ActionExecutionContext<TConfig>) => Promise<ActionExecutionResult>
): ActionRegistration<TConfig> {
	return { actionType, schema, metadata, execute };
}
```

**Files to Update**:

- `packages/core/src/actions/action-registry.ts`
- `packages/core/src/actions/action-executor.ts`
- `packages/core/src/layouts/layout-registry.ts`
- `packages/core/src/steppers/stepper-registry.ts`

### Step 6: Update Package Exports

**Location**: `packages/core/package.json`

```json
{
	"name": "@form-engine/core",
	"version": "2.0.0",
	"main": "./dist/index.js",
	"module": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"import": "./dist/index.js",
			"require": "./dist/index.cjs",
			"types": "./dist/index.d.ts"
		},
		"./builder": {
			"import": "./dist/builder/index.js",
			"require": "./dist/builder/index.cjs",
			"types": "./dist/builder/index.d.ts"
		},
		"./engine": {
			"import": "./dist/engine/index.js",
			"require": "./dist/engine/index.cjs",
			"types": "./dist/engine/index.d.ts"
		},
		"./types": {
			"import": "./dist/types/index.js",
			"require": "./dist/types/index.cjs",
			"types": "./dist/types/index.d.ts"
		},
		"./schemas": {
			"import": "./dist/schemas/index.js",
			"require": "./dist/schemas/index.cjs",
			"types": "./dist/schemas/index.d.ts"
		},
		"./validation": {
			"import": "./dist/schemas/validation/index.js",
			"require": "./dist/schemas/validation/index.cjs",
			"types": "./dist/schemas/validation/index.d.ts"
		},
		"./actions": {
			"import": "./dist/actions/index.js",
			"require": "./dist/actions/index.cjs",
			"types": "./dist/actions/index.d.ts"
		}
	}
}
```

**Location**: `packages/core/src/index.ts`

```typescript
// Main barrel export
export * from "./types";
export * from "./builder";
export * from "./engine";
export * from "./schemas";
export * from "./actions";
export * from "./layouts";
export * from "./steppers";
```

### Step 7: Update Build Configuration

**Location**: `packages/core/build.ts`

Review and update build script to handle new structure.

**Location**: `packages/core/tsconfig.build.json`

Ensure proper paths and output configuration.

### Step 8: Write Tests

**Location**: `packages/core/test/`

Create comprehensive tests:

```typescript
// packages/core/test/builder/form-engine-builder.test.ts
describe("FormEngineBuilder", () => {
	it("should register elements", () => {
		const builder = new FormEngineBuilder();
		builder.addElement(textInputRegistration);
		const engine = builder.build();
		expect(engine.getElement("text")).toBeDefined();
	});

	it("should validate unique component IDs", () => {
		const builder = new FormEngineBuilder();
		builder.addElement(textInputRegistration);
		expect(() => builder.addElement(textInputRegistration)).toThrow(
			'Component ID "text" already registered'
		);
	});

	// More tests...
});
```

**New Test Files**:

- `packages/core/test/builder/form-engine-builder.test.ts`
- `packages/core/test/engine/form-engine.test.ts`
- `packages/core/test/engine/serialization.test.ts`
- `packages/core/test/types/registration.test.ts`

### Step 9: Run Build and Tests

```bash
cd packages/core
bun install
bun run build
bun test
```

### Step 10: Update Documentation

**Location**: `packages/core/README.md`

Update with new usage examples:

```markdown
## Installation

\`\`\`bash
bun add @form-engine/core
\`\`\`

## Usage

\`\`\`typescript
import { FormEngineBuilder } from '@form-engine/core';
import { textInputRegistration, emailInputRegistration } from './fields';

const formEngine = new FormEngineBuilder()
.addElement(textInputRegistration)
.addElement(emailInputRegistration)
.build();

const form = formEngine.createForm({
fields: [
{ componentId: 'text', config: { name: 'username', label: 'Username' } },
{ componentId: 'email', config: { name: 'email', label: 'Email' } },
],
});
\`\`\`
```

**New Documentation**:

- `packages/core/docs/MIGRATION_GUIDE.md`
- `packages/core/docs/BUILDER_API.md`
- `packages/core/docs/EXAMPLES.md`

---

## Package-Specific Migration: `@form-engine/react`

### Current State

The React package contains:

- React component implementations
- Component registrations
- Hooks
- Shadcn/ui integration

### Target State

React-specific registrations using the new builder pattern:

```typescript
// Element registrations with React components
export const textInputRegistration: ElementRegistration<z.infer<typeof TextInputConfigSchema>> = {
	componentId: "text",
	schema: TextInputConfigSchema,
	metadata: {
		name: "Text Input",
		description: "Single-line text input",
		category: "input",
		icon: "text",
	},
	render: (props) => <TextInput {...props} />,
};
```

### Step 1: Update Component Structure

**Location**: `packages/react/src/components/`

Organize components by category:

```
packages/react/src/components/
  elements/
    inputs/
      text-input/
        text-input.tsx
        text-input.config.ts (schema)
        text-input.registration.ts (registration object)
        index.ts
      email-input/
      select-input/
      ...
    content/
      heading/
      paragraph/
      image/
      ...
    decoration/
      divider/
      spacer/
      ...
    interactive/
      button/
      link/
      ...
  layouts/
    card-layout/
      card-layout.tsx
      card-layout.config.ts
      card-layout.registration.ts
      index.ts
    grid-layout/
    ...
  steppers/
    wizard-stepper/
      wizard-stepper.tsx
      wizard-stepper.config.ts
      wizard-stepper.registration.ts
      index.ts
    ...
```

### Step 2: Create Registration Objects

**Location**: `packages/react/src/registrations/`

Create centralized registration exports:

```typescript
// packages/react/src/registrations/elements.ts
export { textInputRegistration } from "@/components/elements/inputs/text-input";
export { emailInputRegistration } from "@/components/elements/inputs/email-input";
export { headingRegistration } from "@/components/elements/content/heading";
// ... all element registrations

// Group by category
export const inputElements = [
	textInputRegistration,
	emailInputRegistration,
	// ...
];

export const contentElements = [
	headingRegistration,
	paragraphRegistration,
	// ...
];

export const allElements = [
	...inputElements,
	...contentElements,
	// ...
];
```

```typescript
// packages/react/src/registrations/layouts.ts
export { cardLayoutRegistration } from "@/components/layouts/card-layout";
export { gridLayoutRegistration } from "@/components/layouts/grid-layout";

export const allLayouts = [
	cardLayoutRegistration,
	gridLayoutRegistration,
	// ...
];
```

```typescript
// packages/react/src/registrations/actions.ts
export { submitActionRegistration } from "@/actions/submit-action";
export { resetActionRegistration } from "@/actions/reset-action";

export const allActions = [
	submitActionRegistration,
	resetActionRegistration,
	// ...
];
```

**New Files**:

- `packages/react/src/registrations/elements.ts`
- `packages/react/src/registrations/layouts.ts`
- `packages/react/src/registrations/steppers.ts`
- `packages/react/src/registrations/actions.ts`
- `packages/react/src/registrations/index.ts`

### Step 3: Update Hooks

**Location**: `packages/react/src/hooks/`

Update or create hooks for the new pattern:

```typescript
// packages/react/src/hooks/use-form-engine.ts
export function useFormEngine(builder: FormEngineBuilder) {
	const [engine] = useState(() => builder.build());
	return engine;
}

// packages/react/src/hooks/use-form-instance.ts
export function useFormInstance(engine: FormEngine, config: SerializableFormConfig) {
	const [form] = useState(() => engine.createForm(config));
	return form;
}
```

**New Files**:

- `packages/react/src/hooks/use-form-engine.ts`
- `packages/react/src/hooks/use-form-instance.ts`

### Step 4: Create Example Setup

**Location**: `packages/react/src/setup/`

Provide pre-configured builder for common use cases:

```typescript
// packages/react/src/setup/default-setup.ts
import { FormEngineBuilder } from "@form-engine/core";
import { allElements, allLayouts, allSteppers, allActions } from "@/registrations";

export function createDefaultFormEngine() {
	return new FormEngineBuilder()
		.addElements(allElements)
		.addLayouts(allLayouts)
		.addSteppers(allSteppers)
		.addActions(allActions)
		.build();
}
```

**New Files**:

- `packages/react/src/setup/default-setup.ts`
- `packages/react/src/setup/minimal-setup.ts`
- `packages/react/src/setup/index.ts`

### Step 5: Update Package Exports

**Location**: `packages/react/package.json`

```json
{
	"name": "@form-engine/react",
	"version": "2.0.0",
	"main": "./dist/index.js",
	"module": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"import": "./dist/index.js",
			"require": "./dist/index.cjs",
			"types": "./dist/index.d.ts"
		},
		"./registrations": {
			"import": "./dist/registrations/index.js",
			"require": "./dist/registrations/index.cjs",
			"types": "./dist/registrations/index.d.ts"
		},
		"./registrations/elements": {
			"import": "./dist/registrations/elements.js",
			"require": "./dist/registrations/elements.cjs",
			"types": "./dist/registrations/elements.d.ts"
		},
		"./registrations/layouts": {
			"import": "./dist/registrations/layouts.js",
			"require": "./dist/registrations/layouts.cjs",
			"types": "./dist/registrations/layouts.d.ts"
		},
		"./components": {
			"import": "./dist/components/index.js",
			"require": "./dist/components/index.cjs",
			"types": "./dist/components/index.d.ts"
		},
		"./hooks": {
			"import": "./dist/hooks/index.js",
			"require": "./dist/hooks/index.cjs",
			"types": "./dist/hooks/index.d.ts"
		},
		"./setup": {
			"import": "./dist/setup/index.js",
			"require": "./dist/setup/index.cjs",
			"types": "./dist/setup/index.d.ts"
		}
	},
	"peerDependencies": {
		"@form-engine/core": "^2.0.0",
		"react": "^18.0.0 || ^19.0.0",
		"react-dom": "^18.0.0 || ^19.0.0"
	}
}
```

**Location**: `packages/react/src/index.ts`

```typescript
// Main barrel export
export * from "./components";
export * from "./hooks";
export * from "./registrations";
export * from "./setup";

// Re-export core types for convenience
export type {
	ElementRegistration,
	LayoutRegistration,
	StepperRegistration,
	ActionRegistration,
	SerializableFormConfig,
} from "@form-engine/core";
```

### Step 6: Update Dependencies

**Location**: `packages/react/package.json`

Ensure proper dependency on updated core:

```json
{
	"dependencies": {
		"@form-engine/core": "workspace:*"
	},
	"peerDependencies": {
		"react": "^18.0.0 || ^19.0.0",
		"react-dom": "^18.0.0 || ^19.0.0"
	}
}
```

### Step 7: Write Tests

**Location**: `packages/react/test/`

```typescript
// packages/react/test/registrations/elements.test.ts
describe("Element Registrations", () => {
	it("should have valid text input registration", () => {
		expect(textInputRegistration.componentId).toBe("text");
		expect(textInputRegistration.metadata.category).toBe("input");
		expect(textInputRegistration.schema).toBeDefined();
	});

	// More tests...
});

// packages/react/test/components/text-input.test.tsx
describe("TextInput Component", () => {
	it("should render correctly", () => {
		const config = { name: "test", label: "Test Label" };
		render(<TextInput {...config} />);
		expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
	});

	// More tests...
});
```

**New Test Files**:

- `packages/react/test/registrations/elements.test.ts`
- `packages/react/test/registrations/layouts.test.ts`
- `packages/react/test/hooks/use-form-engine.test.tsx`
- `packages/react/test/setup/default-setup.test.ts`

### Step 8: Run Build and Tests

```bash
cd packages/react
bun install
bun run build
bun test
```

### Step 9: Update Documentation

**Location**: `packages/react/README.md`

```markdown
## Installation

\`\`\`bash
bun add @form-engine/react @form-engine/core
\`\`\`

## Quick Start

\`\`\`typescript
import { FormEngineBuilder } from '@form-engine/core';
import { allElements, allLayouts } from '@form-engine/react/registrations';

const formEngine = new FormEngineBuilder()
.addElements(allElements)
.addLayouts(allLayouts)
.build();

const form = formEngine.createForm({
fields: [
{ componentId: 'text', config: { name: 'username', label: 'Username' } },
],
});
\`\`\`

## Custom Setup

\`\`\`typescript
import { FormEngineBuilder } from '@form-engine/core';
import {
textInputRegistration,
emailInputRegistration
} from '@form-engine/react/registrations/elements';

const formEngine = new FormEngineBuilder()
.addElement(textInputRegistration)
.addElement(emailInputRegistration)
.build();
\`\`\`
```

**New Documentation**:

- `packages/react/REGISTRATION.md` (update with new pattern)
- `packages/react/docs/COMPONENTS.md`
- `packages/react/docs/EXAMPLES.md`

---

## Validation Checklist

After completing migration for each package:

### Build Validation

- [ ] TypeScript compiles without errors
- [ ] Build produces correct output structure
- [ ] Type definitions are generated correctly
- [ ] No circular dependencies
- [ ] Tree-shaking works correctly

### Test Validation

- [ ] All existing tests updated and passing
- [ ] New tests for builder pattern added
- [ ] New tests for registration objects added
- [ ] Integration tests passing
- [ ] No test coverage regression

### Package Validation

- [ ] `package.json` exports are correct
- [ ] All imports resolve correctly
- [ ] Peer dependencies are correct
- [ ] Version numbers updated appropriately

### Documentation Validation

- [ ] README updated with new usage
- [ ] Migration guide created
- [ ] API documentation updated
- [ ] Examples updated
- [ ] Inline code comments updated

---

## Migration Order

1. **@form-engine/core** (foundation)

   - Must be completed first
   - All other packages depend on it

2. **@form-engine/react** (main implementation)

   - Depends on core
   - Provides React components and registrations

3. **apps/www** (consumer)
   - Update to use new patterns
   - Validate end-to-end functionality

---

## Breaking Changes

### Core Package

- Global registries removed
- Type augmentation pattern removed
- New builder pattern required
- Import paths changed

### React Package

- Component registration pattern changed
- No more implicit imports
- Explicit registration objects required
- Setup function pattern introduced

---

## Rollback Plan

If issues are encountered:

1. Keep old implementation in separate branch
2. Use feature flags to toggle between old/new patterns
3. Maintain adapter layer during transition period
4. Document known issues and workarounds

---

## Timeline Estimate

### Core Package

- Type system: 2-3 hours
- Builder implementation: 3-4 hours
- Engine implementation: 3-4 hours
- Schema updates: 2-3 hours
- Registry refactoring: 2-3 hours
- Tests: 3-4 hours
- Documentation: 2-3 hours
- **Total: 17-24 hours**

### React Package

- Component restructuring: 4-6 hours
- Registration objects: 4-6 hours
- Hooks updates: 2-3 hours
- Setup utilities: 1-2 hours
- Tests: 4-6 hours
- Documentation: 2-3 hours
- **Total: 17-26 hours**

### Overall Timeline

**Estimated: 34-50 hours of focused development**

---

## Success Criteria

- [ ] All packages build successfully
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation is complete
- [ ] Examples work correctly
- [ ] No performance regression
- [ ] Migration guide is clear
- [ ] Breaking changes are documented
- [ ] Version numbers updated
- [ ] Git commits follow conventional commits format
