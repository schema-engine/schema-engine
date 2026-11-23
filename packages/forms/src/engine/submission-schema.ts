import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import * as z from 'zod/mini';
import { frozenCopy } from '@/lib/frozen-copy';
import { isPlainObject } from '@/lib/is-plain-object';
import { buildSubmissionShape, type ShapeStep, type SubmissionShape } from '@/lib/submission-shape';
import { isZodType } from '@/lib/zod-json-schema';
import type { JSONSchemaObject } from '@/lib/standard-json-schema';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';
import { getValidationRulesForElement, isFieldRequired } from '@/schemas/validation/utils';
import type { BaseValidationRule } from '@/schemas/validation/types';
import type { AnyElementRegistration } from '@/types/registration';

/**
 * The submitted values of a form, as a Standard Schema, and as a Standard JSON Schema where its value schemas can say so.
 *
 * @remarks
 * `~standard.validate` checks a submission: the values the container submits, whose keys are the fields' names
 * (dotted names nested), and returns them without any key a field does not declare. A mismatch is a broken
 * element contract, not a user error. `partial` is the same schema with every key optional at every depth and
 * every leaf allowed to be empty, for the `defaultValues` of a form that has not been filled. A value schema that cannot
 * check a default (it throws, or is asynchronous) is reported there as an issue at its field, so one default that cannot
 * be checked never stops the others from being.
 *
 * @remarks
 * An issue of `partial` is at the field, because a default is kept or dropped as a whole: a leaf is a field, a group is
 * not (its fields are), and a list is one field, so an issue inside a row is at the list (`tags`, not `tags.0` or
 * `tags.0.name`). `createFormRuntime` drops the default of each field `partial` reports.
 */
export interface SubmissionSchema<TValues = Readonly<Record<string, unknown>>>
	extends StandardSchemaV1<unknown, TValues>, StandardJSONSchemaV1<unknown, TValues> {
	readonly '~standard': StandardSchemaV1.Props<unknown, TValues> & StandardJSONSchemaV1.Props<unknown, TValues>;
	readonly partial: {
		readonly '~standard': Omit<StandardSchemaV1.Props<unknown, unknown>, 'validate'> & {
			readonly validate: (value: unknown) => StandardSchemaV1.Result<unknown>;
		};
	};
}

/** What the composer needs of an engine: the element registrations and the validation rules. */
export interface SubmissionSchemaSource {
	getElement(id: string): AnyElementRegistration | undefined;
	readonly validationRegistry: ValidationRegistry;
}

/** What it reads of the form config: its steps and its payload. */
export interface SubmissionSchemaConfig {
	readonly steps: readonly ShapeStep[];
	readonly payload?: Readonly<Record<string, unknown>>;
}

/** The empty values of an optional leaf field, which a submission keeps so a PATCH can tell cleared from untouched. */
const EMPTY = ['', null] as const;

type Issues = StandardSchemaV1.Issue[];
type Key = PropertyKey;

/** A node of the schema: what the shape's field, object or array checks, with the value schema of each leaf resolved. */
type Node =
	| {
			readonly kind: 'leaf';
			readonly name: string;
			readonly schema: StandardSchemaV1;
			readonly required: boolean;
	  }
	| { readonly kind: 'object'; readonly fields: ReadonlyArray<readonly [string, Node]>; readonly required: boolean }
	| { readonly kind: 'array'; readonly row: Node; readonly required: boolean }
	| { readonly kind: 'any' };

const isEmpty = (value: unknown): boolean => value === undefined || value === '' || value === null;

const isRequired = (node: Node): boolean => node.kind !== 'any' && node.required;

/**
 * Whether a key is required: its field has a `required` rule and nothing can leave it out, or something inside it is required.
 */
function requiredOf(shape: SubmissionShape, source: SubmissionSchemaSource, inside = false): boolean {
	const { element } = shape;
	const ruled =
		element !== undefined &&
		!shape.conditional &&
		isFieldRequired(
			getValidationRulesForElement(
				element as { $type?: string; rules?: readonly BaseValidationRule[] },
				source.validationRegistry,
			),
		);
	return ruled || inside;
}

