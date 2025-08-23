# Form Engine Architecture

A comprehensive overview of the Form Engine's system design, component architecture, and integration patterns.

## System Overview

The Form Engine is a declarative, configuration-driven form system built on React Hook Form with automatic Zod schema generation. It provides a complete solution for complex form requirements through a modular, type-safe architecture.

## Core Architecture Principles

### 1. Configuration-Driven Design

- **Single Source of Truth**: Form structure defined in JSON-serializable configurations
- **Declarative API**: No imperative form building - everything is configuration
- **Runtime Schema Generation**: Zod schemas automatically generated from validation rules
- **Type Safety**: Full TypeScript support with discriminated unions

### 2. Modular Component System

- **Tree-Shakable Registry**: Only imported field components are bundled
- **Pluggable Architecture**: Easy extension with custom field types
- **Compound Patterns**: Composable components for complex UI structures
- **Separation of Concerns**: Clear boundaries between rendering, validation, and logic

### 3. Performance-First Approach

- **Optimized Re-renders**: useWatch-based conditional logic with minimal updates
- **Lazy Validation**: Schema generation only when needed
- **Debounced Operations**: Efficient auto-save and validation timing
- **Memory Management**: Proper cleanup and resource management

## Directory Structure

```
src/lib/form-engine/
├── actions/                    # Action system for form operations
│   ├── types.ts               # Action type definitions
│   ├── action-executor.ts     # Action execution engine
│   └── index.ts
├── hooks/                     # Shared hooks
│   ├── use-constraint-logic.ts # Conditional logic evaluation
│   └── use-field.ts           # Field state management
├── types/                     # Type definitions
│   ├── form.ts               # Form configuration types
│   ├── registry.ts           # Registry system types
│   └── index.ts
├── form-renderer.tsx          # Main form rendering component
├── field-renderer.tsx         # Individual field rendering
├── stepper.tsx               # Multi-step form stepper
├── validation.ts             # Validation rule system
├── registry.ts               # Component registry implementation
├── serialization.ts          # Form serialization utilities
├── grid-hooks.ts            # Responsive grid system
├── provider.tsx             # Form engine context provider
└── index.ts                 # Public API exports
```

## Component Architecture

### Core Rendering Pipeline

```typescript
FormRenderer
├── FormProvider                 # React Hook Form context
├── Stepper                     # Multi-step navigation (if steps > 1)
│   ├── Stepper.Header         # Step indicators
│   ├── Stepper.Content        # Current step content
│   └── Stepper.Navigation     # Navigation buttons
├── GridContainer              # Responsive grid layout
├── FieldRenderer              # Individual field rendering
│   ├── FormField             # Field wrapper with labels/errors
│   ├── ConditionalWrapper    # Constraint logic evaluation
│   └── DynamicComponent      # Registry-resolved field component
└── ActionExecutor             # Action system execution
```

### Field Component Registry

The registry system provides a pluggable architecture for field components:

```typescript
interface FormComponentRegistry {
	register(name: string, component: ComponentType<any>): void;
	getComponent(name: string): ComponentType<any> | undefined;
	getAllComponents(): Map<string, ComponentType<any>>;
	hasComponent(name: string): boolean;
}

// Tree-shakable field registration
import "@/components/form/registries/input.registry";
import "@/components/form/registries/select.registry";
// Only imported components are bundled
```

### Multi-Step Form System

The stepper system uses a compound pattern for maximum flexibility:

```typescript
// Compound component structure
<Stepper sections={formSections} currentStep={currentStep}>
	<Stepper.Header variant="default" orientation="horizontal" showStepNumbers={true} />
	<Stepper.Content>{/* Current step content */}</Stepper.Content>
	<Stepper.Navigation
		previousButton={{ label: "Back", variant: "outline" }}
		nextButton={{ label: "Next", variant: "default" }}
	/>
</Stepper>
```

**Stepper Features:**

- **Visual Variants**: `default`, `pills`, `arrows`, `dots`
- **Orientations**: `horizontal`, `vertical`
- **Validation Modes**: `wizard` (strict) or `free` (flexible navigation)
- **Custom Handlers**: `onStepEnter`, `onStepLeave`, `onStepValidate`

## Type System Architecture

### Discriminated Unions for Field Types

The type system uses discriminated unions to ensure type safety:

```typescript
type FieldConfig =
	| InputFieldConfig // type: "input"
	| SelectFieldConfig // type: "select"
	| CheckboxFieldConfig // type: "checkbox"
	| NumberFieldConfig // type: "number"
	| TextareaFieldConfig // type: "textarea"
	| RadioFieldConfig // type: "radio"
	| ArrayFieldConfig // type: "array"
	| DateFieldConfig // type: "date"
	| FileFieldConfig // type: "file"
	| SwitchFieldConfig; // type: "switch"

// Type narrowing in field rendering
function renderField(config: FieldConfig) {
	switch (config.type) {
		case "input":
			// config is now narrowed to InputFieldConfig
			return <InputField {...config} />;
		case "select":
			// config is now narrowed to SelectFieldConfig
			return <SelectField {...config} />;
		// ... other cases
	}
}
```

