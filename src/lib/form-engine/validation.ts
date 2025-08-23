import { z } from "zod";

/**
 * Serializable validation rule types
 */
export interface BaseValidationRule {
	type: string;
	message?: string;
}

export interface RequiredRule extends BaseValidationRule {
	type: "required";
	message?: string;
}

export interface MinLengthRule extends BaseValidationRule {
	type: "minLength";
	value: number;
	message?: string;
}

export interface MaxLengthRule extends BaseValidationRule {
	type: "maxLength";
	value: number;
	message?: string;
}

export interface MinRule extends BaseValidationRule {
	type: "min";
	value: number;
	message?: string;
}

export interface MaxRule extends BaseValidationRule {
	type: "max";
	value: number;
	message?: string;
}

export interface EmailRule extends BaseValidationRule {
	type: "email";
	message?: string;
}

export interface PatternRule extends BaseValidationRule {
	type: "pattern";
	value: string; // regex pattern
	message?: string;
}

export interface UrlRule extends BaseValidationRule {
	type: "url";
	message?: string;
}

export interface UuidRule extends BaseValidationRule {
	type: "uuid";
	message?: string;
}

export interface CustomRule extends BaseValidationRule {
	type: "custom";
	validator: string; // function name or identifier
	message?: string;
}

/**
 * Union type for all validation rules
 */
export type ValidationRule =
	| RequiredRule
	| MinLengthRule
	| MaxLengthRule
	| MinRule
	| MaxRule
	| EmailRule
	| PatternRule
	| UrlRule
	| UuidRule
	| CustomRule;

/**
 * Zod schemas for validation rules (for validating the validation config itself)
 */
export const RequiredRuleSchema = z.object({
	type: z.literal("required"),
	message: z.string().optional(),
});

export const MinLengthRuleSchema = z.object({
	type: z.literal("minLength"),
	value: z.number().min(0),
	message: z.string().optional(),
});

export const MaxLengthRuleSchema = z.object({
	type: z.literal("maxLength"),
	value: z.number().min(0),
	message: z.string().optional(),
});

export const MinRuleSchema = z.object({
	type: z.literal("min"),
	value: z.number(),
	message: z.string().optional(),
});

export const MaxRuleSchema = z.object({
	type: z.literal("max"),
	value: z.number(),
	message: z.string().optional(),
});

export const EmailRuleSchema = z.object({
	type: z.literal("email"),
	message: z.string().optional(),
});

export const PatternRuleSchema = z.object({
	type: z.literal("pattern"),
	value: z.string(),
	message: z.string().optional(),
});

export const UrlRuleSchema = z.object({
	type: z.literal("url"),
	message: z.string().optional(),
});

export const UuidRuleSchema = z.object({
	type: z.literal("uuid"),
	message: z.string().optional(),
});

export const CustomRuleSchema = z.object({
	type: z.literal("custom"),
	validator: z.string(),
	message: z.string().optional(),
});

/**
 * Union schema for all validation rules
 */
export const ValidationRuleSchema = z.discriminatedUnion("type", [
	RequiredRuleSchema,
	MinLengthRuleSchema,
	MaxLengthRuleSchema,
	MinRuleSchema,
	MaxRuleSchema,
	EmailRuleSchema,
	PatternRuleSchema,
	UrlRuleSchema,
	UuidRuleSchema,
	CustomRuleSchema,
]);

/**
 * Utility function to check if a field is required based on its validation rules
 */
export function isFieldRequired(validation?: ValidationRule[]): boolean {
	if (!validation || !Array.isArray(validation)) {
		return false;
	}

	return validation.some((rule: ValidationRule) => rule.type === "required");
}

/**
 * Registry for custom validation functions
 */
export class ValidationRegistry {
	private validators = new Map<string, (value: any) => boolean | string>();

	register(name: string, validator: (value: any) => boolean | string) {
		this.validators.set(name, validator);
	}

	get(name: string) {
		return this.validators.get(name);
	}

	has(name: string) {
		return this.validators.has(name);
	}
}

export const defaultValidationRegistry = new ValidationRegistry();

/**
 * Convert serializable validation rules to Zod schema
 */
