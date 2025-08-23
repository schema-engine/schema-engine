import { z } from "zod";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import type { ValidationRule } from "../validation";
import { FormActionConfigSchema, type FormActionConfig } from "../actions/types";

export type { FormActionConfig } from "../actions/types";

/**
 * Responsive breakpoint configuration for grid layout
 */
export const GridBreakpointConfigSchema = z.object({
	columns: z.union([z.number(), z.literal("auto")]).optional(),
	rows: z.union([z.number(), z.literal("auto")]).optional(),
	gap: z.union([z.number(), z.string()]).optional(),
	minColumnWidth: z.string().optional(),
	maxColumnWidth: z.string().optional(),
});

/**
 * Form step configuration
 */
export type FormStepConfig = {
	id: string;
	title?: string;
	description?: string;
	fields: FieldConfig[];
	validation?: z.ZodSchema<any>;
	actions?: FormActionConfig[]; // Use unified action type
};

/**
 * Field-level responsive breakpoint configuration
 */
export const FieldGridBreakpointSchema = z.object({
	column: z.union([z.number(), z.string()]).optional(),
	row: z.union([z.number(), z.string()]).optional(),
	justifySelf: z.enum(["start", "end", "center", "stretch"]).optional(),
	alignSelf: z.enum(["start", "end", "center", "stretch"]).optional(),
	hidden: z.boolean().optional(),
});

/**
 * Grid layout configuration schema
 */
export const GridLayoutConfigSchema = z.object({
	columns: z.union([z.number(), z.literal("auto")]).optional(),
	rows: z.union([z.number(), z.literal("auto")]).optional(),
	gap: z.union([z.number(), z.string()]).optional(),
	responsive: z
		.object({
			default: GridBreakpointConfigSchema.optional(),
			sm: GridBreakpointConfigSchema.optional(),
			md: GridBreakpointConfigSchema.optional(),
			lg: GridBreakpointConfigSchema.optional(),
			xl: GridBreakpointConfigSchema.optional(),
			"2xl": GridBreakpointConfigSchema.optional(),
		})
		.optional(),
	autoFit: z.boolean().optional(),
	autoFill: z.boolean().optional(),
	minColumnWidth: z.string().optional(),
	maxColumnWidth: z.string().optional(),
	justifyItems: z.enum(["start", "end", "center", "stretch"]).optional(),
	alignItems: z.enum(["start", "end", "center", "stretch"]).optional(),
	placeItems: z.string().optional(),
	justifyContent: z
		.enum(["start", "end", "center", "stretch", "space-around", "space-between", "space-evenly"])
		.optional(),
	alignContent: z
		.enum(["start", "end", "center", "stretch", "space-around", "space-between", "space-evenly"])
		.optional(),
	placeContent: z.string().optional(),
});

/**
 * Field-level grid positioning configuration schema
 */
export const FieldGridConfigSchema = z.object({
	column: z.union([z.number(), z.string()]).optional(),
	row: z.union([z.number(), z.string()]).optional(),
	responsive: z
		.object({
			default: FieldGridBreakpointSchema.optional(),
			sm: FieldGridBreakpointSchema.optional(),
			md: FieldGridBreakpointSchema.optional(),
			lg: FieldGridBreakpointSchema.optional(),
			xl: FieldGridBreakpointSchema.optional(),
			"2xl": FieldGridBreakpointSchema.optional(),
		})
		.optional(),
	justifySelf: z.enum(["start", "end", "center", "stretch"]).optional(),
	alignSelf: z.enum(["start", "end", "center", "stretch"]).optional(),
	placeSelf: z.string().optional(),
});

/**
 * Constraint logic configuration schema
 */
export const ConstraintLogicSchema = z.object({
	field: z.string(),
	operator: z.enum([
		"equals",
		"not_equals",
		"contains",
		"not_contains",
		"greater_than",
		"less_than",
		"is_empty",
		"is_not_empty",
	]),
	value: z.any(),
	action: z.enum(["show", "hide", "enable", "disable", "require"]),
});

