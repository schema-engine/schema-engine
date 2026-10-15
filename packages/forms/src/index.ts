/**
 * @schema-engine/forms
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 */

export { createFormEngine, FormEngine, SchemaMetadataCatalog } from './engine';
export { collectStepFieldPaths, effectiveRulesFor, validateFieldValue, validateFormValues } from './engine';
export type { CreateFormEngineOptions } from './engine';
export type {
	EffectiveRulesInput,
	FieldValidationError,
	FormValidationErrors,
	ValidateFieldValueInput,
	ValidateFormValuesInput,
	ValidationElement,
	ValidationElementTree,
	ValidationStep,
} from './engine';
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
	ContainerKind,
} from './types';
export { defineInput, defineStatic } from './types';
export type { ElementRenderProps, WithNormalizedChildren } from './types';
export {
	DEFAULT_WIZARD_RECIPE,
	FormValidationError,
	getRenderableSteps,
	assertFormEngine,
	resolveFormRecipe,
	validateElementConfig,
	validateFormConfig,
} from './lib/validate-form';
export type { RecipeLookup } from './lib/form-view';
export { isNormalizedElementConfig } from './lib/normalized-form-config';
export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from './lib/normalized-form-config';
export type { FormAuthoringInput, FormAuthoringStep, AuthoringElement } from './builder/form-authoring';
export type {
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from './builder/types.utils';
export { ELEMENT_CHILDREN_KEY, elementChildrenSchema, getElementChildren } from './lib/element-children';
export type { ElementChildrenInput, ElementChildrenOutput } from './lib/element-children';
export {
	applyFieldOverlay,
	composeFieldName,
	composeFieldId,
	composeElementKey,
	arrayItemScope,
	objectFieldScope,
	walkNamedElements,
	walkLeafFields,
	collectFieldDefaults,
	flattenStepElements,
} from './lib/field-scope';
export type { FieldScope, FieldNameStrategy, FieldOverlay, NamedElementNode } from './lib/field-scope';
export { getValueAtPath, setValueAtPath, mergePathValues, expandFieldTemplatePaths } from './lib/path-values';
export type { RecipeKind, RecipeSlot, RecipeMetadata, RecipeDescriptor, ViewCatalog } from './recipes/types';
export type { ActionExecutionResult } from '@schema-engine/actions';
export * from './schemas';
export * from './actions';
export * from './constraints';