### Runtime Schema Validation

All configurations are validated at runtime using Zod schemas:

```typescript
// Configuration validation
const FormConfigSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	steps: z.array(FormStepSchema),
	actions: z.array(FormActionConfigSchema).optional(),
	// ... other properties
});

// Runtime validation
function validateFormConfig(config: unknown): FormConfig {
	return FormConfigSchema.parse(config);
}
```

## Responsive Grid System

### CSS Grid Foundation

The grid system is built on modern CSS Grid with responsive cascade behavior:

```typescript
interface GridLayoutConfig {
	columns: number | "auto";
	gap: number | string;
	responsive: {
		default: GridBreakpointConfig; // Mobile-first base
		sm?: GridBreakpointConfig; // 640px+
		md?: GridBreakpointConfig; // 768px+
		lg?: GridBreakpointConfig; // 1024px+
		xl?: GridBreakpointConfig; // 1280px+
		"2xl"?: GridBreakpointConfig; // 1536px+
	};
}
```

### Cascade Behavior

Values cascade upward like CSS media queries:

```typescript
// Cascade resolution algorithm
function getCascadingGridConfig(
	responsive: ResponsiveGridConfig,
	currentBreakpoint: Breakpoint
): GridBreakpointConfig {
	const breakpoints: Breakpoint[] = ["default", "sm", "md", "lg", "xl", "2xl"];
	const currentIndex = breakpoints.indexOf(currentBreakpoint);

	// Find the highest defined breakpoint <= current
	for (let i = currentIndex; i >= 0; i--) {
		const config = responsive[breakpoints[i]];
		if (config) return config;
	}

	return responsive.default || {};
}
```

## Action System Architecture

### Trigger-Based Execution

Actions execute automatically based on form events:

```typescript
type ActionTrigger =
	| "form_start" // Form initialization
	| "form_change" // Field value changes
	| "step_submit" // Step completion
	| "step_change" // Navigation between steps
	| "form_submit" // Final form submission
	| "manual_save" // Explicit save action
	| "manual_reset"; // Explicit reset action

interface ActionExecutionContext {
	formData: Record<string, any>;
	formId: string;
	currentStep: number;
	totalSteps: number;
	isValid: boolean;
	errors: Record<string, any>;
	metadata: FormMetadata;
}
```

### Action Types

Four core action types handle different form operations:

```typescript
interface SubmitAction {
	type: "submit";
	endpoint: string;
	method: "POST" | "PUT" | "PATCH" | "DELETE";
	headers?: Record<string, string>;
	successMessage?: string;
	errorMessage?: string;
	resetAfterSubmit?: boolean;
	collectMetadata?: boolean;
}

interface AutoSaveDraftAction {
	type: "auto_save_draft";
	mode: "manual" | "interval" | "debounced";
	formId: string;
	intervalMs?: number; // For interval mode
	debounceMs?: number; // For debounced mode
	showNotification?: boolean;
}

interface GTMEventAction {
	type: "gtm_event";
	eventName: string;
	eventData?: Record<string, any>;
	includeFormData?: boolean | string[];
	includeMetadata?: boolean;
}

interface ResetAction {
	type: "reset";
	scope: "form" | "storage" | "all";
	confirmMessage?: string;
}
```

### GDPR Compliance

Built-in consent management for data operations:

```typescript
interface GDPRConsent {
	hasConsent(): boolean;
	grantConsent(): void;
	revokeConsent(): void;
	getConsentDate(): Date | null;
}

// Auto-save actions check consent automatically
function executeAutoSave(action: AutoSaveDraftAction, context: ActionExecutionContext) {
	const gdpr = useGDPRConsent();

	if (!gdpr.hasConsent()) {
		// Show consent prompt
		return;
	}

	// Proceed with save
}
```

## Validation System

### Single Source of Truth

Validation rules are defined once in configuration and auto-generate Zod schemas:

```typescript
interface ValidationRule {
	type: "required" | "email" | "minLength" | "maxLength" | "pattern" | "custom";
	message: string;
	value?: any; // For rules that need a value (minLength, etc.)
}

// Auto-generate Zod schema from validation rules
function generateZodSchema(fieldConfigs: FieldConfig[]): z.ZodSchema {
	const schemaFields: Record<string, z.ZodType> = {};

	for (const field of fieldConfigs) {
		let fieldSchema = z.string();

		for (const rule of field.validation || []) {
			switch (rule.type) {
				case "required":
					fieldSchema = fieldSchema.min(1, rule.message);
					break;
				case "email":
					fieldSchema = fieldSchema.email(rule.message);
					break;
				case "minLength":
					fieldSchema = fieldSchema.min(rule.value, rule.message);
					break;
				// ... other validation types
			}
		}

		schemaFields[field.name] = fieldSchema;
	}

	return z.object(schemaFields);
}
```

