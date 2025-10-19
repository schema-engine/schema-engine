/**
 * @json-form-engine/core
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

export { FormEngineBuilder } from './builder';
export { FormEngine } from './engine';
export type { EngineRegistries, FormEngineSchemaMetadata } from './engine';
export { SchemaGenerator } from './engine/schema-generator';
export type {
	JSONSchemaOptions,
	FormConfigSchemaOptions,
} from './engine/schema-generator';

export {
	BaseRegistry,
	ElementRegistry,
	LayoutRegistry,
	StepperRegistry,
	ActionRegistry,
} from './registries';

export type {
	ComponentMetadata,
	ElementMetadata,
	ActionMetadata,
	BuilderActionRegistration,
	BuilderActionTrigger,
	BuilderActionExecutionContext,
	BuilderActionExecutionResult,
	ComponentRegistration,
	InputRegistration,
	StaticRegistration,
	LayoutRegistration,
	StepperRegistration,
} from './types';

export * from './schemas';
export * from './actions';
export * from './layouts';
export * from './steppers';
export * from './tools';
export * from './constraints';
