import { RegistryError } from '../registry-error.js';
import { assertJSONSchemaTarget, isPlainObject, type JSONSchemaObject, type JSONSchemaTarget } from './standard.js';

/** Where the JSON Schema being written keeps its definitions. */
export type JSONSchemaPlacement =
	| { readonly kind: 'document' }
	| {
			readonly kind: 'collection';
			/** The URI the collection refers to an entry by. */
			readonly uri: (id: string) => string;
	  };

/** Keywords whose value is data rather than a schema, so a `$ref` key inside it is not a reference. */
const DATA_KEYWORDS = new Set(['const', 'enum', 'default', 'examples']);

/** Keywords whose value maps names to schemas, so a key there is a name rather than a keyword. */
const NAMED_SCHEMA_KEYWORDS = new Set([
	'properties',
	'patternProperties',
	'$defs',
	'definitions',
	'dependentSchemas',
	'dependencies',
]);

const isLocalPointer = (ref: string): boolean => ref === '#' || ref.startsWith('#/');

/**
 * Whether a schema is the root of a resource of its own, which resolves its references against itself. A draft-07
 * `$id` that is only a fragment (`#node`) names an anchor instead.
 */
export const startsResource = (schema: Record<string, unknown>): boolean =>
	typeof schema.$id === 'string' && !schema.$id.startsWith('#');

/**
 * A copy of a schema's root resource with `rewrite` applied to each string keyword of every schema in it. A keyword
 * is replaced where `rewrite` returns another value.
 *
 * @remarks
 * A subschema with its own `$id` is another resource: its references and anchors are relative to it, not to the
 * schema being embedded, so it is copied as it is. The root is walked whatever its `$id`; the embedder embeds a root
 * that starts a resource as it is.
 */
function mapResource(node: unknown, rewrite: (keyword: string, value: string) => string, isRoot = true): unknown {
	if (Array.isArray(node)) return node.map((item) => mapResource(item, rewrite, false));
	if (!isPlainObject(node)) return node;
	if (!isRoot && startsResource(node)) return structuredClone(node);
	const copy: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node)) {
		if (typeof value === 'string') copy[key] = rewrite(key, value);
		else if (DATA_KEYWORDS.has(key)) copy[key] = structuredClone(value);
		else if (NAMED_SCHEMA_KEYWORDS.has(key) && isPlainObject(value)) {
			copy[key] = Object.fromEntries(
				Object.entries(value).map(([name, schema]) => [name, mapResource(schema, rewrite, false)]),
			);
		} else copy[key] = mapResource(value, rewrite, false);
	}
	return copy;
}

/**
 * The keyword a target writes an anchor under as a fragment identifier: `id: '#name'` for draft-04, `$id: '#name'` for
 * every other target.
 */
const fragmentKeyword = (target: JSONSchemaTarget): 'id' | '$id' => (target === 'draft-04' ? 'id' : '$id');

/**
 * The anchor names a schema's root resource declares: `$anchor`, `$dynamicAnchor` and the fragment identifier the
 * target writes ({@link fragmentKeyword}).
 */
function declaredAnchors(schema: JSONSchemaObject, target: JSONSchemaTarget): Set<string> {
	const names = new Set<string>();
	const fragment = fragmentKeyword(target);
	mapResource(schema, (keyword, value) => {
		if (keyword === '$anchor' || keyword === '$dynamicAnchor') names.add(value);
		else if (keyword === fragment && value.startsWith('#')) names.add(value.slice(1));
		return value;
	});
	return names;
}

/**
 * A copy of a schema's root resource with its local JSON Pointer references passed through `pointer`, and each
 * anchor it declares, with the `#name` references to it, renamed by `anchor`.
 */
