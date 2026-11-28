import type { StandardSchemaV1 } from '@standard-schema/spec';
import { createJSONSchemaEmbedder, definitionRef, definitionsKeyword, startsResource } from './json-schema/embedder.js';
import { replaceChildSlot } from './json-schema/slot.js';
import {
	getOwn,
	isPlainObject,
	readStandardJSONSchema,
	setOwn,
	type JSONSchemaObject,
	type JSONSchemaTarget,
} from './json-schema/standard.js';
import { RegistryError } from './registry-error.js';
import type { TreeRegistration } from './tree-types.js';

/**
 * What {@link exportTreeSchema} needs of a registry: the registrations it lists.
 *
 * @remarks
 * Both registry kinds ({@link createRegistry}, {@link createMutableRegistry}) provide it. A vocabulary spread over several
 * registries is passed as a list of them.
 */
export interface ExportLookup {
	all(): readonly TreeRegistration[];
}

/** The two dialects {@link exportTreeSchema} knows the `$schema` and the definitions keyword of. */
type TreeSchemaTarget = Extract<JSONSchemaTarget, 'draft-2020-12' | 'draft-07'>;

/** What a `resolve` function is told about the export it takes part in. */
export interface ExportSchemaContext {
	/** `'input'` is the authored shape, `'output'` the parsed one. */
	readonly io: 'input' | 'output';
	/** The target the document is written for. */
	readonly target: TreeSchemaTarget;
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
	/**
	 * The JSON Schema dialect to write. Default `'draft-2020-12'`.
	 *
	 * @remarks
	 * Any other value throws before a schema is read, since a document without `$schema`, or with the wrong keyword for
	 * its definitions, would be written silently.
	 */
	readonly target?: TreeSchemaTarget;
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

const DIALECTS: Readonly<Record<TreeSchemaTarget, string>> = {
	'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
	'draft-07': 'http://json-schema.org/draft-07/schema#',
};

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
			const existing = getOwn(properties, key);
			const next = isPlainObject(existing) ? existing : isLast ? {} : { type: 'object', properties: {} };
			setOwn(properties, key, next);
			if (!isLast && !isPlainObject(getOwn(next, 'properties'))) next.properties = {};
			current = next;
		});
	}
	return root;
}

/**
 * The error for a registration whose own JSON Schema is a resource of its own (it sets an `$id`), so the references
 * written into it would resolve against that `$id` and not against the document.
 */
function unreachableSlot($type: string, keys: readonly string[]): RegistryError {
	return new RegistryError(
		'unreachable-child-path',
		`The JSON Schema of '${$type}' sets an $id of its own, so the export cannot reach the child path '${keys.join('.')}': a $ref written there resolves against that $id, not against the document.`,
		{ $type, childPath: keys },
	);
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
 * `'definition-name-clash'` when a definition a schema brought along takes the name of a `$type` or of another definition
 * @throws {Error} When `target` is not `'draft-2020-12'` or `'draft-07'`, before any schema is read, when the lookup
 * holds no registration, when `accepts` is empty, and when it names a `$type` the lookup lacks
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
 * | an array (`type: 'array'`, `items` or `prefixItems`) | the same array, `items: U`, and `U` at each tuple position |
 * | an object | `U` |
 * | open (`{}`) | `{ anyOf: [U, { type: 'array', items: U }] }`, a child or a list of children |
 *
 * `U` is `{ anyOf: [{ $ref }, ...] }`. A slot the walk cannot reach (behind `allOf`, a `$ref` or a union, or inside
 * a schema with an `$id` of its own) throws, since guessing would write a document that disagrees with the registration.
 *
 * A schema that was written as a document of its own is moved into the document by
 * {@link createJSONSchemaEmbedder}, and every local pointer follows. Its `$defs` are lifted to the top as
 * `<owner>.<name>` (`page.address` for the `address` definition of `page`), and each anchor is renamed
 * `<owner part>-<name>`. Both write the owner so that two owners never write the same name: in a lifted name each `.`
 * and `_` of the `$type` is `_2e_` and `_5f_` (`a.b` with `c` is `a_2e_b.c`, `a` with `b.c` is `a.b.c`), and in an anchor
 * the owner part is `o` and the `$type` with every character outside `[A-Za-z0-9.]` written as `_<hex>_`
 * (`ui/button` with `x` is `oui_2f_button-x`). A name that is still taken, by a `$type` say, is an error, since the two
 * definitions could not both stay. A name in a `$ref` is a JSON Pointer token (`~` as `~0`, `/` as `~1`) and
 * percent-encoded for the URI fragment.
 */
export function exportTreeSchema(
	lookup: ExportLookup | readonly ExportLookup[],
	options: ExportTreeSchemaOptions = {},
): JSONSchemaObject {
	const { accepts, io = 'input', target = 'draft-2020-12', resolve = defaultResolve } = options;
	if (!Object.hasOwn(DIALECTS, target)) {
		throw new Error(`exportTreeSchema writes 'draft-2020-12' or 'draft-07', not '${target}'.`);
	}
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
	const reference = (name: string) => ({ $ref: definitionRef(target, name) });
	const everyType = [...registrations.keys()];
	const unionOf = (names: readonly string[]): JSONSchemaObject => ({ anyOf: names.map(reference) });

	const embedder = createJSONSchemaEmbedder(target, { kind: 'document' });
	const definitions = new Map<string, JSONSchemaObject>();
	for (const registration of registrations.values()) {
		const resolved = resolve(registration.schema, { io, target });
		const definition = embedder.embedDefinition(resolved ?? openNode(registration), registration.$type);
		for (const { keys, accepts: slotAccepts, list } of registration.childPaths ?? []) {
			if (startsResource(definition)) throw unreachableSlot(registration.$type, keys);
			const missing = slotAccepts?.find((name) => !registrations.has(name));
			if (missing !== undefined) {
				throw new RegistryError(
					'unknown-accepted-type',
					`The child path '${keys.join('.')}' of '${registration.$type}' accepts '${missing}', which the lookup does not list. Pass every registry of the vocabulary.`,
					{ $type: registration.$type, childPath: keys, key: missing },
				);
			}
			replaceChildSlot(definition, { $type: registration.$type, keys, list }, unionOf(slotAccepts ?? everyType));
		}
		definitions.set(registration.$type, definition);
	}

	return embedder.finish({
		$schema: DIALECTS[target],
		[keyword]: Object.fromEntries(definitions),
		...unionOf(accepts ?? everyType),
	});
}
