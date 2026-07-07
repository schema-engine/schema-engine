import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';
import { GridLayoutConfigSchema } from '@/schemas/base-field';

const VENDOR = '@schema-engine/forms';

type RegistrationLike = {
	$type: string;
	schema: StandardSchemaV1;
};

type ObjectField = {
	key: string;
	schema: StandardSchemaV1;
	optional?: boolean;
	defaultValue?: unknown;
};

function syncValidate<T>(schema: StandardSchemaV1<T>, value: unknown) {
	const result = schema['~standard'].validate(value);
	if (result && typeof (result as Promise<unknown>).then === 'function') {
		throw new Error('Async Standard Schema validation is not supported in this context');
	}
	return result as StandardSchemaV1.Result<T>;
}

export function createNeverSchema(message = 'No matching schema'): StandardSchemaV1<never> {
	return {
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate() {
				return { issues: [{ message }] };
			},
		},
	};
}

export function createAnySchema(): StandardSchemaV1<unknown> {
	return {
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value) {
				return { value };
			},
		},
	};
}

export function createStringSchema(): StandardSchemaV1<string> {
	return {
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value) {
				if (typeof value !== 'string') {
					return { issues: [{ message: 'Expected string' }] };
				}
				return { value };
			},
		},
	};
}

export function createEnumSchema<T extends string>(values: readonly T[]): StandardSchemaV1<T> {
	const allowed = new Set<string>(values);
	return {
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value) {
				if (typeof value !== 'string' || !allowed.has(value)) {
					return { issues: [{ message: `Expected one of: ${values.join(', ')}` }] };
				}
				return { value: value as T };
			},
		},
	};
}

export function createArraySchema<T>(itemSchema: StandardSchemaV1<T>): StandardSchemaV1<T[]> {
	return {
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value) {
				if (!Array.isArray(value)) {
					return { issues: [{ message: 'Expected array' }] };
				}

				const output: T[] = [];
				const issues: StandardSchemaV1.Issue[] = [];

				for (let index = 0; index < value.length; index++) {
					const itemResult = syncValidate(itemSchema, value[index]);
					if (itemResult.issues?.length) {
						for (const issue of itemResult.issues) {
							issues.push({
								...issue,
								path: [index, ...(issue.path ?? [])],
							});
						}
						continue;
					}
					if ('value' in itemResult) {
						output.push(itemResult.value as T);
					}
				}

				if (issues.length) {
					return { issues };
				}

				return { value: output };
			},
		},
	};
}

export function createObjectSchema<T extends Record<string, unknown>>(
	fields: ObjectField[],
	vendor = VENDOR,
): StandardSchemaV1<T> {
	return {
		'~standard': {
			version: 1,
			vendor,
			validate(value) {
				if (!value || typeof value !== 'object' || Array.isArray(value)) {
					return { issues: [{ message: 'Expected object' }] };
				}

				const record = value as Record<string, unknown>;
				const output: Record<string, unknown> = { ...record };
				const issues: StandardSchemaV1.Issue[] = [];

				for (const field of fields) {
					let fieldValue = record[field.key];
					if (fieldValue === undefined && field.defaultValue !== undefined) {
						fieldValue = field.defaultValue;
					}

					if (fieldValue === undefined) {
						if (!field.optional) {
							issues.push({ message: 'Required', path: [field.key] });
						}
						continue;
					}

					const fieldResult = syncValidate(field.schema, fieldValue);
					if (fieldResult.issues?.length) {
						for (const issue of fieldResult.issues) {
							issues.push({
								...issue,
								path: [field.key, ...(issue.path ?? [])],
							});
						}
						continue;
					}

					if ('value' in fieldResult) {
						output[field.key] = fieldResult.value;
					}
				}

				if (issues.length) {
					return { issues };
				}

				return { value: output as T };
			},
		},
	};
}

export function createDiscriminatedUnionSchema<T extends RegistrationLike>(
	registrations: T[],
	options?: { discriminator?: string; vendor?: string; unknownMessage?: string },
): StandardSchemaV1 {
	const byType = new Map(registrations.map((registration) => [registration.$type, registration.schema]));
	const discriminator = options?.discriminator ?? '$type';

	if (registrations.length === 0) {
		return createNeverSchema(options?.unknownMessage ?? 'No schemas registered');
	}

	if (registrations.length === 1) {
		return registrations[0].schema;
	}

	return {
		'~standard': {
			version: 1,
			vendor: options?.vendor ?? VENDOR,
			validate(value) {
				if (!value || typeof value !== 'object') {
					return { issues: [{ message: 'Expected object' }] };
				}

				const record = value as Record<string, unknown>;
				const typeValue = record[discriminator];
				if (typeof typeValue !== 'string') {
					return { issues: [{ message: `Missing ${discriminator}`, path: [discriminator] }] };
				}

				const schema = byType.get(typeValue);
				if (!schema) {
					return {
						issues: [
							{
								message: options?.unknownMessage ?? `Unknown ${discriminator}: ${typeValue}`,
								path: [discriminator],
							},
						],
					};
				}

				return syncValidate(schema, value);
			},
		},
	};
}

