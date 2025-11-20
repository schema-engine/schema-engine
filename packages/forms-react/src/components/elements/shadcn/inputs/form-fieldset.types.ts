/**
 * FIELDSET FIELD TYPE
 *
 * Defines schemas and types for fieldset fields that group related fields together.
 * Unlike arrayElements, fieldset creates a single nested object, not an array.
 *
 * ## Use Cases
 * - Address fields (street, city, zip grouped as one)
 * - Credit card details (number, expiry, cvv grouped)
 * - Date ranges (startDate, endDate grouped)
 * - Contact information (phone, email, preferred method grouped)
 *
 * ## Example
 * ```typescript
 * const fieldsetField: FieldSetConfig = {
 *   $type: 'fieldSet',
 *   name: 'billingAddress',
 *   legend: 'Billing Address',
 *   elements: [
 *     { $type: 'input', name: 'street', label: 'Street' },
 *     { $type: 'input', name: 'city', label: 'City' },
 *     { $type: 'input', name: 'zipCode', label: 'ZIP Code' }
 *   ]
 * };
 *
 * // Results in form data:
 * {
 *   billingAddress: {
 *     street: "123 Main St",
 *     city: "New York",
 *     zipCode: "10001"
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

/**
 * FieldSet field extension schema
 */
export const FieldSetExtensionSchema = z.object({
	legend: z.string().optional().describe('Legend text displayed at the top of the fieldset'),
	elements: z.array(z.any()).min(1).describe('Field definitions for the nested object'),
});

/**
 * Complete fieldset field configuration schema
 */
export const FieldSetConfigSchema: z.ZodType<FieldSetConfig> = BaseFieldSchema.extend({
	$type: z.literal('fieldSet'),
	legend: z.string().optional(),
	elements: z.array(z.any()).min(1) as z.ZodType<FormEngine.ElementConfig[]>,
}) as z.ZodType<FieldSetConfig>;

const COMPONENT_ID = 'fieldSet';

/**
 * Factory function to create a runtime validation schema with proper field union
 */
export function createFieldSetRuntimeSchema(registry: {
	createFieldUnionSchema: () => z.ZodSchema<any> | z.ZodNever;
	getFieldTypes: () => any[];
	getRuntimeSchema: (fieldType: any) => z.ZodSchema<any> | undefined;
}): z.ZodSchema<FieldSetConfig> {
	const fieldTypes = registry.getFieldTypes();
	const schemas = fieldTypes.map((type) => registry.getRuntimeSchema(type)).filter(Boolean) as z.ZodSchema<any>[];

	let fieldUnion: z.ZodSchema<any>;

	if (schemas.length === 0) {
		fieldUnion = BaseFieldSchema;
	} else if (schemas.length === 1) {
		fieldUnion = schemas[0];
	} else {
		fieldUnion = z.union(schemas as [z.ZodSchema<any>, z.ZodSchema<any>, ...z.ZodSchema<any>[]]);
	}

	const runtimeExtensionSchema = z.object({
		legend: z.string().optional(),
		elements: z.array(fieldUnion).min(1),
	});

	return BaseFieldSchema.extend({
		$type: z.literal(COMPONENT_ID),
		...runtimeExtensionSchema.shape,
	});
}

/**
 * Type definitions for fieldset
 */
export interface FieldSetExtension {
	legend?: string;
	elements: FormEngine.ElementConfig[];
}

export interface FieldSetConfig extends Omit<z.infer<typeof BaseFieldSchema>, never> {
	$type: 'fieldSet';
	legend?: string;
	elements: FormEngine.ElementConfig[];
}

/**
 * FieldSet field component props interface
 */
export type FieldSetProps = FieldSetConfig & {
	onChange?: (value: unknown) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