function leafOf(shape: Extract<SubmissionShape, { kind: 'field' }>, source: SubmissionSchemaSource): Node {
	const { element } = shape;
	const registration = element.$type ? source.getElement(element.$type) : undefined;
	const schema = registration && 'value' in registration ? registration.value?.(element as never) : undefined;
	if (schema === undefined) return { kind: 'any' };
	return { kind: 'leaf', name: element.name ?? '', schema, required: requiredOf(shape, source) };
}

function nodeOf(shape: SubmissionShape, source: SubmissionSchemaSource): Node {
	if (shape.kind === 'field') return leafOf(shape, source);
	if (shape.kind === 'array') {
		return { kind: 'array', row: nodeOf(shape.row, source), required: requiredOf(shape, source) };
	}
	const fields = Object.entries(shape.fields).map(([key, child]) => [key, nodeOf(child, source)] as const);
	const inside = fields.some(([, child]) => isRequired(child));
	return { kind: 'object', fields, required: requiredOf(shape, source, inside) };
}

function validateLeaf(schema: StandardSchemaV1, value: unknown): StandardSchemaV1.Result<unknown> {
	const result = schema['~standard'].validate(value);
	if (result instanceof Promise) throw new Error('A value schema must validate synchronously.');
	return result;
}

const joined = (path: readonly Key[], key: Key): readonly Key[] => [...path, key];

/** What an issue of a partial parse says when a default could not be checked at all, which the runtime reads to tell it from a mismatch. */
export const DEFAULT_NOT_CHECKED = 'The default could not be checked: ';

/** An issue of a partial parse, moved to the field it is about: a list is one field, so a path inside a row is its list's. */
function atField(issue: StandardSchemaV1.Issue): StandardSchemaV1.Issue {
	const path = issue.path ?? [];
	const row = path.findIndex((segment) => typeof segment === 'number');
	return row === -1 ? issue : { ...issue, path: path.slice(0, row) };
}

/** What parsing a node found: the value it keeps (`undefined` leaves the key out) and every issue, under `path`. */
function parse(node: Node, value: unknown, path: readonly Key[], partial: boolean, issues: Issues): unknown {
	switch (node.kind) {
		case 'any':
			return value;
		case 'leaf': {
			if ((partial || !node.required) && isEmpty(value)) return value;
			let result: StandardSchemaV1.Result<unknown>;
			try {
				result = validateLeaf(node.schema, value);
			} catch (error) {
				if (!partial) throw error;
				const cause = error instanceof Error ? error.message : String(error);
				issues.push({ message: `${DEFAULT_NOT_CHECKED}${cause}`, path });
				return value;
			}
			if (result.issues === undefined) return result.value;
			for (const issue of result.issues) {
				const inside = partial
					? []
					: (issue.path ?? []).map((segment) => (typeof segment === 'object' ? segment.key : segment));
				issues.push({ ...issue, path: [...path, ...inside] });
			}
			return value;
		}
		case 'array': {
			if (value === undefined) return undefined;
			if (!Array.isArray(value)) {
				issues.push({ message: 'Expected a list', path });
				return value;
			}
			return value.map((row, index) => parse(node.row, row, joined(path, index), partial, issues));
		}
		case 'object': {
			if (value === undefined) return undefined;
			if (!isPlainObject(value)) {
				issues.push({ message: 'Expected an object', path });
				return value;
			}
			const kept: Record<string, unknown> = {};
			for (const [key, child] of node.fields) {
				const present = Object.hasOwn(value, key) && value[key] !== undefined;
				if (!present) {
					if (isRequired(child) && !partial) {
						issues.push({ message: 'Required', path: joined(path, key) });
					}
					continue;
				}
				kept[key] = parse(child, value[key], joined(path, key), partial, issues);
			}
			return kept;
		}
	}
}

/** The path of an issue as the dotted string a field is known by (`contacts.0.email`). */
export function issuePath(issue: StandardSchemaV1.Issue): string {
	return (issue.path ?? []).map((segment) => String(typeof segment === 'object' ? segment.key : segment)).join('.');
}

