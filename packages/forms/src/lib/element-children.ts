import * as z from 'zod/mini';

/** Shared child-element key used by containers (fieldset, array, and custom). */
export const ELEMENT_CHILDREN_KEY = 'elements' as const;

/**
 * Child-element contract for container schemas.
 *
 * The parent schema only requires `$type` on each child. The engine recursively
 * validates children against its registrations after the parent schema succeeds.
 */
export const elementChildrenSchema = z.array(z.looseObject({ $type: z.string() }));

export type ElementChildrenInput = z.input<typeof elementChildrenSchema>;
export type ElementChildrenOutput = z.output<typeof elementChildrenSchema>;

export function getElementChildren(config: object): unknown[] | undefined {
	if (!(ELEMENT_CHILDREN_KEY in config)) return undefined;
	const children = (config as { elements?: unknown }).elements;
	return Array.isArray(children) ? children : undefined;
}

export function withElementChildren<T extends object>(config: T, children: unknown[]): T {
	return { ...config, [ELEMENT_CHILDREN_KEY]: children };
}

function isMiniSchema(schema: z.core.$ZodType): schema is z.ZodMiniType {
	return 'check' in schema && typeof schema.check === 'function';
}

function isObjectSchema(schema: z.ZodMiniType): schema is z.ZodMiniObject {
	return schema._zod.def.type === 'object';
}

function isArraySchema(schema: z.ZodMiniType): schema is z.ZodMiniArray {
	return schema._zod.def.type === 'array';
}

function isPipeSchema(schema: z.ZodMiniType): schema is z.ZodMiniPipe {
	return schema._zod.def.type === 'pipe';
}

function isPrefaultSchema(schema: z.ZodMiniType): schema is z.ZodMiniPrefault {
	return schema._zod.def.type === 'prefault';
}

/**
 * Types the children of a container schema for a JSON Schema export.
 *
 * @param child The schema of one child, typically a lazy union of the engine's element export schemas.
 *
 * @remarks
 * Finds the array a schema holds under {@link ELEMENT_CHILDREN_KEY}, looking through a pipe (its input)
 * and a prefault (its inner schema), and replaces its item schema; the array's own checks, such as a
 * minimum length, stay. Any other schema comes back as it is, so an `elements` array wrapped in `optional`, `nullable`, `default` or `readonly` keeps loose children in the export. Validation checks the children of any
 * element that has an `elements` array, so this keeps the export from lagging behind it. The result is
 * for export only: parse with the original.
 */
export function withExportedChildren(schema: z.ZodMiniType, child: z.ZodMiniType): z.ZodMiniType {
	if (isObjectSchema(schema)) {
		const children = schema._zod.def.shape[ELEMENT_CHILDREN_KEY];
		if (!children || !isMiniSchema(children) || !isArraySchema(children)) return schema;
		const typed = z.core.clone(children, { ...children._zod.def, element: child });
		return z.safeExtend(schema, { [ELEMENT_CHILDREN_KEY]: typed });
	}
	if (isPipeSchema(schema)) {
		const { in: input, out } = schema._zod.def;
		if (!isMiniSchema(input)) return schema;
		const next = withExportedChildren(input, child);
		return next === input ? schema : z.pipe(next, out);
	}
	if (isPrefaultSchema(schema)) {
		const { innerType, defaultValue } = schema._zod.def;
		if (!isMiniSchema(innerType)) return schema;
		const next = withExportedChildren(innerType, child);
		return next === innerType ? schema : z.prefault(next, defaultValue);
	}
	return schema;
}

/**
 * Whether a registration schema declares an `elements` array of children, or `undefined` when it cannot say.
 *
 * @remarks Reads a Zod schema as {@link withExportedChildren} does, through a pipe and a prefault. Any other Standard Schema is opaque, so a container written with one declares a `containerKind`.
 */
export function declaresChildren(schema: unknown): boolean | undefined {
	if (typeof schema !== 'object' || schema === null || !('_zod' in schema)) return undefined;
	const mini = schema as z.ZodMiniType;
	if (isObjectSchema(mini)) return ELEMENT_CHILDREN_KEY in mini._zod.def.shape;
	if (isPipeSchema(mini)) return declaresChildren(mini._zod.def.in);
	if (isPrefaultSchema(mini)) return declaresChildren(mini._zod.def.innerType);
	return false;
}