function rewriteResource(
	schema: JSONSchemaObject,
	target: JSONSchemaTarget,
	rewrite: { readonly pointer?: (pointer: string) => string; readonly anchor?: (name: string) => string },
): JSONSchemaObject {
	const fragment = fragmentKeyword(target);
	const anchors = rewrite.anchor ? declaredAnchors(schema, target) : new Set<string>();
	const renamed = (name: string) => (rewrite.anchor && anchors.has(name) ? rewrite.anchor(name) : name);
	return mapResource(schema, (keyword, value) => {
		if (keyword === '$anchor' || keyword === '$dynamicAnchor') return renamed(value);
		if (keyword === fragment && value.startsWith('#')) return `#${renamed(value.slice(1))}`;
		if (keyword !== '$ref' && keyword !== '$dynamicRef') return value;
		if (isLocalPointer(value)) return rewrite.pointer ? rewrite.pointer(value) : value;
		return value.startsWith('#') ? `#${renamed(value.slice(1))}` : value;
	}) as JSONSchemaObject;
}

function withoutSchemaKeyword(schema: JSONSchemaObject): JSONSchemaObject {
	const { $schema: _dropped, ...rest } = schema;
	return structuredClone(rest);
}

function hasLocalRef(schema: JSONSchemaObject): boolean {
	let found = false;
	mapResource(schema, (keyword, value) => {
		if (keyword === '$ref' && isLocalPointer(value)) found = true;
		return value;
	});
	return found;
}

/**
 * A copy of a schema without its root's draft-07 fragment `$id` (`#node`), with the `#node` references to it pointing
 * at the root as `#`. A schema without one is returned as it is.
 *
 * @remarks
 * A fragment `$id` is an anchor, and a draft-07 root has only one `$id`, which an entry of a collection needs for its
 * URI. The anchor can only name the root, so `#` says the same within the entry, which is a resource of its own by
 * that URI. Anchors below the root are kept, and the root's other keywords are untouched.
 */
function withoutRootAnchor(schema: JSONSchemaObject): JSONSchemaObject {
	if (typeof schema.$id !== 'string' || !schema.$id.startsWith('#')) return schema;
	const root = schema.$id;
	const { $id: _anchor, ...rest } = mapResource(schema, (keyword, value) =>
		(keyword === '$ref' || keyword === '$dynamicRef') && value === root ? '#' : value,
	) as JSONSchemaObject;
	return rest;
}

/** The keyword a document keeps its definitions under, as Zod writes it for the target. */
export const definitionsKeyword = (target: JSONSchemaTarget): '$defs' | 'definitions' =>
	target === 'draft-2020-12' ? '$defs' : 'definitions';

/**
 * Embeds JSON Schemas that were written as documents of their own (by a Standard JSON Schema converter or a separate
 * Zod conversion) into one JSON Schema being written.
 */
export interface JSONSchemaEmbedder {
	/** The schema to write in place of `own`, which is not changed. */
	embed(own: JSONSchemaObject): JSONSchemaObject;
	/**
	 * The schema to write as the definition named `name` of a document, or as the entry of that name of a collection,
	 * where `own` is not changed.
	 *
	 * @remarks
	 * The schema stays at its own place, so a container found by its name is the schema itself and not a reference to
	 * another definition. In a document, `#` points at the definition, a pointer into the schema's own definitions at the
	 * definition lifted to the document as `<name>.<its name>` and anchors are renamed under `name`, as
	 * {@link createJSONSchemaEmbedder} explains. In a collection the entry is its own resource, so the schema is kept as it is, with
	 * its own definitions, without `$schema`, and a draft-07 root `$id: '#node'` is dropped with its references turned
	 * into `#`, since the entry is addressed by the `$id` the collection gives it. A schema with an `$id` of its own is a
	 * resource that keeps its base: in a document it is kept as it is, and in a collection the entry is an `allOf` of a
	 * reference to it, with the schema beside it under the name (a `$ref` beside other keywords is ignored before 2019-09), so the entry keeps the collection's URI and the schema keeps its
	 * `$id`.
	 */
	embedDefinition(own: JSONSchemaObject, name: string): JSONSchemaObject;
	/**
	 * Adds the definitions `embed` and `embedDefinition` moved to the finished document or collection, in place.
	 *
	 * @throws {RegistryError} Code `'definition-name-clash'` when one of them takes a name `written` already defines
	 */
	finish(written: JSONSchemaObject): JSONSchemaObject;
}