function standardOptions(options: StandardJSONSchemaV1.Options): {
	target: 'draft-2020-12' | 'draft-7' | 'openapi-3.0';
} {
	switch (options.target) {
		case 'draft-2020-12':
			return { target: 'draft-2020-12' };
		case 'draft-07':
			return { target: 'draft-7' };
		case 'openapi-3.0':
			return { target: 'openapi-3.0' };
		default:
			throw new Error(`The JSON Schema target '${options.target}' is not supported for a submission.`);
	}
}

const hasJsonSchema = (schema: StandardSchemaV1): schema is StandardSchemaV1 & StandardJSONSchemaV1 =>
	'jsonSchema' in schema['~standard'];

function leafJsonSchema(
	name: string,
	schema: StandardSchemaV1,
	io: 'input' | 'output',
	options: StandardJSONSchemaV1.Options,
): JSONSchemaObject {
	if (hasJsonSchema(schema)) return schema['~standard'].jsonSchema[io](options);
	if (isZodType(schema)) {
		const { $schema: _dropped, ...rest } = z.toJSONSchema(schema, {
			...standardOptions(options),
			io,
			unrepresentable: 'any',
		}) as JSONSchemaObject;
		return rest;
	}
	throw new Error(`The value schema of '${name}' has no JSON Schema.`);
}

function toJsonSchema(node: Node, io: 'input' | 'output', options: StandardJSONSchemaV1.Options): JSONSchemaObject {
	switch (node.kind) {
		case 'any':
			return {};
		case 'leaf': {
			const schema = leafJsonSchema(node.name, node.schema, io, options);
			return node.required ? schema : { anyOf: [schema, ...EMPTY.map((empty) => ({ const: empty }))] };
		}
		case 'array':
			return { type: 'array', items: toJsonSchema(node.row, io, options) };
		case 'object': {
			const required = node.fields.flatMap(([key, child]) => (isRequired(child) ? [key] : []));
			return {
				type: 'object',
				properties: Object.fromEntries(
					node.fields.map(([key, child]) => [key, toJsonSchema(child, io, options)]),
				),
				...(required.length ? { required } : {}),
				additionalProperties: false,
			};
		}
	}
}

/**
 * Composes the submission schema of a form from its elements' value declarations.
 *
 * @remarks
 * The rules are the container's, read from one {@link buildSubmissionShape}: dotted names nest, named containers
 * become objects, `containerKind: 'array'` becomes an array, a one-child row is a list of values (unless its child is a container of its own, which makes the rows objects) and the `payload`
 * keys are added as they are. A named element that declares no value (a static one) is carried as it is, so the keys of the schema are exactly the shape's. An optional
 * leaf field accepts its empty value (`''` or `null`) as well as its declared one, because a submission keeps what the
 * user cleared; a required field is held to its declaration. A value schema is read once, when this is called.
 */
export function createSubmissionSchema(
	config: SubmissionSchemaConfig,
	source: SubmissionSchemaSource,
): SubmissionSchema {
	const shape = buildSubmissionShape(config.steps);
	const root = nodeOf(shape, source);
	const payload = Object.entries(config.payload ?? {}).map(([key]) => [key, { kind: 'any' } as Node] as const);
	const tree: Node = root.kind === 'object' ? { ...root, fields: [...root.fields, ...payload] } : root;

	const validator =
		(partial: boolean) =>
		(value: unknown): StandardSchemaV1.Result<Readonly<Record<string, unknown>>> => {
			const issues: Issues = [];
			const parsed = parse(tree, value, [], partial, issues);
			if (issues.length) return { issues: partial ? issues.map(atField) : issues };
			return isPlainObject(parsed)
				? { value: frozenCopy(parsed) }
				: { issues: [{ message: 'Expected an object' }] };
		};
	const props = (partial: boolean) => ({
		version: 1 as const,
		vendor: 'schema-engine',
		validate: validator(partial),
	});
	const jsonSchema: StandardJSONSchemaV1.Converter = {
		input: (options) => ({ ...toJsonSchema(tree, 'input', options) }),
		output: (options) => ({ ...toJsonSchema(tree, 'output', options) }),
	};
	return {
		'~standard': { ...props(false), jsonSchema },
		partial: { '~standard': props(true) },
	};
}
