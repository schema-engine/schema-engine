import type { FormValidationIssue, Path } from './issues';

function childOf(node: unknown, key: PropertyKey): unknown {
	return typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined;
}

/**
 * A path as it reads in an error message: object keys joined by dots, array indexes in brackets,
 * for example `steps[0].elements[2].grid.width`. The empty path is the empty string.
 *
 * @param source The config the path points into. With it, an array item that has a string `id` is
 * followed by the id in parentheses, `steps[0] (main).elements[2] (email).grid.width`, so a log of a
 * config with many fields names the one it means.
 */
export function formatIssuePath(path: Path, source?: unknown): string {
	let node = source;
	let text = '';
	for (const key of path) {
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

/**
 * Thrown by {@link validateFormConfig} when a form does not validate.
 *
 * @param issues Every problem the checks found, each with the config path it is about.
 * @param source The authored config the paths point into. It only decorates `message` with the ids
 * of the elements and actions a path passes; `issues` stay as they are.
 *
 * @remarks
 * `message` lists the issues one per line as `<path>: <message>`, so a log reads without parsing
 * `issues`. Use `safeValidateForm` on the engine to get the same issues as a result instead of an
 * exception.
 */
export class FormValidationError extends Error {
	readonly issues: readonly FormValidationIssue[];

	constructor(issues: readonly FormValidationIssue[], source?: unknown) {
		super(
			issues.length > 0
				? issues
						.map((issue) => {
							const path = formatIssuePath(issue.path, source);
							return path ? `${path}: ${issue.message}` : issue.message;
						})
						.join('\n')
				: 'Invalid form configuration',
		);
		this.name = 'FormValidationError';
		this.issues = issues;
	}
}