/**
 * Base field configuration schema that all field types extend
 */
export const BaseFieldConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
	description: z.string().optional(),
	disabled: z.boolean().optional(),
	readonly: z.boolean().optional(),
	placeholder: z.string().optional(),
	defaultValue: z.any().optional(),
	validation: z.array(z.any()).optional(), // Will be validated by ValidationRuleSchema
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	constraints: z.array(z.lazy(() => ConstraintLogicSchema)).optional(),
	grid: FieldGridConfigSchema.optional(),
});

/**
 * Input field configuration schema
 */
export const InputFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("input"),
	inputType: z.enum(["text", "email", "password", "url", "tel", "search"]),
	maxLength: z.number().optional(),
	minLength: z.number().optional(),
	pattern: z.string().optional(),
	autoComplete: z.string().optional(),
	autoFocus: z.boolean().optional(),
});

/**
 * Number field configuration schema
 */
export const NumberFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("number"),
	min: z.number().optional(),
	max: z.number().optional(),
	step: z.number().optional(),
	precision: z.number().optional(),
});

/**
 * Textarea field configuration schema
 */
export const TextareaFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("textarea"),
	rows: z.number().optional(),
	cols: z.number().optional(),
	maxLength: z.number().optional(),
	minLength: z.number().optional(),
	resize: z.enum(["none", "both", "horizontal", "vertical"]).optional(),
});

/**
 * Select option schema
 */
export const SelectOptionSchema = z.object({
	value: z.union([z.string(), z.number()]),
	label: z.string(),
	disabled: z.boolean().optional(),
});

/**
 * Select field configuration schema
 */
export const SelectFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("select"),
	options: z.array(SelectOptionSchema),
	multiple: z.boolean().optional(),
	searchable: z.boolean().optional(),
	clearable: z.boolean().optional(),
});

/**
 * Checkbox field configuration schema
 */
export const CheckboxFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("checkbox"),
	checked: z.boolean().optional(),
});

/**
 * Radio group field configuration schema
 */
export const RadioFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("radio"),
	options: z.array(SelectOptionSchema),
	orientation: z.enum(["horizontal", "vertical"]).optional(),
});

/**
 * Date field configuration schema
 */
export const DateFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("date"),
	dateType: z.enum(["date", "datetime-local", "time"]),
	min: z.string().optional(),
	max: z.string().optional(),
	showCalendar: z.boolean().optional(),
});

/**
 * File upload field configuration schema
 */
export const FileFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("file"),
	accept: z.string().optional(),
	multiple: z.boolean().optional(),
	maxSize: z.number().optional(),
	maxFiles: z.number().optional(),
});

/**
 * Switch/Toggle field configuration schema
 */
export const SwitchFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("switch"),
	checked: z.boolean().optional(),
	size: z.enum(["sm", "md", "lg"]).optional(),
});

/**
 * Inferred types from schemas (define types first to avoid circular references)
 */
export type BaseFieldConfig = z.infer<typeof BaseFieldConfigSchema> & {
	validation?: ValidationRule[];
};
export type InputFieldConfig = z.infer<typeof InputFieldConfigSchema>;
export type NumberFieldConfig = z.infer<typeof NumberFieldConfigSchema>;
export type TextareaFieldConfig = z.infer<typeof TextareaFieldConfigSchema>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
export type SelectFieldConfig = z.infer<typeof SelectFieldConfigSchema>;
export type CheckboxFieldConfig = z.infer<typeof CheckboxFieldConfigSchema>;
export type RadioFieldConfig = z.infer<typeof RadioFieldConfigSchema>;
export type DateFieldConfig = z.infer<typeof DateFieldConfigSchema>;
export type FileFieldConfig = z.infer<typeof FileFieldConfigSchema>;
export type SwitchFieldConfig = z.infer<typeof SwitchFieldConfigSchema>;