/**
 * Create the embedder for one JSON Schema being written.
 *
 * @param target - The target the schema is written for
 * @throws {Error} When `target` is not one of the four {@link JSONSchemaTarget}s, before anything is embedded
 * @param placement - Whether it is one document or a collection of entries
 *
 * @remarks
 * `$schema` is dropped, since the document being written declares the dialect. A schema whose `$ref` points into
 * itself from its root (`#`, `#/$defs/node`, as ArkType writes a recursive type) would point at the wrong root once
 * embedded, so it is hoisted: in a document, into its definitions under a key of its own (`embedded-1`), with each of
 * its local pointers prefixed by that place; in a collection, as an entry of its own, referred to by its URI. The
 * references stay `#/...` pointers and `#name` anchors, which is what AI tool APIs resolve, rather than `$id` URIs.
 *
 * A plain-name anchor (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#node'`, a draft-04 `id: '#node'`) resolves anywhere in the document, so
 * two schemas that each declare `node` would declare it twice. Each embedded schema's anchors, and the `#node`
 * references to them, are renamed to carry its key (`embedded-1-node`), whether it is hoisted into a document or
 * embedded where it stands. A schema hoisted into a collection is a resource of its own by its `$id`, which scopes
 * its anchors, so they keep their names. Only a draft-07 root `$id: '#node'` cannot stay: the entry's `$id` is its
 * assigned URI, so the root's anchor is dropped and its `#node` references become `#`, as
 * {@link withoutRootAnchor} explains.
 *
 * Only the schema's root resource is rewritten. A schema with its own `$id`, and any subschema that sets one, resolves
 * its pointers and anchors against that and is left as it is.
 *
 * A definition written into a document by `embedDefinition(own, owner)` is named, and its anchors renamed, by the
 * owner, so that no two owners share a name:
 *
 * - A definition `name` of the schema's own `$defs` (`definitions` for a draft-07 target) is lifted to
 *   `<owner>.<name>`, with the owner written so that it holds no `.`: each `.` and `_` in it is replaced by `_` and its
 *   code point in hex and `_` again (`_2e_`, `_5f_`), any other character stays. Owner `element:a.b` with a definition
 *   `c` is lifted as `element:a_2e_b.c` and owner `element:a` with `b.c` as `element:a.b.c`, so the first `.` of a
 *   lifted name always ends the owner.
 * - An anchor `name` is renamed `<owner part>.<name>`, where the owner part is `o` followed by the owner with every
 *   character outside `[A-Za-z0-9-]` (`.` and `_` included) replaced by `_`, its code point in hex and `_` (`ui/button`
 *   becomes `oui_2f_button`, `a.b` becomes `oa_2e_b`, `my-card` stays `omy-card`). The part starts with a letter, holds
 *   only characters every dialect allows in an anchor, and no `.`, so the first `.` ends it, and the keys of `embed`
 *   (`embedded-1`) never start with `o`.
 *
 * In both, the owner part never holds a `.`, and a `_` in the owner is always escaped, so the first `.` ends the owner
 * and its `_<hex>_` tokens decode one way. Both are one-to-one, so two owners never write the same name. A name that is still taken, by another definition
 * lifted into the document or one `finish` finds in the document it completes, is a `RegistryError` with the code
 * `'definition-name-clash'`; nothing is overwritten.
 */
