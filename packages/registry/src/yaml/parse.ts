import { LineCounter, isNode, parseDocument } from 'yaml';
import type { Document, Node, YAMLError, YAMLWarning } from 'yaml';

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

/** The most alias expansions `toJS` allows before it gives up, which guards against alias bombs. */
const MAX_ALIAS_COUNT = 100;

/** The parser's message without the ` at line N, column N:` suffix and the code frame it appends. */
function syntaxMessage(message: string): string {
	return message.replace(/ at line \d+, column \d+:?[\s\S]*$/, '');
}

type Position = { line: number; col: number };

function samePosition(a: Position | undefined, b: Position | undefined): boolean {
	return a !== undefined && b !== undefined && a.line === b.line && a.col === b.col;
}

/** `tag:yaml.org,2002:float` as it is written in a document, `!!float`. */
function shortTag(tag: string): string {
	const prefix = 'tag:yaml.org,2002:';
	return tag.startsWith(prefix) ? `!!${tag.slice(prefix.length)}` : tag;
}

/**
 * The message an author can act on. The parser's own text often advises changing a `yaml` API call,
 * which the author of a document cannot do.
 */
function friendlyMessage(problem: YAMLError | YAMLWarning): string {
	switch (problem.code) {
		case 'MULTIPLE_DOCS':
			return 'A file holds one document; remove the extra `---`.';
		case 'MULTILINE_IMPLICIT_KEY':
			return 'Bad indentation: line this up with the keys above it, or put the whole key on one line.';
		case 'TAG_RESOLVE_FAILED': {
			const tag = /Unresolved tag: (\S+)/.exec(problem.message)?.[1];
			const name = tag ? `${shortTag(tag)} ` : '';
			return `Tags are not supported: remove ${name}and write the value plainly. Quote a string that looks like another type.`;
		}
		default:
			return syntaxMessage(problem.message);
	}
}

/**
 * Where a parser problem is reported. A `MULTILINE_IMPLICIT_KEY` starts on the line above the
 * over-indented line that ends it, so it is reported at its end.
 */
function positionOf(problem: YAMLError | YAMLWarning): Position {
	const [start, end] = problem.linePos ?? [];
	return (problem.code === 'MULTILINE_IMPLICIT_KEY' ? end : start) ?? start ?? { line: 1, col: 1 };
}

/**
 * Every parser error and warning. An over-indented line makes the parser report two errors from the
 * same place; the `BLOCK_AS_IMPLICIT_KEY` one is dropped.
 */
function parserProblems(doc: Document.Parsed): Array<{ message: string; position: Position }> {
	const multiline = doc.errors.filter((error) => error.code === 'MULTILINE_IMPLICIT_KEY');
	return [...doc.errors, ...doc.warnings]
		.filter(
			(problem) =>
				problem.code !== 'BLOCK_AS_IMPLICIT_KEY' ||
				!multiline.some((other) => samePosition(other.linePos?.[0], problem.linePos?.[0])),
		)
		.map((problem) => ({ message: friendlyMessage(problem), position: positionOf(problem) }));
}

/** The text of an error `toJS` throws, with the alias limit said in terms an author can use. */
function conversionMessage(error: unknown): string {
	if (error instanceof Error && /alias count/i.test(error.message)) {
		return `The document uses aliases (*name) more than ${MAX_ALIAS_COUNT} times in all. Write the repeated value out, or use fewer or smaller anchors.`;
	}
	return error instanceof Error ? error.message : 'The document could not be read';
}

/**
 * Parse YAML text and validate the value, returning the issues instead of throwing.
 *
 * @param text A single YAML document, read as YAML 1.2 with the core schema: only `true`, `false`,
 * `null` and numbers are special, so `no`, `on` and `yes` stay strings. A leading byte order mark is
 * ignored.
 * @param validate Called with the parsed value, only when the text is valid YAML.
 * @returns `{ success: true, data }` with what `validate` returned, or `{ success: false, issues }`
 * with each syntax error or validation issue and its line and column.
 *
 * @remarks
 * An unquoted `1.10` is the number `1.1` in every YAML version; quote it (`"1.10"`) to keep a string.
 * Multiple documents in one text are a syntax error. Tags (`!!binary`, `!!set`, `!custom`) are
 * reported as issues, so what `validate` receives is always JSON-shaped. Mapping keys are read as
 * strings: `1: a` is `{ '1': 'a' }`.
 *
 * Anchors, aliases and merge keys (`<<: *defaults`) work within the text. A text with more than 100
 * alias expansions is reported as an issue at line 1, not thrown. An issue inside a merged value
 * points at the map that merges it, because the merged keys have no place of their own.
 */
export function safeParseYaml<T>(
	text: string,
	validate: YamlValidate<T>,
	options?: YamlParseOptions,
): YamlParseResult<T> {
	const lineCounter = new LineCounter();
	const source = text.startsWith('﻿') ? text.slice(1) : text;
	const doc = parseDocument(source, {
		lineCounter,
		version: '1.2',
		schema: 'core',
		resolveKnownTags: false,
		merge: true,
		stringKeys: true,
	});

	const issue = (message: string, path: PropertyKey[], line: number, column: number): YamlIssue => {
		const found: YamlIssue = { message, path, line, column };
		if (options?.filename !== undefined) {
			found.filename = options.filename;
		}
		return found;
	};

	const problems = parserProblems(doc);
	if (problems.length > 0) {
		return {
			success: false,
			issues: problems.map(({ message, position }) => issue(message, [], position.line, position.col)),
		};
	}

	let value: unknown;
	try {
		value = doc.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
	} catch (error) {
		return { success: false, issues: [issue(conversionMessage(error), [], 1, 1)] };
	}

	const result = validate(value);
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
