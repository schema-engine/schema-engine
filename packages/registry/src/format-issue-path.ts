import type { StandardSchemaIssue } from './standard-schema.js';

function childOf(node: unknown, key: PropertyKey): unknown {
	return typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined;
}

/**
 * A Standard Schema issue path as it reads in an error message: object keys joined by dots, array
 * indexes in brackets, for example `steps[0].elements[2].grid.width`. A missing or empty path is the
 * empty string.
 *
 * @param path The `path` of a Standard Schema issue. A segment is a key or an object `{ key }`.
 * @param source The document the path points into. With it, an array item that has a string `id` is
 * followed by the id in parentheses, `steps[0] (main).elements[2] (email).grid.width`, so a log of a
 * document with many nodes names the one it means.
 */
export function formatIssuePath(path: StandardSchemaIssue['path'], source?: unknown): string {
	let node = source;
	let text = '';
	for (const segment of path ?? []) {
		const key = typeof segment === 'object' ? segment.key : segment;
		node = childOf(node, key);
		if (typeof key === 'number') {
			const id = childOf(node, 'id');
			text += typeof id === 'string' && id ? `[${key}] (${id})` : `[${key}]`;
		} else {
			text += text ? `.${String(key)}` : String(key);
		}
	}
	return text;
}