export function createJSONSchemaEmbedder(target: JSONSchemaTarget, placement: JSONSchemaPlacement): JSONSchemaEmbedder {
	assertJSONSchemaTarget(target);
	const keyword = definitionsKeyword(target);
	const hoisted: Record<string, JSONSchemaObject> = {};
	const ownerOf = new Map<string, string>();
	let count = 0;
	return {
		embed(own) {
			const body = withoutSchemaKeyword(own);
			if (startsResource(body)) return body;
			const pointsIntoItself = hasLocalRef(body);
			if (!pointsIntoItself && declaredAnchors(body, target).size === 0) return body;
			count += 1;
			const key = `embedded-${count}`;
			if (pointsIntoItself && placement.kind === 'collection') {
				const ref = placement.uri(key);
				hoisted[key] = {
					...(own.$schema === undefined ? {} : { $schema: own.$schema }),
					...withoutRootAnchor(body),
					$id: ref,
				};
				return { $ref: ref };
			}
			const ref = definitionRef(target, key);
			const rewritten = rewriteResource(body, target, {
				pointer: pointsIntoItself ? (pointer) => `${ref}${pointer.slice(1)}` : undefined,
				anchor: (name) => `${key}-${name}`,
			});
			if (!pointsIntoItself) return rewritten;
			hoisted[key] = rewritten;
			return { $ref: ref };
		},
		embedDefinition(own, name) {
			if (placement.kind === 'collection') {
				const entry = withoutRootAnchor(withoutSchemaKeyword(own));
				if (!startsResource(entry)) return entry;
				return { allOf: [{ $ref: entry.$id }], [keyword]: { [name]: entry } };
			}
			const { definition, nested } = hoistDefinitions(own, name, target);
			for (const [lifted, schema] of Object.entries(nested)) {
				if (Object.hasOwn(hoisted, lifted)) throw definitionNameClash(name, lifted);
				hoisted[lifted] = schema;
				ownerOf.set(lifted, name);
			}
			return definition;
		},
		finish(written) {
			if (Object.keys(hoisted).length === 0) return written;
			const field = placement.kind === 'collection' ? 'schemas' : keyword;
			const existing: JSONSchemaObject = isPlainObject(written[field]) ? written[field] : {};
			for (const key of Object.keys(hoisted)) {
				if (Object.hasOwn(existing, key)) throw definitionNameClash(ownerOf.get(key), key);
			}
			written[field] = { ...existing, ...hoisted };
			return written;
		},
	};
}

/**
 * The error for a definition `key` that takes a name another definition holds. `owner` is the owner whose schema
 * brought the definition along, and is absent for the key of a schema `embed` hoisted, which has none.
 */
function definitionNameClash(owner: string | undefined, key: string): RegistryError {
	if (owner === undefined) {
		return new RegistryError(
			'definition-name-clash',
			`A schema embed hoisted as '${key}' takes the name of a definition of the export.`,
			{ key },
		);
	}
	return new RegistryError(
		'definition-name-clash',
		`The definition '${key}' that '${owner}' brought along takes the name of another definition of the export.`,
		{ $type: owner, key },
	);
}

/** `text` with each character that `keep` does not match written as `_`, its code point in hex and `_`. */
function escapeCharacters(text: string, keep: RegExp): string {
	let written = '';
	for (const char of text) written += keep.test(char) ? char : `_${char.codePointAt(0)!.toString(16)}_`;
	return written;
}

/**
 * The owner part of an anchor name: `o` and the owner with every character outside `[A-Za-z0-9-]` written as `_`, its
 * code point in hex and `_` (`ui/button` becomes `oui_2f_button`, `my-card` stays `omy-card`).
 *
 * @remarks
 * The part holds no `.`, so the first `.` of `<owner part>.<name>` ends it, and it escapes `_` as well, so a literal `_`
 * is never read as the start of an escape: two owners never share a part. It starts with a letter and holds only
 * `[A-Za-z0-9_-]`, which every dialect allows in an anchor name (`^[A-Za-z][-A-Za-z0-9._]*$`), whatever the owner is
 * called. No owner is kept as it is, since an owner that was kept could be mistaken for a written one.
 */
const anchorOwnerPart = (owner: string): string => `o${escapeCharacters(owner, /[A-Za-z0-9-]/)}`;

/**
 * The name a definition of an owner takes in a document of definitions: `<owner part>.<name>`, with the owner part
 * written without a `.` (`.` and `_` become `_2e_` and `_5f_`, other characters stay).
 *
 * @remarks
 * The owner part holds no `.`, so the first `.` ends it and two (owner, name) pairs never write the same name, while an
 * owner like `element:tab` reads as written.
 */
const liftedName = (owner: string, name: string): string => `${escapeCharacters(owner, /[^._]/)}.${name}`;

/**
 * A JSON Pointer reference token, written for a URI fragment: `~` and `/` escaped, then percent-encoded for what a
 * fragment does not allow.
 *
 * @remarks
 * RFC 3986 lets a fragment hold the `pchar` characters raw, so `:`, `@` and the sub-delimiters (`$&+,;=` and `!'()*`)
 * stay as they are and a name like `element:tab` reads as written.
 */
