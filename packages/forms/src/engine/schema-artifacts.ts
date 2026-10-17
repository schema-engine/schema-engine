import * as z from 'zod/mini';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import type { AnyActionRegistration } from '@/types/registration';
import { ComponentType } from './component-type';
import { SchemaMetadataCatalog } from './schema-metadata-catalog';
import { generateZodJSONSchemaCollection, generateZodJSONSchemaDocument, isZodType } from '@/lib/zod-json-schema';
import {
	createStandardJSONSchema,
	createStandardJSONSchemaRecord,
	type JSONSchemaObject,
	type JSONSchemaTarget,
} from '@/lib/standard-json-schema';

/**
 * Metadata for form engine JSON Schema generation.
 * Used across all component types (elements, recipes, and actions).
 */
export interface FormEngineSchemaMetadata {
	id?: string;
	title?: string;
	description?: string;
	componentType: ComponentType;
	category?: string;
	examples?: unknown[];
}

/**
 * Metadata registry used by the schema artifact layer.
 */
export type FormEngineSchemaMetadataRegistry = ReturnType<typeof z.registry<FormEngineSchemaMetadata>>;

/**
 * Bundles the validator and metadata registry used for schema generation.
 * The engine depends on this abstraction instead of hard-coding JSON Schema
 * conversion details into runtime methods.
 */
export interface FormEngineSchemaArtifacts {
	metadataCatalog: SchemaMetadataCatalog;
	metadataRegistry: FormEngineSchemaMetadataRegistry;
	formConfigValidator: z.ZodMiniType;
	jsonSchema: FormEngineJSONSchemaSerializer;
}

type ZodSchemaWithRegister = z.ZodMiniType & {
	register: (registry: FormEngineSchemaMetadataRegistry, metadata: FormEngineSchemaMetadata) => void;
};

/**
 * Bridge catalog metadata into a Zod registry for JSON Schema generation.
 */
export function createZodRegistryFromCatalog(catalog: SchemaMetadataCatalog): FormEngineSchemaMetadataRegistry {
	const registry = z.registry<FormEngineSchemaMetadata>();

	for (const { schema, entry } of catalog.getRegisteredSchemas()) {
		const meta: FormEngineSchemaMetadata = {
			id: entry.id,
			title: entry.title,
			description: entry.description,
			componentType: entry.componentType,
			category: entry.category,
		};

		if (!isZodType(schema)) {
			continue;
		}

		const zodSchema = schema as ZodSchemaWithRegister;
		if (typeof zodSchema.register === 'function') {
			zodSchema.register(registry, meta);
		} else {
			registry.add(zodSchema, meta);
		}
	}

	return registry;
}

/**
 * Serializer contract used by the engine for emitted JSON Schema artifacts.
 * Exposes collections and per-configuration input/output converters.
 */
export interface FormEngineJSONSchemaSerializer {
	generateCollection: (options?: {
		target?: JSONSchemaTarget;
		uri?: (id: string) => string;
		io?: 'input' | 'output';
	}) => JSONSchemaObject;
	generateFormConfig: (options?: { target?: JSONSchemaTarget; io?: 'input' | 'output' }) => JSONSchemaObject;
	generateActionConfig: (
		actionType: string,
		options?: { target?: JSONSchemaTarget; io?: 'input' | 'output' },
	) => JSONSchemaObject | undefined;
	formConfigStandardSchema: StandardJSONSchemaV1;
	actionConfigStandardSchemas: Record<string, StandardJSONSchemaV1>;
}

const VENDOR = '@schema-engine/forms';
const FORM_CONFIG_SCHEMA_ID = 'form-config-schema';

/** Extract Zod-compatible action validators for JSON Schema conversion. */
export function createActionConfigValidatorMap(
	actionRegistrations: Iterable<AnyActionRegistration>,
): Map<string, z.ZodMiniType> {
	return new Map(
		Array.from(actionRegistrations)
			.filter((registration) => isZodType(registration.schema))
			.map((registration) => [registration.$type, registration.schema as z.ZodMiniType] as const),
	);
}

function generateFormConfigJSONSchemaForIO(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodMiniType,
	io: 'input' | 'output',
	options?: { target?: JSONSchemaTarget },
): JSONSchemaObject {
	return generateZodJSONSchemaDocument(formConfigValidator, metadataRegistry, {
		target: options?.target,
		io,
		schemaId: FORM_CONFIG_SCHEMA_ID,
	});
}

/**
 * Create the JSON Schema serializer used by FormEngine schema artifacts.
 */
function createFormEngineJSONSchemaSerializer(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodMiniType,
	actionConfigValidators?: Map<string, z.ZodMiniType>,
): FormEngineJSONSchemaSerializer {
	const generateCollection: FormEngineJSONSchemaSerializer['generateCollection'] = (options) => {
		return generateZodJSONSchemaCollection(metadataRegistry, options);
	};

	const generateFormConfig: FormEngineJSONSchemaSerializer['generateFormConfig'] = (options) => {
		return generateFormConfigJSONSchemaForIO(
			metadataRegistry,
			formConfigValidator,
			options?.io ?? 'output',
			options,
		);
	};

	const generateActionSchema = (
		actionType: string,
		options?: { target?: JSONSchemaTarget; io?: 'input' | 'output' },
	): JSONSchemaObject | undefined => {
		const validator = actionConfigValidators?.get(actionType);
		return validator
			? generateZodJSONSchemaDocument(validator, metadataRegistry, {
					target: options?.target,
					io: options?.io,
					schemaId: SchemaMetadataCatalog.entryId(ComponentType.Action, actionType),
				})
			: undefined;
	};

	const formConfigStandardSchema = createStandardJSONSchema(
		VENDOR,
		(options) =>
			generateFormConfigJSONSchemaForIO(metadataRegistry, formConfigValidator, 'input', {
				target: options.target,
			}),
		(options) =>
			generateFormConfigJSONSchemaForIO(metadataRegistry, formConfigValidator, 'output', {
				target: options.target,
			}),
	);

	const actionConfigStandardSchemas = createStandardJSONSchemaRecord(
		Array.from(actionConfigValidators?.keys() || []),
		VENDOR,
		(actionType, options) => generateActionSchema(actionType, { target: options.target, io: 'input' }),
		(actionType, options) => generateActionSchema(actionType, { target: options.target, io: 'output' }),
	);

	return {
		generateCollection,
		generateFormConfig,
		generateActionConfig: generateActionSchema,
		formConfigStandardSchema,
		actionConfigStandardSchemas,
	};
}

/**
 * Create a schema artifact bundle from the current validator implementation.
 */
export function createFormEngineSchemaArtifacts(
	metadataCatalog: SchemaMetadataCatalog,
	formConfigValidator: z.ZodMiniType,
	actionConfigValidators?: Map<string, z.ZodMiniType>,
): FormEngineSchemaArtifacts {
	const metadataRegistry = createZodRegistryFromCatalog(metadataCatalog);
	return {
		metadataCatalog,
		metadataRegistry,
		formConfigValidator,
		jsonSchema: createFormEngineJSONSchemaSerializer(metadataRegistry, formConfigValidator, actionConfigValidators),
	};
}
