import type { StandardSchemaV1 } from '@standard-schema/spec';
import { definitionsKeyword, hoistDefinitions, pointerToken } from './json-schema-embedder.js';
import { isPlainObject, readStandardJSONSchema, type JSONSchemaObject, type JSONSchemaTarget } from './json-schema.js';
import { RegistryError } from './registry-error.js';
import type { TreeRegistration } from './tree-types.js';

/**
 * What {@link exportTreeSchema} needs of a registry: the registrations it lists.
 *
 * @remarks
 * Both registry kinds ({@link createRegistry}, {@link BaseRegistry}) provide it. A vocabulary spread over several
 * registries is passed as a list of them.
 */
export interface ExportLookup<TRegistration extends TreeRegistration = TreeRegistration> {
	all(): readonly TRegistration[];
}

/** What a `resolve` function is told about the export it takes part in. */
export interface ExportSchemaContext {
	/** `'input'` is the authored shape, `'output'` the parsed one. */
	readonly io: 'input' | 'output';
	/** The target the document is written for. */
	readonly target: JSONSchemaTarget;
}

/** Options of {@link exportTreeSchema}. */
export interface ExportTreeSchemaOptions {
	/**
	 * The `$type`s the document's root may have. Absent: every `$type` of the lookup.
	 *
	 * @remarks
	 * Each name must be registered in the lookup, and the list must not be empty.
	 */
	readonly accepts?: readonly string[];
	/** Which shape of each schema to write. Default `'input'`, the shape an author writes. */
	readonly io?: 'input' | 'output';
	/** The JSON Schema dialect to write. Default `'draft-2020-12'`. */
	readonly target?: JSONSchemaTarget;
	/**
	 * Writes the JSON Schema of one registration's schema, or returns `undefined` for a schema it cannot write.
	 *
	 * @remarks
	 * The default reads `~standard.jsonSchema`, so any schema library that implements Standard JSON Schema exports
	 * without a function here. Pass one for a library that does not, or to prefer another converter, Zod's own say:
	 * `(schema, { io, target }) => z.toJSONSchema(schema, { io, target })`. The registry takes no validator dependency.
	 * A schema that resolves to `undefined` is listed by an open object, as {@link exportTreeSchema} explains. The
	 * result is not changed.
	 */
	readonly resolve?: (schema: StandardSchemaV1, context: ExportSchemaContext) => JSONSchemaObject | undefined;
}

const DIALECTS: Readonly<Record<string, string>> = {
	'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
	'draft-07': 'http://json-schema.org/draft-07/schema#',
};

