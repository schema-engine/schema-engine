import { z, type GlobalMeta } from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ComponentType } from './component-type';
import { SchemaMetadataCatalog } from './schema-metadata-catalog';
import { generateZodJSONSchemaCollection, generateZodJSONSchemaDocument } from '@/lib/zod-json-schema';
import {
	createStandardJSONSchema,
	createStandardJSONSchemaRecord,
	type JSONSchemaObject,
	type JSONSchemaOptions,
	type JSONSchemaTarget,
	type StandardJSONSchemaV1,
} from '@/lib/standard-json-schema';

/**
 * Metadata for form engine JSON Schema generation.
 * Used across all component types (elements, recipes, and actions).
 */
export interface FormEngineSchemaMetadata extends GlobalMeta {
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
	metadataCatalog?: SchemaMetadataCatalog;
	metadataRegistry: FormEngineSchemaMetadataRegistry;
	formConfigValidator: z.ZodTypeAny;
	jsonSchema: FormEngineJSONSchemaSerializer;
}

type ZodSchemaWithRegister = z.ZodTypeAny & {
	register: (registry: FormEngineSchemaMetadataRegistry, metadata: FormEngineSchemaMetadata) => void;
};

/**
 * Bridge catalog metadata into a Zod registry for JSON Schema generation.
 * Temporary until w2-03 reads jsonSchema from Standard Schema directly.
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

		const zodSchema = schema as ZodSchemaWithRegister;
		if (typeof zodSchema.register === 'function') {
			zodSchema.register(registry, meta);
		} else {
			registry.add(schema as z.ZodTypeAny, meta);
		}
	}

	return registry;
}

/**
 * Serializer contract used by the engine for emitted JSON Schema artifacts.
 * This groups the current JSON Schema collection APIs with the Standard JSON
 * Schema wrappers that are being prepared for later extraction.
 */
export interface FormEngineJSONSchemaSerializer {
	generateCollection: (options?: { target?: JSONSchemaTarget; uri?: (id: string) => string }) => JSONSchemaObject;
	generateFormConfig: (options?: { target?: JSONSchemaTarget }) => JSONSchemaObject;
	generateActionConfig: (actionType: string, options?: { target?: JSONSchemaTarget }) => JSONSchemaObject | undefined;
	formConfigStandardSchema: StandardJSONSchemaV1;
	actionConfigStandardSchemas: Record<string, StandardJSONSchemaV1>;
}

/**
 * Controls how engine schema artifacts are identified and branded when exposed
 * through JSON Schema and Standard JSON Schema APIs.
 *
 * The current defaults preserve the existing `forms` behavior, but the shape is
 * intentionally generic so the serializer layer can be moved later without
 * carrying hardcoded package conventions inside its implementation.
 */
export interface FormEngineSchemaSerializationConfig {
	vendor: string;
	formConfigSchemaId: string;
	actionSchemaId: (actionType: string) => string;
}

/**
 * Default serialization identifiers used by the forms package today.
 */
export const defaultFormEngineSchemaSerializationConfig: FormEngineSchemaSerializationConfig = {
	vendor: '@schema-engine/forms',
	formConfigSchemaId: 'form-config-schema',
	actionSchemaId: (actionType) => `action:${actionType}`,
};

/**
 * Minimal registration shape required to derive schema validators from a
 * runtime component registration.
 */
export interface SchemaValidatorRegistrationLike {
	$type: string;
	schema: StandardSchemaV1<unknown>;
}

/**
 * Derive a stable action-type to validator map from action registrations.
 * The artifact layer only needs the configuration validators, not runtime
 * execution handlers, which keeps this boundary closer to a future internal
 * schema package.
 *
 * JSON Schema emission still expects Zod validators today; registrations may
 * already expose Standard Schema at the type level.
 */
export function createActionConfigValidatorMap<TRegistration extends SchemaValidatorRegistrationLike>(
	actionRegistrations: Iterable<TRegistration>,
): Map<string, z.ZodTypeAny> {
	return new Map(
		Array.from(
			actionRegistrations,
			(registration) => [registration.$type, registration.schema as z.ZodTypeAny] as const,
		),
	);
}

/**
 * Generate the canonical form-config JSON Schema from the current validator.
 * This centralizes `$id` assignment so callers do not need to remember it.
 */
function generateFormConfigJSONSchema(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodTypeAny,
	serializationConfig: FormEngineSchemaSerializationConfig,
	options?: { target?: JSONSchemaTarget },
): JSONSchemaObject {
	return generateZodJSONSchemaDocument(formConfigValidator, metadataRegistry, {
		target: options?.target,
		schemaId: serializationConfig.formConfigSchemaId,
	});
}

/**
 * Create the JSON Schema serializer used by FormEngine schema artifacts.
 * The inputs are intentionally generic enough that the serializer can later be
 * moved out of `forms` without another redesign.
 */
function createFormEngineJSONSchemaSerializer(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodTypeAny,
	serializationConfig: FormEngineSchemaSerializationConfig,
	actionConfigValidators?: Map<string, z.ZodTypeAny>,
): FormEngineJSONSchemaSerializer {
	const generateCollection: FormEngineJSONSchemaSerializer['generateCollection'] = (options) => {
		return generateZodJSONSchemaCollection(metadataRegistry, options);
	};

	const generateFormConfig: FormEngineJSONSchemaSerializer['generateFormConfig'] = (options) => {
		return generateFormConfigJSONSchema(metadataRegistry, formConfigValidator, serializationConfig, options);
	};

	const generateActionConfig: FormEngineJSONSchemaSerializer['generateActionConfig'] = (actionType, options) => {
		const actionConfigValidator = actionConfigValidators?.get(actionType);
		if (!actionConfigValidator) {
			return undefined;
		}

		return generateZodJSONSchemaDocument(actionConfigValidator, metadataRegistry, {
			target: options?.target,
			schemaId: serializationConfig.actionSchemaId(actionType),
		});
	};

	const formConfigStandardSchema = createStandardJSONSchema(serializationConfig.vendor, (options) =>
		generateFormConfig({ target: options.target }),
	);

	const actionConfigStandardSchemas = createStandardJSONSchemaRecord(
		Array.from(actionConfigValidators?.keys() || []),
		serializationConfig.vendor,
		(actionType, options: JSONSchemaOptions) => generateActionConfig(actionType, { target: options.target }),
	);

	return {
		generateCollection,
		generateFormConfig,
		generateActionConfig,
		formConfigStandardSchema,
		actionConfigStandardSchemas,
	};
}

/**
 * Create a schema artifact bundle from the current validator implementation.
 */
export function createFormEngineSchemaArtifacts(
	metadataSource: SchemaMetadataCatalog | FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodTypeAny,
	serializationConfig: FormEngineSchemaSerializationConfig = defaultFormEngineSchemaSerializationConfig,
	actionConfigValidators?: Map<string, z.ZodTypeAny>,
): FormEngineSchemaArtifacts {
	const metadataCatalog = metadataSource instanceof SchemaMetadataCatalog ? metadataSource : undefined;
	const metadataRegistry: FormEngineSchemaMetadataRegistry = metadataCatalog
		? createZodRegistryFromCatalog(metadataCatalog)
		: (metadataSource as FormEngineSchemaMetadataRegistry);

	return {
		metadataCatalog,
		metadataRegistry,
		formConfigValidator,
		jsonSchema: createFormEngineJSONSchemaSerializer(
			metadataRegistry,
			formConfigValidator,
			serializationConfig,
			actionConfigValidators,
		),
	};
}