const gridLayoutSchema = GridLayoutConfigSchema as StandardSchemaV1;

export function createFormConfigSchemaFromRegistries(
	input: {
		elements: RegistrationLike[];
		layouts: RegistrationLike[];
		steppers: RegistrationLike[];
		actions: RegistrationLike[];
	},
	zodJsonBridge?: z.ZodTypeAny,
): StandardSchemaV1 {
	const elementsUnion = createDiscriminatedUnionSchema(input.elements, {
		unknownMessage: 'Unknown element $type',
	});
	const layoutsUnion = createDiscriminatedUnionSchema(input.layouts, {
		unknownMessage: 'Unknown layout $type',
	});
	const steppersUnion = createDiscriminatedUnionSchema(input.steppers, {
		unknownMessage: 'Unknown stepper $type',
	});
	const actionsUnion = createDiscriminatedUnionSchema(input.actions, {
		unknownMessage: 'Unknown action $type',
	});

	const layoutFieldSchema = input.layouts.length > 0 ? layoutsUnion : createNeverSchema('No layouts registered');
	const stepperFieldSchema = input.steppers.length > 0 ? steppersUnion : createNeverSchema('No steppers registered');

	const formStepSchema = createObjectSchema([
		{ key: 'id', schema: createStringSchema() },
		{ key: 'title', schema: createStringSchema() },
		{ key: 'description', schema: createStringSchema(), optional: true },
		{ key: 'icon', schema: createStringSchema(), optional: true },
		{ key: 'layout', schema: layoutFieldSchema, optional: true },
		{ key: 'elements', schema: createArraySchema(elementsUnion) },
		{ key: 'rules', schema: createAnySchema(), optional: true },
		{ key: 'constraints', schema: createArraySchema(createAnySchema()), optional: true },
		{ key: 'className', schema: createStringSchema(), optional: true },
		{ key: 'style', schema: createAnySchema(), optional: true },
		{ key: 'onStepEnter', schema: createArraySchema(actionsUnion), optional: true },
		{ key: 'onStepLeave', schema: createArraySchema(actionsUnion), optional: true },
		{ key: 'onStepValidate', schema: createArraySchema(actionsUnion), optional: true },
		{ key: 'actions', schema: createArraySchema(actionsUnion), optional: true },
	]);

	const validator = createObjectSchema([
		{ key: 'id', schema: createStringSchema() },
		{ key: 'title', schema: createStringSchema(), optional: true },
		{ key: 'description', schema: createStringSchema(), optional: true },
		{ key: 'steps', schema: createArraySchema(formStepSchema) },
		{ key: 'stepper', schema: stepperFieldSchema, optional: true },
		{ key: 'grid', schema: gridLayoutSchema, optional: true },
		{
			key: 'mode',
			schema: createEnumSchema(['wizard', 'free'] as const),
			optional: true,
			defaultValue: 'wizard',
		},
		{
			key: 'validationMode',
			schema: createEnumSchema(['onSubmit', 'onChange', 'onBlur', 'all'] as const),
			optional: true,
		},
		{
			key: 'reValidateMode',
			schema: createEnumSchema(['onSubmit', 'onChange', 'onBlur'] as const),
			optional: true,
		},
		{ key: 'className', schema: createStringSchema(), optional: true },
		{ key: 'style', schema: createAnySchema(), optional: true },
		{ key: 'actions', schema: createArraySchema(actionsUnion), optional: true },
	]);

	if (!zodJsonBridge) {
		return validator;
	}

	return withZodJsonSchemaBridge(validator, zodJsonBridge);
}

function withZodJsonSchemaBridge(validator: StandardSchemaV1, zodJsonBridge: z.ZodTypeAny): StandardSchemaV1 {
	const zodJsonSchema = zodJsonBridge['~standard']?.jsonSchema;

	return {
		'~standard': {
			...validator['~standard'],
			jsonSchema: zodJsonSchema ?? {
				input: (options) =>
					z.toJSONSchema(zodJsonBridge, { target: options.target }) as Record<string, unknown>,
				output: (options) =>
					z.toJSONSchema(zodJsonBridge, { target: options.target }) as Record<string, unknown>,
			},
		},
	} as StandardSchemaV1;
}
