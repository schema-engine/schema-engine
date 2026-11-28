import * as z from 'zod/mini';

/** Shared child-element key used by containers (fieldset, array, and custom). */
export const ELEMENT_CHILDREN_KEY = 'elements' as const;

/**
 * Child-element contract for container schemas.
 *
 * The parent schema only requires `$type` on each child. A container also declares
 * `childPaths: [{ keys: ['elements'], list: true }]`, and the engine validates each child against its
 * registrations through that path, as the author wrote it, after the parent schema succeeds.
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

/** A copy of a config without its `elements`, for an element that declares no child path and so holds none. */
export function withoutElementChildren<T extends object>(config: T): Omit<T, typeof ELEMENT_CHILDREN_KEY> {
	const { [ELEMENT_CHILDREN_KEY]: _children, ...rest } = config as T & { [ELEMENT_CHILDREN_KEY]?: unknown };
	return rest;
}