/**
 * Array field configuration type
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
	type: "array";
	elements: FieldConfig[]; // Changed to array to support multiple field types
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	keyName?: string;
}

/**
 * Union type for all field configurations
 */
export type FieldConfig =
	| InputFieldConfig
	| NumberFieldConfig
	| TextareaFieldConfig
	| SelectFieldConfig
	| CheckboxFieldConfig
	| RadioFieldConfig
	| DateFieldConfig
	| FileFieldConfig
	| SwitchFieldConfig
	| ArrayFieldConfig;

/**
 * Array field configuration schema
 */
export const ArrayFieldConfigSchema = BaseFieldConfigSchema.extend({
	type: z.literal("array"),
	elements: z.array(z.lazy(() => FieldConfigSchema)),
	minItems: z.number().optional(),
	maxItems: z.number().optional(),
	addButtonText: z.string().optional(),
	removeButtonText: z.string().optional(),
	keyName: z.string().default("id"),
});

/**
 * Union schema for all field configurations
 */
export const FieldConfigSchema: z.ZodSchema<FieldConfig> = z.discriminatedUnion("type", [
	InputFieldConfigSchema,
	NumberFieldConfigSchema,
	TextareaFieldConfigSchema,
	SelectFieldConfigSchema,
	CheckboxFieldConfigSchema,
	RadioFieldConfigSchema,
	DateFieldConfigSchema,
	FileFieldConfigSchema,
	SwitchFieldConfigSchema,
	z.lazy(() => ArrayFieldConfigSchema),
]);

/**
 * Common props that all field components receive
 */
export interface FieldProps<T extends FieldConfig = FieldConfig> {
	config: T;
	form: UseFormReturn<FieldValues>;
	value?: any;
	onChange?: (value: any) => void;
	onBlur?: () => void;
	error?: string;
	fieldPath: FieldPath<FieldValues>;
}

/**
 * Props for field wrapper component
 */
export interface FieldWrapperConfig {
	config: FieldConfig;
	children: React.ReactNode;
	error?: string;
	showLabel?: boolean;
	showDescription?: boolean;
}

/**
 * Layout configuration schema
 */
export const LayoutConfigSchema = z.object({
	type: z.enum(["group", "grid", "tabs", "accordion", "collapsible"]),
	title: z.string().optional(),
	description: z.string().optional(),
	columns: z.number().optional(),
	gap: z.number().optional(),
	className: z.string().optional(),
	constraints: z.array(ConstraintLogicSchema).optional(),
});

/**
 * Step navigation button configuration schema
 */
export const StepNavigationButtonSchema = z.object({
	label: z.string(),
	variant: z.enum(["primary", "secondary", "outline", "ghost"]).optional(),
	className: z.string().optional(),
	disabled: z.boolean().optional(),
	hidden: z.boolean().optional(),
	constraints: z.array(ConstraintLogicSchema).optional(),
	customHandler: z.string().optional(), // Function name or identifier for custom handlers
});

/**
 * Step navigation configuration schema
 */
export const StepNavigationConfigSchema = z.object({
	showStepNumbers: z.boolean().optional().default(true),
	showStepTitles: z.boolean().optional().default(true),
	orientation: z.enum(["horizontal", "vertical"]).optional().default("horizontal"),
	variant: z
		.enum(["default", "pills", "arrows", "dots", "minimal", "compact"])
		.optional()
		.default("default"),
	position: z.enum(["top", "bottom", "left", "right"]).optional().default("top"),
	buttons: z
		.object({
			previous: StepNavigationButtonSchema.optional(),
			next: StepNavigationButtonSchema.optional(),
			submit: StepNavigationButtonSchema.optional(),
			custom: z.record(z.string(), StepNavigationButtonSchema).optional(),
		})
		.optional(),
	allowStepJumping: z.boolean().optional().default(false),
	validateOnNext: z.boolean().optional().default(true),
	className: z.string().optional(),
});