const SCHEMA_APPLICATORS = ['$ref', '$dynamicRef', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else'];

const SLOT_ANNOTATIONS = ['title', 'description', 'default', 'examples', 'deprecated', '$comment'];

function defaultResolve(schema: StandardSchemaV1, { io, target }: ExportSchemaContext): JSONSchemaObject | undefined {
	return readStandardJSONSchema(schema)?.[io]({ target });
}

function isLookupList(lookup: ExportLookup | readonly ExportLookup[]): lookup is readonly ExportLookup[] {
	return !('all' in lookup);
}

/**
 * The object a schema is listed by when it cannot be read: a node of its `$type` with its child paths in place, each
 * slot left open for {@link exportTreeSchema} to fill.
 */
function openNode(registration: TreeRegistration): JSONSchemaObject {
	const root: JSONSchemaObject = {
		type: 'object',
		properties: { $type: { const: registration.$type } },
		required: ['$type'],
	};
	for (const { keys } of registration.childPaths ?? []) {
		let current = root;
		keys.forEach((key, index) => {
			const properties = current.properties as Record<string, unknown>;
			const isLast = index === keys.length - 1;
			const existing = properties[key];
			const next = isPlainObject(existing) ? existing : isLast ? {} : { type: 'object', properties: {} };
			properties[key] = next;
			if (!isLast && !isPlainObject(next.properties)) next.properties = {};
			current = next;
		});
	}
	return root;
}

/**
 * Replace the slot a child path names in a registration's JSON Schema, and nothing around it.
 *
 * @remarks
 * `required`, list bounds and every sibling keyword of the slot's parent stay, since the registration's schema owns
 * them. The slot is read by what it is: an array (`type: 'array'` or `items`) gets its `items` replaced, an object
 * (`type: 'object'` or `properties`) becomes the union, and an open slot (no keyword but annotations) becomes the union
 * or a list of it, matching a child or a list of children. Annotations of the slot are kept.
 */
function replaceSlot(
	definition: JSONSchemaObject,
	registration: TreeRegistration,
	keys: readonly string[],
	union: () => JSONSchemaObject,
): void {
	const unreachable = () =>
		new RegistryError(
			'unreachable-child-path',
			`The JSON Schema of '${registration.$type}' has no slot the export can reach for the child path '${keys.join('.')}'. The slot must be a declared property, not behind a reference, allOf or a union, and an object, an array or open.`,
			{ $type: registration.$type, childPath: keys },
		);
	let parent: JSONSchemaObject = definition;
	for (const key of keys.slice(0, -1)) {
		const step: unknown = isPlainObject(parent.properties) ? parent.properties[key] : undefined;
		if (!isPlainObject(step)) throw unreachable();
		parent = step;
	}
	const last = keys[keys.length - 1]!;
	const properties = parent.properties;
	if (!isPlainObject(properties) || !Object.hasOwn(properties, last)) {
		throw unreachable();
	}
	const found = properties[last];
	const slot = found === true ? {} : found;
	if (!isPlainObject(slot)) throw unreachable();
	if (SCHEMA_APPLICATORS.some((keyword) => keyword in slot) || Array.isArray(slot.type)) {
		throw unreachable();
	}
	const annotations = Object.fromEntries(
		SLOT_ANNOTATIONS.filter((key) => key in slot).map((key) => [key, slot[key]]),
	);
	if (slot.type === 'array' || 'items' in slot) {
		slot.items = union();
	} else if (slot.type === 'object' || 'properties' in slot) {
		properties[last] = { ...annotations, ...union() };
	} else if (slot.type === undefined && Object.keys(slot).every((key) => key in annotations)) {
		properties[last] = { ...annotations, anyOf: [union(), { type: 'array', items: union() }] };
	} else {
		throw unreachable();
	}
}

/**
 * Write the JSON Schema of a whole tree of registrations, composed at the JSON Schema level.
 *
 * @param lookup - The registrations to export: a registry, or a list of registries that make up one vocabulary. When
 * two list a `$type`, the first wins, as it does for a lookup that tries them in turn
 * @param options - The root's `accepts`, the `io` and `target` of the schemas, and a `resolve` function, see
 * {@link ExportTreeSchemaOptions}
 * @returns One document, `{ $schema, $defs, anyOf }`: a definition per `$type` under `$defs` (`definitions` for a
 * draft-07 target), and the root as the union of the root's accepted `$type`s
 * @throws {RegistryError} Code `'unreachable-child-path'` when a slot cannot be found where a registration's JSON
 * Schema declares it, `'unknown-accepted-type'` when a child path accepts a `$type` the lookup lacks, and
 * `'definition-name-clash'` when a definition a schema brought along takes the name of a `$type`
 * @throws {Error} When the lookup holds no registration, when `accepts` is empty, and when it names a `$type` the lookup
 * lacks
 *
 * @remarks
 * Each registration's schema is written by `options.resolve`, by default the schema's own `~standard.jsonSchema`, so
 * Zod, Valibot, ArkType and a hand-written schema export the same way and the registry depends on none of them. A
 * schema it cannot write (`resolve` returns `undefined`) is listed by an open object that holds its `$type` and its child
 * paths, so the document still shows where children go.
 *
 * Each child path is then replaced in the definition, and only the slot: `required`, `minItems` and `maxItems`, and the
 * sibling keys stay as the registration's schema wrote them. The slot takes the union of the path's `accepts` as
 * `$ref`s to the definitions, or of every `$type` of the lookup without `accepts`:
 *
 * | Slot in the registration's JSON Schema | Becomes |
 * | --- | --- |
 * | an array (`type: 'array'` or `items`) | the same array, `items: U` |
 * | an object | `U` |
 * | open (`{}`) | `{ anyOf: [U, { type: 'array', items: U }] }`, a child or a list of children |
 *
 * `U` is `{ anyOf: [{ $ref }, ...] }`. A slot the walk cannot reach (behind `allOf`, a `$ref` or a union) throws,
 * since guessing would write a document that disagrees with the registration.
 *
 * A schema that was written as a document of its own is moved into the document: its `$defs` are lifted to the
 * top, named under their owner (`page.address` for the `address` definition of `page`), and every local pointer follows.
 * A `$type` that takes such a name is an error, since the two definitions could not both stay. A name in a `$ref`
 * is a JSON Pointer token (`~` as `~0`, `/` as `~1`) and percent-encoded for the URI fragment.
 */
export function exportTreeSchema(
	lookup: ExportLookup | readonly ExportLookup[],
	options: ExportTreeSchemaOptions = {},
): JSONSchemaObject {
	const { accepts, io = 'input', target = 'draft-2020-12', resolve = defaultResolve } = options;
	const registrations = new Map<string, TreeRegistration>();
	for (const source of isLookupList(lookup) ? lookup : [lookup]) {
		for (const registration of source.all()) {
			if (!registrations.has(registration.$type)) registrations.set(registration.$type, registration);
		}
	}
	if (registrations.size === 0) throw new Error('exportTreeSchema needs at least one registration.');
	if (accepts?.length === 0) throw new Error('accepts must list at least one $type.');
	for (const name of accepts ?? []) {
		if (!registrations.has(name)) throw new Error(`accepts names '${name}', which is not registered.`);
	}

	const keyword = definitionsKeyword(target);
	const reference = (name: string) => ({ $ref: `#/${keyword}/${pointerToken(name)}` });
	const everyType = [...registrations.keys()];
	const unionOf = (names: readonly string[]): JSONSchemaObject => ({ anyOf: names.map(reference) });

	const definitions = new Map<string, JSONSchemaObject>();
	const nestedNames = new Set<string>();
	for (const registration of registrations.values()) {
		const resolved = resolve(registration.schema, { io, target });
		const { definition, nested } = hoistDefinitions(resolved ?? openNode(registration), registration.$type, target);
		for (const { keys, accepts: slotAccepts } of registration.childPaths ?? []) {
			const missing = slotAccepts?.find((name) => !registrations.has(name));
			if (missing !== undefined) {
				throw new RegistryError(
					'unknown-accepted-type',
					`The child path '${keys.join('.')}' of '${registration.$type}' accepts '${missing}', which the lookup does not list. Pass every registry of the vocabulary.`,
					{ $type: registration.$type, childPath: keys, key: missing },
				);
			}
			replaceSlot(definition, registration, keys, () => unionOf(slotAccepts ?? everyType));
		}
		definitions.set(registration.$type, definition);
		for (const [name, schema] of Object.entries(nested)) {
			if (registrations.has(name) || nestedNames.has(name)) {
				throw new RegistryError(
					'definition-name-clash',
					`The definition '${name}' that '${registration.$type}' brought along takes the name of another definition of the export.`,
					{ $type: registration.$type, key: name },
				);
			}
			nestedNames.add(name);
			definitions.set(name, schema);
		}
	}

	const dialect = DIALECTS[target];
	return {
		...(dialect === undefined ? {} : { $schema: dialect }),
		[keyword]: Object.fromEntries(definitions),
		...unionOf(accepts ?? everyType),
	};
}
