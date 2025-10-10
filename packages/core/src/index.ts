/**
 * @json-form-engine/core
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

// New builder pattern exports (v2.0)
export { FormEngineBuilder } from './builder';
export { FormEngine } from './engine';
export type { EngineRegistries, SerializableFormConfig } from './engine';
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
