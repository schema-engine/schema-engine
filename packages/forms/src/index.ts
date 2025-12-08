/**
 * @schema-engine/forms
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

export { FormComposer } from './builder';
export { FormEngine } from './engine';
export type { EngineRegistries, FormEngineSchemaMetadata } from './engine';

export { BaseRegistry, ElementRegistry, LayoutRegistry, StepperRegistry } from './registries';

export type {
	ComponentMetadata,
	ElementMetadata,
	BuilderActionRegistration,
	BuilderActionTrigger,
	BuilderActionExecutionContext,
	ComponentRegistration,
	InputRegistration,
	StaticRegistration,
	LayoutRegistration,
	StepperRegistration,
} from './types';

export type { ActionExecutionResult } from '@schema-engine/actions';

export * from './schemas';
export * from './actions';
export * from './layouts';
export * from './steppers';
export * from './tools';
export * from './constraints';