export function createZodSchema(
	fieldType: "string" | "number" | "boolean" | "array",
	rules: ValidationRule[] = [],
	optional = false
): z.ZodTypeAny {
	let schema: z.ZodTypeAny;

	switch (fieldType) {
		case "string":
			schema = z.string();
			break;
		case "number":
			schema = z.number();
			break;
		case "boolean":
			schema = z.boolean();
			break;
		case "array":
			schema = z.array(z.any());
			break;
		default:
			schema = z.any();
	}

	for (const rule of rules) {
		switch (rule.type) {
			case "required":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).min(1, rule.message || "This field is required");
				} else if (fieldType === "boolean") {
					schema = (schema as z.ZodBoolean).refine((val) => val === true, {
						message: rule.message || "This field is required",
					});
				} else if (fieldType === "array") {
					schema = (schema as z.ZodArray<any>).min(1, rule.message || "This field is required");
				}
				break;

			case "minLength":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).min(
						rule.value,
						rule.message || `Must be at least ${rule.value} characters`
					);
				}
				break;

			case "maxLength":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).max(
						rule.value,
						rule.message || `Must be no more than ${rule.value} characters`
					);
				}
				break;

			case "min":
				if (fieldType === "number") {
					schema = (schema as z.ZodNumber).min(
						rule.value,
						rule.message || `Must be at least ${rule.value}`
					);
				}
				break;

			case "max":
				if (fieldType === "number") {
					schema = (schema as z.ZodNumber).max(
						rule.value,
						rule.message || `Must be no more than ${rule.value}`
					);
				}
				break;

			case "email":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).email(
						rule.message || "Please enter a valid email address"
					);
				}
				break;

			case "url":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).url(rule.message || "Please enter a valid URL");
				}
				break;

			case "uuid":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).uuid(rule.message || "Please enter a valid UUID");
				}
				break;

			case "pattern":
				if (fieldType === "string") {
					schema = (schema as z.ZodString).regex(
						new RegExp(rule.value),
						rule.message || "Invalid format"
					);
				}
				break;

			case "custom": {
				const validator = defaultValidationRegistry.get(rule.validator);
				if (validator) {
					schema = schema.refine(validator, {
						message: rule.message || "Validation failed",
					});
				}
				break;
			}
		}
	}

	if (optional) {
		schema = schema.optional();
	}

	return schema;
}

/**
 * Generate Zod schema from form configuration
 */
export function generateFormSchema(fields: any[]): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodTypeAny> = {};

	function processField(field: any) {
		const { name, type, validation = [] } = field;

		let fieldType: "string" | "number" | "boolean" | "array";

		switch (type) {
			case "input":
			case "textarea":
			case "select":
				fieldType = "string";
				break;
			case "number":
				fieldType = "number";
				break;
			case "checkbox":
			case "switch":
				fieldType = "boolean";
				break;
			case "array":
				fieldType = "array";
				break;
			default:
				fieldType = "string";
		}

		// Check if field is required by looking at validation rules
		const isRequired = validation.some((rule: any) => rule.type === "required");

		schemaFields[name] = createZodSchema(fieldType, validation, !isRequired);
	}

	for (const field of fields) {
		processField(field);

		// Process nested array field elements
		if (field.type === "array" && field.elements) {
			for (const element of field.elements) {
				processField(element);
			}
		}
	}

	return z.object(schemaFields);
}

/**
 * Default validation rule generators for common patterns
 */
export const ValidationPresets = {
	required: (message?: string): RequiredRule => ({
		type: "required",
		message,
	}),

	email: (message?: string): EmailRule => ({
		type: "email",
		message: message || "Please enter a valid email address",
	}),

	minLength: (value: number, message?: string): MinLengthRule => ({
		type: "minLength",
		value,
		message: message || `Must be at least ${value} characters`,
	}),

	maxLength: (value: number, message?: string): MaxLengthRule => ({
		type: "maxLength",
		value,
		message: message || `Must be no more than ${value} characters`,
	}),

	min: (value: number, message?: string): MinRule => ({
		type: "min",
		value,
		message: message || `Must be at least ${value}`,
	}),

	max: (value: number, message?: string): MaxRule => ({
		type: "max",
		value,
		message: message || `Must be no more than ${value}`,
	}),

	pattern: (pattern: string, message?: string): PatternRule => ({
		type: "pattern",
		value: pattern,
		message: message || "Invalid format",
	}),

	url: (message?: string): UrlRule => ({
		type: "url",
		message: message || "Please enter a valid URL",
	}),

	uuid: (message?: string): UuidRule => ({
		type: "uuid",
		message: message || "Please enter a valid UUID",
	}),
};
