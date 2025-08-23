import type { FormConfig, FieldConfig, ConstraintLogic } from "./types/form";
import { ValidationRuleSchema, type ValidationRule } from "./validation";

/**
 * Serializable form configuration (JSON-safe)
 */
export interface SerializableFormConfig {
	id: string;
	title?: string;
	description?: string;
	steps: SerializableStepConfig[];
	layout?: any[];
	autoGenerateSchema?: boolean;
	mode?: "wizard" | "free";
	className?: string;
	style?: Record<string, any>;
}

/**
 * Serializable step configuration (JSON-safe)
 */
export interface SerializableStepConfig {
	id: string;
	title?: string;
	description?: string;
	icon?: string;
	fields: SerializableFieldConfig[];
}

/**
 * Serializable field configuration (JSON-safe)
 */
export interface SerializableFieldConfig {
	type: string;
	id: string;
	name: string;
	label?: string;
	description?: string;
	required?: boolean;
	disabled?: boolean;
	readonly?: boolean;
	placeholder?: string;
	defaultValue?: any;
	validation?: ValidationRule[];
	className?: string;
	style?: React.CSSProperties;
	constraints?: ConstraintLogic[];

	// Type-specific properties
	inputType?: string;
	rows?: number;
	cols?: number;
	min?: number | string; // number for numeric fields, string for date fields
	max?: number | string; // number for numeric fields, string for date fields
	step?: number;
	precision?: number;
	maxLength?: number;
	minLength?: number;
	pattern?: string;
	autoComplete?: string;
	autoFocus?: boolean;
	resize?: "none" | "both" | "horizontal" | "vertical";
	options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
	multiple?: boolean;
	searchable?: boolean;
	clearable?: boolean;
	checked?: boolean;
	orientation?: "horizontal" | "vertical";
	dateType?: "date" | "datetime-local" | "time";
	showCalendar?: boolean;
	accept?: string;
	maxSize?: number;
	maxFiles?: number;
	size?: "sm" | "md" | "lg";
	elements?: SerializableFieldConfig[];
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	keyName?: string;
}

/**
 * Serialize a form configuration to JSON
 */
export function serializeFormConfig(config: FormConfig): string {
	const serializable: SerializableFormConfig = {
		id: config.id,
		title: config.title,
		description: config.description,
		autoGenerateSchema: config.autoGenerateSchema,
		mode: config.mode,
		className: config.className,
		style: config.style,
		layout: config.layout,
		steps: config.steps.map((step) => ({
			id: step.id,
			title: step.title,
			description: step.description,
			icon: step.icon,
			fields: step.fields?.map(serializeFieldConfig) || [],
		})),
	};

	return JSON.stringify(serializable, null, 2);
}

/**
 * Serialize a field configuration
 */
function serializeFieldConfig(field: FieldConfig): SerializableFieldConfig {
	// Helper function to determine if field is required from validation rules
	const isRequired =
		field.validation?.some(
			(validation: any) => validation?.type === "required" || validation?.rule === "required"
		) || false;

	const base: SerializableFieldConfig = {
		type: field.type,
		id: field.id,
		name: field.name,
		label: field.label,
		description: field.description,
		required: isRequired,
		disabled: field.disabled,
		readonly: field.readonly,
		placeholder: field.placeholder,
		defaultValue: field.defaultValue,
		validation: field.validation,
		className: field.className,
		style: field.style,
		constraints: field.constraints,
	};

	// Add type-specific properties
	switch (field.type) {
		case "input":
			return {
				...base,
				inputType: field.inputType,
				maxLength: field.maxLength,
				minLength: field.minLength,
				pattern: field.pattern,
				autoComplete: field.autoComplete,
				autoFocus: field.autoFocus,
			};

		case "number":
			return {
				...base,
				min: field.min,
				max: field.max,
				step: field.step,
				precision: field.precision,
			};

		case "textarea":
			return {
				...base,
				rows: field.rows,
				cols: field.cols,
				maxLength: field.maxLength,
				minLength: field.minLength,
				resize: field.resize,
			};

		case "select":
			return {
				...base,
				options: field.options?.map((opt) => ({
					value: opt.value,
					label: opt.label,
					disabled: opt.disabled,
				})),
				multiple: field.multiple,
				searchable: field.searchable,
				clearable: field.clearable,
			};

		case "checkbox":
			return {
				...base,
				checked: field.checked,
			};

		case "radio":
			return {
				...base,
				options: field.options?.map((opt) => ({
					value: opt.value,
					label: opt.label,
					disabled: opt.disabled,
				})),
				orientation: field.orientation,
			};

		case "date":
			return {
				...base,
				dateType: field.dateType,
				min: field.min,
				max: field.max,
				showCalendar: field.showCalendar,
			};

		case "file":
			return {
				...base,
				accept: field.accept,
				multiple: field.multiple,
				maxSize: field.maxSize,
				maxFiles: field.maxFiles,
			};

		case "switch":
			return {
				...base,
				checked: field.checked,
				size: field.size,
			};

		case "array":
			return {
				...base,
				elements: field.elements.map(serializeFieldConfig), // Map over array elements
				minItems: field.minItems,
				maxItems: field.maxItems,
				addButtonText: field.addButtonText,
				removeButtonText: field.removeButtonText,
				keyName: field.keyName,
			};

		default:
			return base;
	}
}