export function pointerToken(name: string): string {
	return encodeURIComponent(name.replaceAll('~', '~0').replaceAll('/', '~1')).replaceAll(
		/%(?:24|26|2B|2C|3A|3B|3D|40)/g,
		decodeURIComponent,
	);
}

/**
 * The `$ref` to the definition of a name in a document written for a target: `#/$defs/<name>` for `'draft-2020-12'`,
 * `#/definitions/<name>` for every other target, with the name written as a JSON Pointer token.
 *
 * @param target - The target the document is written for, which decides the keyword of its definitions
 * @param name - The key of the definition, for example `'ui/button'`
 *
 * @remarks
 * A name holds any character. `~` and `/` are escaped as the pointer syntax requires, and what a URI fragment does not
 * allow (a space, `%`, `#`, `?`) is percent-encoded, so a tool that resolves the reference finds the key whatever the
 * name is.
 */
export function definitionRef(target: JSONSchemaTarget, name: string): string {
	return `#/${definitionsKeyword(target)}/${pointerToken(name)}`;
}

function unescapedToken(token: string): string {
	return decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~');
}

/**
 * A JSON Schema that was written as a document of its own, split into the definition it becomes and the definitions it
 * brought along.
 */
interface HoistedDefinitions {
	/** The schema to keep under the owner's name in the document's definitions. */
	readonly definition: JSONSchemaObject;
	/** The definitions of `own`, by the name each takes in the document, as {@link liftedName} writes it. */
	readonly nested: Readonly<Record<string, JSONSchemaObject>>;
}

/**
 * Move a schema written as a document of its own to where it resolves in a document of definitions, under the name of
 * its owner.
 *
 * @param own - The schema, which is not changed
 * @param owner - The name its definition takes in the document, for example a `$type`
 * @param target - The target the document is written for, which decides the definitions keyword
 * @throws {RegistryError} Code `'definition-name-clash'` when `$defs` and `definitions` both define one name
 *
 * @remarks
 * The schema's own definitions (`$defs`, or `definitions` for a draft-07 target) are lifted out and named under their
 * owner as {@link liftedName} does, so the document's definitions stay one flat list. Every local pointer follows: `#`
 * points at the owner's definition, `#/$defs/name` at the lifted one, and any other `#/...` pointer into the owner's
 * definition. Anchors and `$schema` are handled as {@link createJSONSchemaEmbedder} does, each anchor named
 * `<owner part>.<name>` as {@link anchorOwnerPart} writes the owner part. The caller checks the names it gets back
 * against the ones it already holds. A schema with an `$id` of its own is a resource that resolves itself, so it is
 * kept as it is.
 */
function hoistDefinitions(own: JSONSchemaObject, owner: string, target: JSONSchemaTarget): HoistedDefinitions {
	const body = withoutSchemaKeyword(own);
	if (startsResource(body)) return { definition: body, nested: {} };
	const nameOf = (name: string) => liftedName(owner, name);
	const place = (name: string) => definitionRef(target, name);
	const ownerPart = anchorOwnerPart(owner);
	const rewritten = rewriteResource(body, target, {
		pointer(pointer) {
			if (pointer === '#') return place(owner);
			const tokens = pointer.slice(2).split('/');
			const [head, name, ...rest] = tokens;
			if ((head === '$defs' || head === 'definitions') && name !== undefined) {
				return [place(nameOf(unescapedToken(name))), ...rest].join('/');
			}
			return `${place(owner)}/${tokens.join('/')}`;
		},
		anchor: (name) => `${ownerPart}.${name}`,
	});
	const nested: Record<string, JSONSchemaObject> = {};
	for (const field of ['$defs', 'definitions']) {
		const lifted = rewritten[field];
		if (!isPlainObject(lifted)) continue;
		for (const [name, schema] of Object.entries(lifted)) {
			if (Object.hasOwn(nested, nameOf(name))) throw definitionNameClash(owner, nameOf(name));
			nested[nameOf(name)] = schema as JSONSchemaObject;
		}
		delete rewritten[field];
	}
	return { definition: rewritten, nested };
}
