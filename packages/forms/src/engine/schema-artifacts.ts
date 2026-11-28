import * as z from 'zod/mini';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import { assertJSONSchemaTarget } from '@schema-engine/registry/json-schema';
import { ComponentType } from './component-type';
import { composeCollectionChildSlots, composeDocumentChildSlots, type ChildSlotOwner } from './child-slots';
import { SchemaMetadataCatalog } from './schema-metadata-catalog';
import { isZodType } from '@/lib/is-zod-type';
import {
	defaultCollectionURI,
	generateZodJSONSchemaCollection,
	generateZodJSONSchemaDocument,
} from '@/lib/zod-json-schema';
import {
	createStandardJSONSchema,
	createStandardJSONSchemaRecord,
	type JSONSchemaObject,
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
	/**
	 * The schemas the JSON Schema export lists in place of a registration's own, by catalog id.
	 *
	 * @remarks
	 * An element's or recipe's export schema is closed over the appearance axes it declares. The
	 * catalog keeps the registration's validator schema, so this holds the export's alone.
	 */
	exportSchemas: ReadonlyMap<string, z.ZodMiniType>;
	jsonSchema: FormEngineJSONSchemaSerializer;
}

type ZodSchemaWithRegister = z.ZodMiniType & {
	register: (registry: FormEngineSchemaMetadataRegistry, metadata: FormEngineSchemaMetadata) => void;
};

/**
 * A schema the JSON Schema export defines once and refers to by its id, though it is no registration of the catalog.
 *
 * @remarks Without an id a schema is written out at every place that uses it.
 */
export interface SharedExportSchema {
	readonly schema: z.ZodMiniType;
	readonly metadata: FormEngineSchemaMetadata;
}

/**
 * Bridge catalog metadata into a Zod registry for JSON Schema generation.
 *
 * @remarks
 * An entry with an export schema is registered by that schema rather than the catalog's, so the
 * export refers to it by the entry's id.
 */
export function createZodRegistryFromCatalog(
	catalog: SchemaMetadataCatalog,
	exportSchemas: ReadonlyMap<string, z.ZodMiniType> = new Map(),
): FormEngineSchemaMetadataRegistry {
	const registry = z.registry<FormEngineSchemaMetadata>();

	for (const { schema: catalogSchema, entry } of catalog.getRegisteredSchemas()) {
		const schema = exportSchemas.get(entry.id) ?? catalogSchema;
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

/** The Zod schemas the JSON Schema export lists the actions by, keyed by `$type`. */
export function createActionConfigValidatorMap(
	exportedActions: Iterable<{ $type: string; exportSchema: unknown }>,
): Map<string, z.ZodMiniType> {
	return new Map(
		Array.from(exportedActions)
			.filter((action) => isZodType(action.exportSchema))
			.map((action) => [action.$type, action.exportSchema as z.ZodMiniType] as const),
	);
}

/**
 * The target of a Standard JSON Schema converter's options.
 *
 * @remarks
 * The Standard JSON Schema type leaves the target open so that a converter may support more than the four this one
 * does, and a converter refuses a target it does not support. This one throws before any schema is converted.
 */
function targetOf(options: StandardJSONSchemaV1.Options): JSONSchemaTarget {
	assertJSONSchemaTarget(options.target);
	return options.target;
}

function generateFormConfigJSONSchemaForIO(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodMiniType,
	elements: readonly ChildSlotOwner[],
	io: 'input' | 'output',
	options?: { target?: JSONSchemaTarget },
): JSONSchemaObject {
	const target = options?.target ?? 'draft-2020-12';
	const document = generateZodJSONSchemaDocument(formConfigValidator, metadataRegistry, {
		target,
		io,
		schemaId: FORM_CONFIG_SCHEMA_ID,
	});
	composeDocumentChildSlots(document, elements, target);
	return document;
}

/**
 * Create the JSON Schema serializer used by FormEngine schema artifacts.
 */
function createFormEngineJSONSchemaSerializer(
	metadataRegistry: FormEngineSchemaMetadataRegistry,
	formConfigValidator: z.ZodMiniType,
	elements: readonly ChildSlotOwner[],
	actionConfigValidators?: Map<string, z.ZodMiniType>,
): FormEngineJSONSchemaSerializer {
	const generateCollection: FormEngineJSONSchemaSerializer['generateCollection'] = (options) => {
		const uri = options?.uri ?? defaultCollectionURI;
		const collection = generateZodJSONSchemaCollection(metadataRegistry, { ...options, uri });
		composeCollectionChildSlots(collection, elements, uri);
		return collection;
	};

	const generateFormConfig: FormEngineJSONSchemaSerializer['generateFormConfig'] = (options) => {
		return generateFormConfigJSONSchemaForIO(
			metadataRegistry,
			formConfigValidator,
			elements,
			options?.io ?? 'input',
			options,
		);
	};

	const generateActionSchema = (
		actionType: string,
		options?: { target?: JSONSchemaTarget; io?: 'input' | 'output' },
	): JSONSchemaObject | undefined => {
		if (options?.target !== undefined) assertJSONSchemaTarget(options.target);
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
			generateFormConfigJSONSchemaForIO(metadataRegistry, formConfigValidator, elements, 'input', {
				target: targetOf(options),
			}),
		(options) =>
			generateFormConfigJSONSchemaForIO(metadataRegistry, formConfigValidator, elements, 'output', {
				target: targetOf(options),
			}),
	);

	const actionConfigStandardSchemas = createStandardJSONSchemaRecord(
		Array.from(actionConfigValidators?.keys() || []),
		VENDOR,
		(actionType, options) => generateActionSchema(actionType, { target: targetOf(options), io: 'input' }),
		(actionType, options) => generateActionSchema(actionType, { target: targetOf(options), io: 'output' }),
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
	elements: readonly ChildSlotOwner[],
	actionConfigValidators?: Map<string, z.ZodMiniType>,
	exportSchemas: ReadonlyMap<string, z.ZodMiniType> = new Map(),
	sharedSchemas: readonly SharedExportSchema[] = [],
): FormEngineSchemaArtifacts {
	const metadataRegistry = createZodRegistryFromCatalog(metadataCatalog, exportSchemas);
	for (const { schema, metadata } of sharedSchemas) metadataRegistry.add(schema, metadata);
	return {
		metadataCatalog,
		metadataRegistry,
		exportSchemas,
		jsonSchema: createFormEngineJSONSchemaSerializer(
			metadataRegistry,
			formConfigValidator,
			elements,
			actionConfigValidators,
		),
	};
}
