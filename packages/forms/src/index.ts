/**
 * @schema-engine/forms
 *
 * A comprehensive form engine with advanced validation, actions, and tools.
 * Tree-shakable library designed for maximum flexibility and performance.
 *
 * @remarks
 * The root lists what the bindings, the registry widgets and an application need, by name. Anything else a module
 * of the package holds is internal, so a symbol has one import path: here, or the entry that owns it
 * (`/state-container`, `/recipes`, `/csrf`, `/server-errors`, `/browser`, `/testing`, `/agent-tool`).
 */

export { autoSavePlugin } from './actions/plugins/auto-save.plugin';
export type { AutoSaveAction, AutoSavePluginConfig, AutoSaveStorage } from './actions/plugins/auto-save.plugin';
export { formResetPlugin } from './actions/plugins/form-reset.plugin';
export type { FormResetAction, FormResetPluginConfig } from './actions/plugins/form-reset.plugin';
export { formSubmitPlugin } from './actions/plugins/form-submit.plugin';
export type { FormSubmitAction, FormSubmitPluginConfig } from './actions/plugins/form-submit.plugin';
export { SubmitActionRegistration } from './actions/plugins/form-submit.registration';
export { gtmPlugin } from './actions/plugins/gtm.plugin';
export type { GTMEventAction, GTMPluginConfig, GTMTrackerInterface } from './actions/plugins/gtm.plugin';
export { notificationPlugin } from './actions/plugins/notification.plugin';
export type { NotificationAction, NotificationPluginConfig } from './actions/plugins/notification.plugin';
export { NotificationActionRegistration } from './actions/plugins/notification.registration';
export { FormActionTriggerSchema } from './actions/triggers';
export type { FormActionTrigger } from './actions/triggers';
export type { ActionExecutionResult, FormActionConfig } from './actions/types';
export type { DefaultValuesOf, ValuesOf } from './builder/form-values';
export type {
	ActionRegistrationConstraint,
	ElementRegistrationConstraint,
	EngineOutputMaps,
	RecipeRegistrationConstraint,
	ValueEntry,
} from './builder/types.utils';
export { createFormEngine } from './engine/create-form-engine';
export type {
	CreateFormEngineOptions,
	ExtendFormEngineOptions,
	FormEngineFromOptions,
} from './engine/create-form-engine';
export type { FormActionContextFormState } from './engine/form-action-context';
export { FormEngine } from './engine/form-engine';
export type { FormEngineRuntime } from './engine/form-engine';
export type { FormStepState, StepNavigationMode } from './engine/step-machine';
export type { SubmissionSchema, SubmissionSchemaConfig } from './engine/submission-schema';
export {
	FormValidationFailure,
	foldFieldParticipation,
	resolveParticipation,
	validateFormValues,
} from './engine/value-validation';
export type {
	FieldParticipation,
	Participation,
	ValidationElementTree,
	ValidationIssue,
	ValidationSeverity,
	ValidationStep,
} from './engine/value-validation';
export { createDebounceScope } from './lib/debounce';
export type { DebounceScope } from './lib/debounce';
export type { DeepReadonly } from './lib/deep-readonly';
export { elementChildrenSchema, getElementChildren } from './lib/element-children';
export type { ElementChildrenInput, ElementChildrenOutput } from './lib/element-children';
export {
	applyFieldOverlay,
	arrayItemScope,
	collectInitialValues,
	composeElementKey,
	composeFieldId,
	composeFieldName,
	createArrayRowDefault,
	flattenStepElements,
	objectFieldScope,
	seedArrayRows,
	usesScalarArrayItem,
} from './lib/field-scope';
export type { FieldOverlay, FieldScope } from './lib/field-scope';
export type { FormFetch } from './lib/form-fetch';
export { gridTrackItems } from './lib/grid-track-items';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, stepGrid } from './lib/form-view';
export {
	getElementContainerKind,
	isNormalizedElementConfig,
	isNormalizedFormConfig,
	markNormalizedElementConfig,
	markNormalizedFormConfig,
} from './lib/normalized-form-config';
export type {
	FormConfigView,
	NormalizedElementConfig,
	NormalizedFormConfig,
	ValuesBrand,
} from './lib/normalized-form-config';
export { getValueAtPath, setValueAtPath } from './lib/path-values';
export { validateRegistrationConfig } from './lib/standard-schema';
export type { FormValidationIssue, FormValidationResult } from './lib/validate-form/issues';
export type { ValidateFormOptions } from './lib/validate-form/options';
export { FormValidationError } from './lib/validate-form/validation-error';
export type { ActionRegistrationRegistry, ElementRegistry, RecipeRegistry } from './registries';
export { createFormRuntime, defaultNavigate } from './runtime/create-form-runtime';
export type { SubmissionActionResult } from './runtime/submission-lifecycle';
export { isSubmissionBusy } from './runtime/types';
export type {
	CreateFormRuntimeOptions,
	FormRuntime,
	FormRuntimeConfig,
	FormRuntimeHost,
	FormRuntimeOutcome,
	FormRuntimeSnapshot,
	FormRuntimeStep,
	FormSubmissionState,
	FormSubmitHelpers,
	FormValues,
	FormWizard,
	NavigationOutcome,
	SubmissionStatus,
	SubmitOutcome,
} from './runtime/types';
export { BaseFieldSchema } from './schemas/base-field';
export type { BaseField, BaseFieldInput, ConstraintLogic, StepConstraint } from './schemas/base-field';
export type { ElementConfig, ElementId, GetElementConfig } from './schemas/field-config';
export type { FormConfig, FormStep, FormViewConfig } from './schemas/form-config';
export { mergeControlProps } from './schemas/html-attributes';
export { ValidationSuperseded, ValidationUnavailable } from './schemas/validation/errors';
export { ValidationPresets } from './schemas/validation/presets';
export {
	AsyncRuleSchema,
	Base64RuleSchema,
	BaseValidationRuleSchema,
	CidrRuleSchema,
	Cuid2RuleSchema,
	CuidRuleSchema,
	DateRuleSchema,
	DateTimeRuleSchema,
	EmailRuleSchema,
	HashRuleSchema,
	HexRuleSchema,
	Ipv4RuleSchema,
	Ipv6RuleSchema,
	JwtRuleSchema,
	MaxItemsRuleSchema,
	MaxLengthRuleSchema,
	MaxRuleSchema,
	MinItemsRuleSchema,
	MinLengthRuleSchema,
	MinRuleSchema,
	PatternRuleSchema,
	PhoneRuleSchema,
	RelateRuleSchema,
	RequiredRuleSchema,
	TimeRuleSchema,
	UlidRuleSchema,
	UrlRuleSchema,
	UuidRuleSchema,
	ValidationRuleSchema,
} from './schemas/validation/types';
export type {
	AsyncRule,
	Base64Rule,
	BaseValidationRule,
	CidrRule,
	Cuid2Rule,
	CuidRule,
	DateRule,
	DateTimeRule,
	EmailRule,
	HashRule,
	HexRule,
	Ipv4Rule,
	Ipv6Rule,
	JwtRule,
	MaxItemsRule,
	MaxLengthRule,
	MaxRule,
	MinItemsRule,
	MinLengthRule,
	MinRule,
	PatternRule,
	PhoneRule,
	RelateRule,
	RelationAssert,
	RequiredRule,
	TimeRule,
	UlidRule,
	UrlRule,
	UuidRule,
	ValidationContext,
	ValidationRegistration,
	ValidationRegistrationConstraint,
	ValidationRule,
	ValidationScope,
} from './schemas/validation/types';
export { createValidationContext, getValidationRulesForElement, isFieldRequired } from './schemas/validation/utils';
export type { ValidationContextInput } from './schemas/validation/utils';
export { createDefaultValidationRegistry, createValidationRegistry } from './schemas/validation/validation-registry';
export type {
	RuleCheck,
	ValidationRegistry,
	ValidationRegistryOptions,
} from './schemas/validation/validation-registry';
export type { BuilderActionBaseContext, BuilderActionRuntimeContext } from './types/actions';
export { defineInput, defineStatic } from './types/define-element';
export type { ElementRenderProps } from './types/define-element';
export type { ElementMetadata } from './types/metadata';
export type {
	AnyActionRegistration,
	AnyElementRegistration,
	AnyRecipeRegistration,
	BuilderActionConfig,
	BuilderActionRegistration,
	ContainerKind,
	ElementKind,
	InputRegistration,
	RecipeRegistration,
	StaticRegistration,
	ValueDeclaration,
} from './types/registration';
