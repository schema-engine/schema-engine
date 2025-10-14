/**
 * @json-form-engine/core
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

// New builder pattern exports (v2.0)
export { FormEngineBuilder } from './builder';
export { FormEngine } from './engine';
export type { EngineRegistries, SerializableFormConfig, FormEngineSchemaMetadata } from './engine';
export { SchemaGenerator } from './engine/schema-generator';
export type {
	JSONSchemaOptions,
	FormConfigSchemaOptions,
} from './engine/schema-generator';

// Registry exports for standalone usage
export {
	BaseRegistry,
	ElementRegistry,
	LayoutRegistry,
	StepperRegistry,
	ActionRegistry,
} from './registries';

// Type exports
export type {
	ElementCategory,
	ComponentMetadata,
	ElementMetadata,
	ActionMetadata,
	ElementRegistration,
	LayoutRegistration,
	StepperRegistration,
	BuilderActionRegistration,
	BuilderActionTrigger,
	BuilderActionExecutionContext,
	BuilderActionExecutionResult,
} from './types';

// Existing exports (backwards compatibility)
export * from './schemas';
export * from './actions';
export * from './layouts';
export * from './steppers';
export * from './tools';
export * from './constraints';
