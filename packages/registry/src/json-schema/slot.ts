import { RegistryError } from '../registry-error.js';
import { startsResource } from './embedder.js';
import { getOwn, isPlainObject, setOwn, type JSONSchemaObject, type JSONSchemaTarget } from './standard.js';

const SCHEMA_APPLICATORS = ['$ref', '$dynamicRef', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else'];

const SLOT_ANNOTATIONS = ['title', 'description', 'default', 'examples', 'deprecated', '$comment'];

/**
 * Replace the slot a child path names in a registration's JSON Schema, and nothing around it. The definition is
 * changed in place.
 *
 * @param definition - The registration's JSON Schema, as the definition of its `$type`
 * @param path - The registration's `$type`, for the error, and the `keys` and `list` of the child path whose slot to
 * replace
 * @param union - The schema every child must match, already resolved: each `$ref` is written as the document it goes in
 * refers to a definition. Each place the slot takes it gets its own copy
 * @param options - The `target` the schema is written for, which decides the identifier (`$id`, or `id` for draft-04)
 * that makes a schema a resource of its own
 * @throws {RegistryError} Code `'unreachable-child-path'` when the slot is not where the definition declares it, is
 * nullable, is not an object, an array or open, or is an object where the path sets `list`, and `'invalid-child-paths'` when `path.keys` is empty
 *
 * @remarks
 * `required`, list bounds and every sibling keyword of the slot's parent stay, since the registration's schema owns
 * them. The slot is read by what it is: an array (`type: 'array'`, `items` or `prefixItems`) gets its items replaced, an
 * object (`type: 'object'` or `properties`) becomes the union, and an open slot (no keyword but annotations) becomes the
 * union or a list of it, matching a child or a list of children. A path that sets `list` holds a list and never one
 * node, so its open slot becomes an array of the union, and an object slot is unreachable, since the schema would refuse
 * the list the document holds. An array slot of such a path that declares only array keywords (`items`) gets
 * `type: 'array'`, so an object is refused as the walk refuses it, and one whose `type` is another is unreachable.
 * Annotations of the slot are kept. A slot inside a
 * schema with an `$id` (`id` for draft-04) of its own cannot be reached: a `$ref` there resolves against that `$id`, not against the
 * document. That holds for each schema between the definition and the slot. The definition's own root is the caller's
 * to check, since only the caller knows whether the references it writes resolve against that root: a collection entry
 * has an `$id` that is its address, and its references are written for that collection. A nullable slot (`type: ['array', 'null']` or an `anyOf` with `null`, or `nullable: true` as OpenAPI 3.0
 * writes it) cannot be reached either, since `safeParseTree` refuses `null` at a slot and keeping the keyword would
 * leave the slot accepting it.
 *
 * A tuple is an array whose every item is a child, as `safeParseTree` reads it, so each position takes the union:
 * every `prefixItems` entry (2020-12), every array-form `items` entry and `additionalItems` (draft-07), and the
 * `items` that follows `prefixItems`. A rest that the schema closes with `false` stays closed, since the tuple's arity
 * is the registration's to decide. Throwing instead would refuse a fixed-arity pair of children that is valid, while
 * replacing only `items` would leave the prefix positions accepting any `$type`.
 *
 * The check that the union's names are registered belongs to the caller, as it does in `exportTreeSchema`.
 */
export function replaceChildSlot(
	definition: JSONSchemaObject,
	path: { readonly $type: string; readonly keys: readonly string[]; readonly list?: true },
	union: JSONSchemaObject,
	options: { readonly target: JSONSchemaTarget },
): void {
	const { target } = options;
	const { $type, keys, list } = path;
	if (keys.length === 0) {
		throw new RegistryError(
			'invalid-child-paths',
			`The child path of '${$type}' has no keys, so there is no slot to replace.`,
			{ $type, childPath: keys },
		);
	}
	const copy = () => structuredClone(union);
	const unreachable = () =>
		new RegistryError(
			'unreachable-child-path',
			`The JSON Schema of '${$type}' has no slot the export can reach for the child path '${keys.join('.')}'. The slot must be a declared property, not behind a reference, allOf or a union, nor inside a schema with an $id (id for draft-04) of its own, and an object, an array or open.`,
			{ $type, childPath: keys },
		);
	let parent: JSONSchemaObject = definition;
	for (const key of keys.slice(0, -1)) {
		const step = isPlainObject(parent.properties) ? getOwn(parent.properties, key) : undefined;
		if (!isPlainObject(step) || startsResource(step, target)) throw unreachable();
		parent = step;
	}
	const last = keys[keys.length - 1]!;
	const properties = parent.properties;
	if (!isPlainObject(properties) || !Object.hasOwn(properties, last)) {
		throw unreachable();
	}
	const found = getOwn(properties, last);
	const slot = found === true ? {} : found;
	if (!isPlainObject(slot)) throw unreachable();
	if (
		SCHEMA_APPLICATORS.some((keyword) => keyword in slot) ||
		Array.isArray(slot.type) ||
		slot.nullable === true ||
		startsResource(slot, target)
	) {
		throw unreachable();
	}
	const annotations = Object.fromEntries(
		SLOT_ANNOTATIONS.filter((key) => key in slot).map((key) => [key, slot[key]]),
	);
	if (slot.type === 'array' || 'items' in slot || 'prefixItems' in slot) {
		if (list === true) {
			if (slot.type !== undefined && slot.type !== 'array') throw unreachable();
			slot.type = 'array';
		}
		const tupleItems = Array.isArray(slot.items);
		const rest = tupleItems ? 'additionalItems' : 'items';
		if (Array.isArray(slot.prefixItems)) slot.prefixItems = slot.prefixItems.map(copy);
		if (tupleItems) slot.items = (slot.items as unknown[]).map(copy);
		if (slot[rest] !== false) slot[rest] = copy();
	} else if (slot.type === 'object' || 'properties' in slot) {
		if (list === true) throw unreachable();
		setOwn(properties, last, { ...annotations, ...copy() });
	} else if (slot.type === undefined && Object.keys(slot).every((key) => key in annotations)) {
		const items = { type: 'array', items: copy() };
		setOwn(
			properties,
			last,
			list === true ? { ...annotations, ...items } : { ...annotations, anyOf: [copy(), items] },
		);
	} else {
		throw unreachable();
	}
}
