import { LineCounter, isNode, parseDocument } from 'yaml';
import type { Document, Node } from 'yaml';

/** One segment of a Standard Schema issue path: a key, or `{ key }` as Standard Schema allows. */
type PathSegment = PropertyKey | { readonly key: PropertyKey };

/**
 * A validator for the parsed value, in the shape of Standard Schema issues. It must be synchronous.
 *
 * @remarks
 * `engine.safeValidateForm` from `@schema-engine/forms` fits as it is. For a Standard Schema
 * (`zod`, `valibot`, ...), wrap its `~standard.validate` and return `{ success: true, data }` or
 * `{ success: false, issues }`.
 */
export type YamlValidate<T> = (
	value: unknown,
) =>
	| { success: true; data: T }
	| { success: false; issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PathSegment> }> };

/**
 * A problem found in a YAML document, placed in its source text.
 *
 * @remarks
 * `line` and `column` count from 1. For a validation issue they point at the start of the value the
 * `path` names; when the path names a key the document does not have, they point at the nearest
 * ancestor that exists. A syntax error has an empty `path` and the position the parser reports.
 */
export type YamlIssue = {
	message: string;
	path: PropertyKey[];
	line: number;
	column: number;
	filename?: string;
};

/** What {@link safeParseYaml} returns: the validated data, or every issue found. */
export type YamlParseResult<T> = { success: true; data: T } | { success: false; issues: YamlIssue[] };

export type YamlParseOptions = {
	/** Name of the file the text came from; it prefixes error messages and is set on each issue. */
	filename?: string;
};

/**
 * Thrown by {@link parseYaml} when the text is not valid YAML or its value does not validate.
 *
 * @remarks
 * `message` lists the issues one per line as `<file>:<line>:<column> <path>: <message>`, so a log
 * reads without parsing `issues`.
 */
export class YamlDocumentError extends Error {
	readonly issues: YamlIssue[];

	constructor(issues: YamlIssue[]) {
		super(issues.length > 0 ? issues.map(formatIssue).join('\n') : 'Invalid YAML document');
		this.name = 'YamlDocumentError';
		this.issues = issues;
	}
}

/** A path as it reads in an error message: `steps[0].elements[2].grid.width`. */
function formatPath(path: PropertyKey[]): string {
	let text = '';
	for (const key of path) {
		if (typeof key === 'number') {
			text += `[${key}]`;
		} else {
			text += text ? `.${String(key)}` : String(key);
		}
	}
	return text;
}

function formatIssue(issue: YamlIssue): string {
	const location = issue.filename
		? `${issue.filename}:${issue.line}:${issue.column}`
		: `line ${issue.line}, column ${issue.column}`;
	const path = formatPath(issue.path);
	return path ? `${location} ${path}: ${issue.message}` : `${location} ${issue.message}`;
}

function toKey(segment: PathSegment): PropertyKey {
	return typeof segment === 'object' ? segment.key : segment;
}

/**
 * The source node a path names, or the nearest ancestor that exists when the document lacks the
 * last keys of the path.
 */
function nodeForPath(doc: Document.Parsed, path: PropertyKey[]): Node | null {
	for (let length = path.length; length > 0; length--) {
		const node = doc.getIn(path.slice(0, length), true);
		if (isNode(node) && node.range) {
			return node;
		}
	}
	return doc.contents?.range ? doc.contents : null;
}

/** The parser's message without the ` at line N, column N:` suffix and the code frame it appends. */
function syntaxMessage(message: string): string {
	return message.replace(/ at line \d+, column \d+:?[\s\S]*$/, '');
}

/**
 * Parse YAML text and validate the value, returning the issues instead of throwing.
 *
 * @param text A single YAML document, read as YAML 1.2 with the core schema: only `true`, `false`,
 * `null` and numbers are special, so `no`, `on` and `yes` stay strings.
 * @param validate Called with the parsed value, only when the text is valid YAML.
 * @returns `{ success: true, data }` with what `validate` returned, or `{ success: false, issues }`
 * with each syntax error or validation issue and its line and column.
 *
 * @remarks
 * An unquoted `1.10` is the number `1.1` in every YAML version; quote it (`"1.10"`) to keep a string.
 * Multiple documents in one text are a syntax error. Anchors and aliases work within the text.
 */
export function safeParseYaml<T>(
	text: string,
	validate: YamlValidate<T>,
	options?: YamlParseOptions,
): YamlParseResult<T> {
	const lineCounter = new LineCounter();
	const doc = parseDocument(text, { lineCounter, version: '1.2', schema: 'core' });

	const issue = (message: string, path: PropertyKey[], line: number, column: number): YamlIssue => {
		const found: YamlIssue = { message, path, line, column };
		if (options?.filename !== undefined) {
			found.filename = options.filename;
		}
		return found;
	};

	if (doc.errors.length > 0) {
		return {
			success: false,
			issues: doc.errors.map((error) => {
				const start = error.linePos?.[0];
				return issue(syntaxMessage(error.message), [], start?.line ?? 1, start?.col ?? 1);
			}),
		};
	}

	const result = validate(doc.toJS());
	if (result.success) {
		return { success: true, data: result.data };
	}
	return {
		success: false,
		issues: result.issues.map((found) => {
			const path = (found.path ?? []).map(toKey);
			const node = nodeForPath(doc, path);
			const start = node?.range ? lineCounter.linePos(node.range[0]) : { line: 1, col: 1 };
			return issue(found.message, path, start.line, start.col);
		}),
	};
}

/**
 * Parse YAML text and validate the value, throwing when either fails.
 *
 * @throws {YamlDocumentError} With each syntax error or validation issue and its line and column.
 * {@link safeParseYaml} returns them instead.
 */
export function parseYaml<T>(text: string, validate: YamlValidate<T>, options?: YamlParseOptions): T {
	const result = safeParseYaml(text, validate, options);
	if (!result.success) {
		throw new YamlDocumentError(result.issues);
	}
	return result.data;
}
