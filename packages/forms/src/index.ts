/**
 * @schema-engine/forms
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

export { FormComposer } from './builder';
export { FormEngine, SchemaMetadataCatalog } from './engine';
export type {
	EngineRegistries,
	FormEngineSchemaArtifacts,
	FormEngineSchemaMetadata,
	SchemaMetadataEntry,
} from './engine';
export { ElementRegistry, RecipeRegistry } from './registries';
export type {
	BuilderActionBaseContext,
	ElementMetadata,
	BuilderActionRegistration,
	BuilderActionTrigger,
	BuilderActionExecutionContext,
	BuilderActionRuntimeContext,
	InputRegistration,
	StaticRegistration,
	RecipeRegistration,
} from './types';
export {
	DEFAULT_WIZARD_RECIPE,
	FormValidationError,
	getRenderableSteps,
	resolveFormRecipe,
	resolveValidatedConfig,
	validateFormConfig,
	isValidatedFormConfig,
} from './lib/validate-form';
export type { RecipeLookup } from './lib/validate-form';
export type { FormAuthoringInput, FormAuthoringStep } from './builder/form-authoring';
export type { RecipeKind, RecipeSlot, RecipeMetadata, RecipeDescriptor, ViewCatalog } from './recipes/types';
export type { ActionExecutionResult } from '@schema-engine/actions';
export * from './schemas';
export * from './actions';
export * from './tools';
export * from './constraints';