## Conditional Logic System

### Constraint-Based Visibility

Fields can be conditionally shown/hidden based on form state:

```typescript
interface ConstraintLogic {
	field: string; // Field to watch
	operator: ConstraintOperator; // Comparison operator
	value: any; // Expected value
	action: ConstraintAction; // Action to take
}

type ConstraintOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "greater_than"
	| "less_than"
	| "is_empty"
	| "is_not_empty";

type ConstraintAction = "show" | "hide" | "enable" | "disable" | "require";

// Constraint evaluation hook
function useConstraintLogic(
	constraints: ConstraintLogic[] | undefined,
	formWatch: any
): ConstraintResult {
	return useMemo(() => {
		if (!constraints) return { isVisible: true, isEnabled: true, isRequired: false };

		const results = constraints.map((constraint) => {
			const fieldValue = formWatch(constraint.field);
			const conditionMet = evaluateConstraint(constraint, fieldValue);

			return {
				action: constraint.action,
				conditionMet,
			};
		});

		return combineConstraintResults(results);
	}, [constraints, formWatch]);
}
```

## Performance Optimizations

### Efficient Re-rendering

The system minimizes re-renders through strategic use of React Hook Form's `useWatch`:

```typescript
// Only watch specific fields needed for constraints
function ConditionalFieldWrapper({ field, children }: Props) {
	const watchedFields = field.constraints?.map((c) => c.field) || [];
	const formWatch = useWatch({ name: watchedFields });
	const { isVisible, isEnabled } = useConstraintLogic(field.constraints, formWatch);

	if (!isVisible) return null;

	return <div data-enabled={isEnabled}>{children}</div>;
}
```

### Tree-Shaking

Only imported field components are included in the bundle:

```typescript
// Development: Import all for convenience
import "@/components/form/registries";

// Production: Selective imports
import "@/components/form/registries/input.registry";
import "@/components/form/registries/select.registry";

// Bundle only includes Input and Select components
```

### Memory Management

Proper cleanup prevents memory leaks:

```typescript
function useFormActions(config: FormConfig, form: UseFormReturn, currentStep: number) {
	useEffect(() => {
		const intervals: NodeJS.Timeout[] = [];
		const timeouts: NodeJS.Timeout[] = [];

		// Set up action triggers

		return () => {
			// Cleanup intervals and timeouts
			intervals.forEach(clearInterval);
			timeouts.forEach(clearTimeout);
		};
	}, [config, currentStep]);
}
```

## Integration Patterns

### External System Integration

The Form Engine integrates with external systems through actions:

```typescript
// GTM Integration
const gtmAction: GTMEventAction = {
	type: "gtm_event",
	eventName: "form_conversion",
	eventData: { source: "website" },
	includeFormData: ["email", "name"], // Selective data inclusion
	includeMetadata: true,
};

// API Integration
const submitAction: SubmitAction = {
	type: "submit",
	endpoint: "/api/forms/submit",
	method: "POST",
	headers: { "Content-Type": "application/json" },
	successMessage: "Form submitted successfully!",
};
```

### State Management

The Form Engine maintains its own state while integrating with React Hook Form:

```typescript
interface FormEngineState {
	currentStep: number;
	formMetadata: FormMetadata;
	actionHistory: ActionExecutionResult[];
	constraintCache: Map<string, ConstraintResult>;
}

// Context provider for form engine state
const FormEngineContext = createContext<{
	state: FormEngineState;
	dispatch: (action: FormEngineAction) => void;
} | null>(null);
```

## Design Benefits

### Maintainability

- **Configuration-driven**: All form logic in declarative configs
- **Type safety**: Compile-time and runtime validation
- **Modular architecture**: Independent, testable components
- **Clear separation**: Rendering, validation, and logic are separate

### Performance

- **Minimal re-renders**: Strategic use of useWatch
- **Tree-shaking**: Only needed components are bundled
- **Lazy loading**: Components and validation load as needed
- **Efficient memory usage**: Proper cleanup and resource management

### Developer Experience

- **Declarative API**: No imperative form building
- **Full TypeScript support**: Complete type inference and safety
- **Comprehensive documentation**: Architecture, API, and usage guides
- **Extensible**: Easy to add custom fields and actions

### Scalability

- **Configuration management**: Centralized form definitions
- **Component reusability**: Shared components across forms
- **Performance optimization**: Built for large, complex forms
- **Integration ready**: Designed for external system integration

The Form Engine architecture provides a solid foundation for building complex, interactive forms while maintaining simplicity for basic use cases. The modular design ensures the system can evolve and scale with changing requirements.
