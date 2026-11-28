import { RegistryError, type ChildPath, type JSONSchemaTarget } from '@schema-engine/registry';
import {
	definitionRef,
	definitionsKeyword,
	replaceChildSlot,
	startsResource,
} from '@schema-engine/registry/json-schema';
import type { JSONSchemaObject } from '../lib/standard-json-schema.js';
import { ComponentType } from './component-type.js';
import { SchemaMetadataCatalog } from './schema-metadata-catalog.js';

/** What the export needs of an element registration to type its children. */
export interface ChildSlotOwner {
	readonly $type: string;
	readonly childPaths?: readonly ChildPath[];
}

/** One container's slot, with the elements its children may be. */
interface ChildSlot {
	readonly $type: string;
	readonly definitionId: string;
	readonly keys: readonly string[];
	readonly list?: true;
	readonly accepted: readonly string[];
}

const elementDefinitionId = ($type: string) => SchemaMetadataCatalog.entryId(ComponentType.Element, $type);

/**
 * The slot of every container, with the `$type`s it takes: the ones its child path accepts, or every element of the
 * engine without `accepts`.
 *
 * @throws {RegistryError} Code `'unknown-accepted-type'` when a child path accepts a `$type` that no element registers.
 * It is thrown before any slot is written, so no reference to a missing definition is ever written.
 */
function childSlotsOf(elements: readonly ChildSlotOwner[]): ChildSlot[] {
	const everyType = elements.map((element) => element.$type);
	const registered = new Set(everyType);
	return elements.flatMap((element) =>
		(element.childPaths ?? []).map(({ keys, accepts, list }) => {
			const missing = accepts?.find((name) => !registered.has(name));
			if (missing !== undefined) {
				throw new RegistryError(
					'unknown-accepted-type',
					`The child path '${keys.join('.')}' of '${element.$type}' accepts '${missing}', which no element registers, so the JSON Schema export has no definition to refer to.`,
					{ $type: element.$type, childPath: keys, key: missing },
				);
			}
			return {
				$type: element.$type,
				definitionId: elementDefinitionId(element.$type),
				keys,
				list,
				accepted: accepts ?? everyType,
			};
		}),
	);
}

function missingDefinition(slot: ChildSlot, where: string): Error {
	return new Error(
		`The JSON Schema export holds no definition '${slot.definitionId}' of '${slot.$type}' in ${where}, so its children cannot be typed.`,
	);
}

function unreachable(slot: ChildSlot): RegistryError {
	return new RegistryError(
		'unreachable-child-path',
		`The JSON Schema of '${slot.$type}' sets an $id of its own, so the export cannot reach the child path '${slot.keys.join('.')}': a $ref written there resolves against that $id, not against the document.`,
		{ $type: slot.$type, childPath: slot.keys },
	);
}

/**
 * Type the children of every container in an exported form config document, in place.
 *
 * @param document - The converted form config, which lists each element under its catalog id in its definitions
 * @param elements - Every element registration of the engine
 * @param target - The target the document was written for, which decides where its definitions are
 * @throws {RegistryError} Code `'unknown-accepted-type'` when a child path accepts an element no registration declares,
 * and `'unreachable-child-path'` when a container's `elements` is not where its JSON Schema declares it (nullable,
 * or behind `allOf`, a union or a reference) or its schema sets an `$id` (`id` for draft-04) of its own
 *
 * @remarks
 * Done after the schema is converted, so a container is typed the same whichever library wrote its schema, and
 * whatever wraps `elements` (`optional`, `default`, `readonly`): they are the same array in JSON Schema. The slot is
 * replaced by `replaceChildSlot`, as `exportTreeSchema` does it, so `required`, list bounds and annotations stay. A
 * container declares `list`, so an open slot becomes a list.
 */
export function composeDocumentChildSlots(
	document: JSONSchemaObject,
	elements: readonly ChildSlotOwner[],
	target: JSONSchemaTarget,
): void {
	const slots = childSlotsOf(elements);
	const keyword = definitionsKeyword(target);
	for (const slot of slots) {
		const definition: JSONSchemaObject | undefined = document[keyword]?.[slot.definitionId];
		if (definition === undefined) throw missingDefinition(slot, `'${keyword}'`);
		if (startsResource(definition, target)) throw unreachable(slot);
		const union = {
			anyOf: slot.accepted.map((name) => ({ $ref: definitionRef(target, elementDefinitionId(name)) })),
		};
		replaceChildSlot(definition, slot, union, { target });
	}
}

/**
 * Type the children of every container in an exported collection, in place.
 *
 * @param collection - The converted collection, which lists each element as the entry of its catalog id
 * @param elements - Every element registration of the engine
 * @param uri - How the collection refers to an entry, as it was written
 * @param target - The target the collection was written for, which decides the identifier (`$id`, or `id` for draft-04)
 * that makes a schema a resource of its own
 * @throws {RegistryError} The codes of {@link composeDocumentChildSlots}, except that an entry's own `$id` (`id` for draft-04) is no
 * obstacle
 *
 * @remarks
 * An entry's `$id` (`id` for draft-04) is its own address, and a reference is written the way Zod refers from one entry of the collection to
 * another, by `uri`, so it does not resolve against that `$id`.
 */
export function composeCollectionChildSlots(
	collection: JSONSchemaObject,
	elements: readonly ChildSlotOwner[],
	uri: (id: string) => string,
	target: JSONSchemaTarget,
): void {
	const slots = childSlotsOf(elements);
	const entries: Record<string, JSONSchemaObject | undefined> = collection.schemas ?? {};
	for (const slot of slots) {
		const entry = entries[slot.definitionId];
		if (entry === undefined) throw missingDefinition(slot, 'the collection');
		const union = { anyOf: slot.accepted.map((name) => ({ $ref: uri(elementDefinitionId(name)) })) };
		replaceChildSlot(entry, slot, union, { target });
	}
}
