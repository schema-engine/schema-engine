import { getElementContainerKind } from './normalized-form-config.js';
import { getElementChildren } from './element-children.js';
import { getElementName, usesScalarArrayItem } from './field-scope.js';
import { isReservedPathKey } from './reserved-path-keys.js';
import type { ConstraintLogic } from '../schemas/base-field.js';

/** What the shape reads of an element: its name, its children and what decides whether its key may be absent. */
export interface ShapeElement {
	readonly name?: string;
	readonly $type?: string;
	readonly elements?: readonly ShapeElement[];
	readonly constraints?: readonly ConstraintLogic[];
	readonly disabled?: boolean;
}

/** What the shape reads of a step. */
export interface ShapeStep {
	readonly elements: readonly ShapeElement[];
	readonly constraints?: readonly ConstraintLogic[];
}

/** A field that holds its own value: a leaf element. */
export interface FieldShape {
	readonly kind: 'field';
	readonly element: ShapeElement;
	/** Whether the element, a container around it or its step can leave its key out: see {@link buildSubmissionShape}. */
	readonly conditional: boolean;
}

/** A named container whose value is an object of its children. */
export interface ObjectShape {
	readonly kind: 'object';
	/** Absent for the form itself and for the object a dotted name makes (`address` of `address.street`). */
	readonly element?: ShapeElement;
	readonly fields: Readonly<Record<string, SubmissionShape>>;
	readonly conditional: boolean;
}

/** A container of rows: a list of values when its rows are scalar, a list of objects otherwise. */
export interface ArrayShape {
	readonly kind: 'array';
	readonly element: ShapeElement;
	readonly row: SubmissionShape;
	readonly conditional: boolean;
}

export type SubmissionShape = FieldShape | ObjectShape | ArrayShape;

/** Whether the element's own constraints or `disabled` may leave it out of a submission. */
const isConditional = (element: ShapeElement): boolean =>
	element.disabled === true || Boolean(element.constraints?.length);

/**
 * The shape of the values a submission holds, from the form's steps: what the container submits and what the engine's submission schema describes.
 *
 * @remarks
 * One walk answers both, so they cannot disagree. A dotted name nests (`address.street` is `address` and then `street`),
 * a named container is an object of its children, a container of kind `array` is a list of rows, and an element with
 * no name has no value. An array with one child has scalar rows (the row is the child's value, so `tags.0`) unless
 * `initialValues` or the child's default is a record, which makes its rows objects (`contacts.0.name`); that is the
 * rule of {@link usesScalarArrayItem}.
 *
 * It states facts and no verdict: each node says whether its key can be left out (`conditional`: its own or an
 * ancestor's or its step's `constraints` or `disabled`), and the submission schema decides which keys are required
 * from that and the rules. Paths are not expanded; a row of an array stands for every row.
 */
export function buildSubmissionShape(steps: readonly ShapeStep[]): ObjectShape {
	const root = newObject(undefined, false);
	for (const step of steps) {
		const conditional = Boolean(step.constraints?.length);
		for (const element of step.elements) place(root, element, conditional);
	}
	return root;
}

interface MutableObject {
	kind: 'object';
	element?: ShapeElement;
	fields: Record<string, SubmissionShape>;
	conditional: boolean;
}

function newObject(element: ShapeElement | undefined, conditional: boolean): MutableObject {
	return {
		kind: 'object',
		...(element ? { element } : {}),
		fields: Object.create(null) as Record<string, SubmissionShape>,
		conditional,
	};
}

function place(parent: MutableObject, element: ShapeElement, ancestorsConditional: boolean): void {
	const name = getElementName(element);
	if (!name) return;
	const segments = name.split('.');
	if (segments.some(isReservedPathKey)) return;
	let target = parent;
	for (const segment of segments.slice(0, -1)) {
		const existing = target.fields[segment];
		if (existing?.kind === 'object') {
			target = existing as MutableObject;
			continue;
		}
		const created = newObject(undefined, ancestorsConditional);
		target.fields[segment] = created;
		target = created;
	}
	const last = segments[segments.length - 1] ?? name;
	target.fields[last] = shapeOf(element, ancestorsConditional || isConditional(element));
}

function shapeOf(element: ShapeElement, conditional: boolean): SubmissionShape {
	const children = (getElementChildren(element) ?? []) as ShapeElement[];
	if (getElementContainerKind(element) === 'array') {
		const only = children[0];
		const row: SubmissionShape =
			children.length === 0
				? newObject(undefined, false)
				: only && usesScalarArrayItem(element, children)
					? shapeOf(only, conditional)
					: childrenShape(undefined, children, conditional);
		return { kind: 'array', element, row, conditional };
	}
	if (children.length === 0) return { kind: 'field', element, conditional };
	return childrenShape(element, children, conditional);
}

function childrenShape(
	element: ShapeElement | undefined,
	children: readonly ShapeElement[],
	conditional: boolean,
): MutableObject {
	const object = newObject(element, conditional);
	for (const child of children) place(object, child, conditional);
	return object;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value) &&
	Object.getPrototypeOf(value) !== Array.prototype;

/**
 * `value` without what the shape does not declare: a key no field of the form names, at any depth.
 *
 * @remarks
 * A value a field holds is kept whole, whatever it contains. A value that is not the shape's kind (a record where
 * a row should be) is returned as it is, for the schema to reject.
 */
export function pickDeclared(shape: SubmissionShape, value: unknown): unknown {
	if (shape.kind === 'field') return value;
	if (shape.kind === 'array') return Array.isArray(value) ? value.map((row) => pickDeclared(shape.row, row)) : value;
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(shape.fields).flatMap(([key, child]) =>
			Object.hasOwn(value, key) ? [[key, pickDeclared(child, value[key])]] : [],
		),
	);
}
