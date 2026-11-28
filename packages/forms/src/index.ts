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

export { autoSavePlugin } from './actions/plugins/auto-save.plugin.js';
export type { AutoSaveAction, AutoSavePluginConfig, AutoSaveStorage } from './actions/plugins/auto-save.plugin.js';
export { formResetPlugin } from './actions/plugins/form-reset.plugin.js';
export type { FormResetAction, FormResetPluginConfig } from './actions/plugins/form-reset.plugin.js';
export { formSubmitPlugin } from './actions/plugins/form-submit.plugin.js';
export type { FormSubmitAction, FormSubmitPluginConfig } from './actions/plugins/form-submit.plugin.js';
export { SubmitActionRegistration } from './actions/plugins/form-submit.registration.js';
export { gtmPlugin } from './actions/plugins/gtm.plugin.js';
export type { GTMEventAction, GTMPluginConfig, GTMTrackerInterface } from './actions/plugins/gtm.plugin.js';
export { notificationPlugin } from './actions/plugins/notification.plugin.js';
export type { NotificationAction, NotificationPluginConfig } from './actions/plugins/notification.plugin.js';
export { NotificationActionRegistration } from './actions/plugins/notification.registration.js';
export { FormActionTriggerSchema } from './actions/triggers.js';
export type { FormActionTrigger } from './actions/triggers.js';
export type { ActionExecutionResult, FormActionConfig } from './actions/types.js';
export type { DefaultValuesOf, ValuesOf } from './builder/form-values.js';
export type {
	ActionRegistrationConstraint,
	ElementRegistrationConstraint,
	EngineOutputMaps,
	RecipeRegistrationConstraint,
	ValueEntry,
} from './builder/types.utils.js';
export { createFormEngine } from './engine/create-form-engine.js';
export type {
	CreateFormEngineOptions,
	ExtendFormEngineOptions,
	FormEngineFromOptions,
} from './engine/create-form-engine.js';
export type { FormActionContextFormState } from './engine/form-action-context.js';
export type { FormEngine } from './engine/form-engine.js';
export type { FormEngineRuntime } from './engine/form-engine.js';
export type { FormStepState, StepNavigationMode } from './engine/step-machine.js';
export type { SubmissionSchema, SubmissionSchemaConfig } from './engine/submission-schema.js';
export {
	FormValidationFailure,
	foldFieldParticipation,
	resolveParticipation,
	validateFormValues,
} from './engine/value-validation.js';
export type {
	FieldParticipation,
	Participation,
	ValidationElement,
	ValidationIssue,
	ValidationSeverity,
	ValidationStep,
} from './engine/value-validation.js';
export { createDebounceScope } from './lib/debounce.js';
export type { DebounceScope } from './lib/debounce.js';
export type { DeepReadonly } from './lib/deep-readonly.js';
export { elementChildrenSchema, getElementChildren } from './lib/element-children.js';
export type { ElementChildrenInput, ElementChildrenOutput } from './lib/element-children.js';
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
} from './lib/field-scope.js';
export type { FieldOverlay, FieldScope } from './lib/field-scope.js';
export type { FormFetch } from './lib/form-fetch.js';
export { gridTrackItems } from './lib/grid-track-items.js';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, stepGrid } from './lib/form-view.js';
export {
	getElementContainerKind,
	isNormalizedElementConfig,
	isNormalizedFormConfig,
} from './lib/normalized-form-config.js';
export type {
	FormConfigView,
	NormalizedElementConfig,
	NormalizedFormConfig,
	ValuesBrand,
} from './lib/normalized-form-config.js';
export { getValueAtPath, setValueAtPath } from './lib/path-values.js';
export type { FormValidationIssue, FormValidationResult } from './lib/validate-form/issues.js';
export { FormValidationError } from './lib/validate-form/validation-error.js';
export type { ActionRegistry, ElementRegistry, RecipeRegistry } from './registries/index.js';
export { createFormRuntime, defaultNavigate } from './runtime/create-form-runtime.js';
export type { SubmissionActionResult } from './runtime/submission-lifecycle.js';
export { isSubmissionBusy } from './runtime/types.js';
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
} from './runtime/types.js';
export { BaseFieldSchema } from './schemas/base-field.js';
export type { BaseField, BaseFieldInput, ConstraintLogic, StepConstraint } from './schemas/base-field.js';
export type { ElementConfig, ElementId, GetElementConfig } from './schemas/field-config.js';
export type { FormConfig, FormStep, FormViewConfig } from './schemas/form-config.js';
export { mergeControlProps } from './schemas/html-attributes.js';
export { ValidationRuleError, ValidationSuperseded, ValidationUnavailable } from './schemas/validation/errors.js';
export { ValidationPresets } from './schemas/validation/presets.js';
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
} from './schemas/validation/types.js';
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
} from './schemas/validation/types.js';
export { createValidationContext, getValidationRulesForElement, isFieldRequired } from './schemas/validation/utils.js';
export type { ValidationContextInput } from './schemas/validation/utils.js';
export { createDefaultValidationRegistry, createValidationRegistry } from './schemas/validation/validation-registry.js';
export type {
	RuleCheck,
	ValidationRegistry,
	ValidationRegistryOptions,
} from './schemas/validation/validation-registry.js';
export type { BuilderActionBaseContext, BuilderActionRuntimeContext } from './types/actions.js';
export { defineInput, defineStatic } from './types/define-element.js';
export type { ElementRenderProps } from './types/define-element.js';
export type { ElementMetadata } from './types/metadata.js';
export type {
	AnyActionRegistration,
	AnyElementRegistration,
	AnyRecipeRegistration,
	BuilderActionConfig,
	BuilderActionRegistration,
	ContainerKind,
	ElementChildPaths,
	ElementKind,
	InputRegistration,
	RecipeRegistration,
	StaticRegistration,
	ValueDeclaration,
} from './types/registration.js';