/**
 * Deserialize a form configuration from JSON
 */
export function deserializeFormConfig(json: string): FormConfig {
	const parsed: SerializableFormConfig = JSON.parse(json);

	// Validate the structure
	if (!parsed.id || !parsed.steps || !Array.isArray(parsed.steps)) {
		throw new Error("Invalid form configuration: missing required fields");
	}

	// Validate step configurations
	for (const step of parsed.steps) {
		if (!step.id || !step.fields || !Array.isArray(step.fields)) {
			throw new Error(`Invalid step configuration: ${JSON.stringify(step)}`);
		}

		// Validate field configurations
		for (const field of step.fields) {
			if (!field.type || !field.id || !field.name) {
				throw new Error(`Invalid field configuration: ${JSON.stringify(field)}`);
			}

			// Validate validation rules if present
			if (field.validation) {
				for (const rule of field.validation) {
					const result = ValidationRuleSchema.safeParse(rule);
					if (!result.success) {
						throw new Error(`Invalid validation rule: ${JSON.stringify(rule)}`);
					}
				}
			}
		}
	}

	return {
		id: parsed.id,
		title: parsed.title,
		description: parsed.description,
		autoGenerateSchema: parsed.autoGenerateSchema ?? true,
		mode: parsed.mode ?? "free",
		className: parsed.className,
		style: parsed.style,
		layout: parsed.layout,
		steps: parsed.steps.map((step) => ({
			id: step.id,
			title: step.title || step.id, // Use id as fallback title
			description: step.description,
			icon: step.icon,
			fields: step.fields as FieldConfig[],
		})),
	};
}

/**
 * Validate a serializable form configuration
 */
export function validateSerializableConfig(config: SerializableFormConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!config.id) {
		errors.push("Form configuration must have an id");
	}

	if (!config.steps || !Array.isArray(config.steps)) {
		errors.push("Form configuration must have a steps array");
		return { valid: false, errors };
	}

	for (const [stepIndex, step] of config.steps.entries()) {
		if (!step.id) {
			errors.push(`Step at index ${stepIndex} must have an id`);
		}
		if (!step.fields || !Array.isArray(step.fields)) {
			errors.push(`Step at index ${stepIndex} must have a fields array`);
			continue;
		}

		for (const [fieldIndex, field] of step.fields.entries()) {
			if (!field.type) {
				errors.push(`Field at step ${stepIndex}, field index ${fieldIndex} must have a type`);
			}
			if (!field.id) {
				errors.push(`Field at step ${stepIndex}, field index ${fieldIndex} must have an id`);
			}
			if (!field.name) {
				errors.push(`Field at step ${stepIndex}, field index ${fieldIndex} must have a name`);
			}

			// Validate validation rules
			if (field.validation) {
				for (const [ruleIndex, rule] of field.validation.entries()) {
					const result = ValidationRuleSchema.safeParse(rule);
					if (!result.success) {
						errors.push(
							`Invalid validation rule at step ${stepIndex}, field ${fieldIndex}, rule ${ruleIndex}: ${result.error.message}`
						);
					}
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}