/**
 * Form step schema for multi-step forms - now contains fields directly
 */
export const FormStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	fields: z.array(FieldConfigSchema),
	validation: z.any().optional(),
	constraints: z.array(ConstraintLogicSchema).optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	onStepEnter: z.array(FormActionConfigSchema).optional(), // Actions to run when entering step
	onStepLeave: z.array(FormActionConfigSchema).optional(), // Actions to run when leaving step
	onStepValidate: z.array(FormActionConfigSchema).optional(), // Actions to run for step validation
	actions: z.array(FormActionConfigSchema).optional(), // General step actions
});

/**
 * Extended field config schema that includes step information
 */
export const ExtendedFieldConfigSchema = FieldConfigSchema.and(
	z.object({
		step: z.string().optional(), // Which step this field belongs to
	})
);

/**
 * Complete form configuration schema
 */
export const FormConfigSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	steps: z.array(FormStepSchema),
	layout: z.array(LayoutConfigSchema).optional(),
	grid: GridLayoutConfigSchema.optional(),
	stepper: StepNavigationConfigSchema.optional(),
	mode: z.enum(["wizard", "free"]).optional().default("wizard"),
	autoGenerateSchema: z.boolean().optional().default(true),
	validation: z.any().optional(),
	onSubmit: z.any().optional(),
	onChange: z.any().optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	actions: z.array(FormActionConfigSchema).optional(),
});

/**
 * Inferred types from schemas
 */
export type GridBreakpointConfig = z.infer<typeof GridBreakpointConfigSchema>;
export type FieldGridBreakpoint = z.infer<typeof FieldGridBreakpointSchema>;
export type GridLayoutConfig = z.infer<typeof GridLayoutConfigSchema>;
export type FieldGridConfig = z.infer<typeof FieldGridConfigSchema>;
export type ConstraintLogic = z.infer<typeof ConstraintLogicSchema>;
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type StepNavigationButton = z.infer<typeof StepNavigationButtonSchema>;
export type StepNavigationConfig = z.infer<typeof StepNavigationConfigSchema>;
export type FormStep = z.infer<typeof FormStepSchema>;
export type ExtendedFieldConfig = z.infer<typeof ExtendedFieldConfigSchema>;
export type FormConfig = z.infer<typeof FormConfigSchema>;

/**
 * Stepper variant options
 */
export type StepperVariant = "default" | "minimal" | "compact";

/**
 * Stepper orientation options
 */
export type StepperOrientation = "horizontal" | "vertical";

/**
 * Stepper validation mode options
 */
export type StepperValidationMode = "wizard" | "free";

/**
 * Handler types for custom stepper functionality
 */
export interface StepHandlers {
	onStepEnter?: (stepId: string, stepIndex: number, formData: any) => void | Promise<void>;
	onStepLeave?: (stepId: string, stepIndex: number, formData: any) => boolean | Promise<boolean>;
	onStepValidate?: (stepId: string, stepIndex: number, formData: any) => boolean | Promise<boolean>;
	customNavigationHandlers?: Record<
		string,
		(stepId: string, stepIndex: number, formData: any) => void | Promise<void>
	>;
}

/**
 * Stepper context data
 */
export interface StepperContextData {
	currentStep: number;
	totalSteps: number;
	steps: FormStep[];
	isFirstStep: boolean;
	isLastStep: boolean;
	canGoNext: boolean;
	canGoPrevious: boolean;
	goToStep: (step: number) => void | Promise<void>;
	goToNext: () => void | Promise<void>;
	goToPrevious: () => void | Promise<void>;
	validateCurrentStep: () => boolean | Promise<boolean>;
	getStepData: (stepIndex?: number) => any;
	handlers?: StepHandlers;
	validationMode?: StepperValidationMode;
}
