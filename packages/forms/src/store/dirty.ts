import type { Node, Tree } from './state-tree';
import { createMap, isStructural, type NullMap } from './value-tree';

function nodeOf(self: true | undefined, children: Node<true>['children']): Tree<true> {
	return self === undefined && children === undefined
		? undefined
		: { ...(self ? { self } : {}), ...(children ? { children } : {}) };
}

function rows(marks: Array<Tree<true>>): Array<Tree<true>> | undefined {
	let length = marks.length;
	while (length > 0 && marks[length - 1] === undefined) length -= 1;
	return length === 0 ? undefined : marks.slice(0, length);
}

/**
 * Where `value` differs from `defaultValue`, in the shape of the value.
 *
 * @remarks
 * A leaf differs when it is not the same value; an opaque value is compared by reference. An array's own
 * mark means its row count changed, and its rows are compared index by index against the default's, so a
 * row appended after the last default row is dirty and the rows before it are not. A container with no
 * default holds its fields to `undefined`. The walk stops at any branch shared with the defaults.
 */
export function dirtyTree(value: unknown, defaultValue: unknown): Tree<true> {
	if (Object.is(value, defaultValue)) return undefined;
	if (!isStructural(value)) return { self: true };
	if (Array.isArray(value)) {
		const before = Array.isArray(defaultValue) && isStructural(defaultValue) ? defaultValue : undefined;
		const own =
			value.length !== (before?.length ?? 0) || (defaultValue !== undefined && !before) ? true : undefined;
		return nodeOf(own, rows(value.map((row, index) => dirtyTree(row, before?.[index]))));
	}
	const before = isStructural(defaultValue) && !Array.isArray(defaultValue) ? (defaultValue as NullMap) : undefined;
	const marks = createMap<Node<true>>();
	for (const key of new Set([...Object.keys(value), ...Object.keys(before ?? {})])) {
		const mark = dirtyTree((value as NullMap)[key], before?.[key]);
		if (mark) marks[key] = mark;
	}
	const own =
		defaultValue !== undefined && !before
			? true
			: defaultValue === undefined && Object.keys(value).length === 0
				? true
				: undefined;
	return nodeOf(own, Object.keys(marks).length === 0 ? undefined : marks);
}
