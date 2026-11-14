import type { StandardSchemaIssue } from '@/lib/standard-schema';
import { issueAt, type FormValidationIssue, type Path } from './issues';

function schemaIssuePath(path: StandardSchemaIssue['path']): PropertyKey[] {
	return (path ?? []).map((segment) =>
		typeof segment === 'object' && segment !== null && 'key' in segment ? segment.key : segment,
	);
}

/** The message a schema library falls back to when it has no locale loaded, such as `zod/mini`. */
const GENERIC_SCHEMA_MESSAGE = 'Invalid input';

interface SchemaIssueDetails {
	code?: unknown;
	errors?: unknown;
	values?: unknown;
	expected?: unknown;
	origin?: unknown;
	minimum?: unknown;
	maximum?: unknown;
	inclusive?: unknown;
	format?: unknown;
	pattern?: unknown;
	keys?: unknown;
}

function issueKeys(details: SchemaIssueDetails): PropertyKey[] {
	return Array.isArray(details.keys)
		? details.keys.filter(
				(key): key is PropertyKey =>
					typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol',
			)
		: [];
}

/** A bound as a sentence: `at least 3 characters`, `less than 10`. */
function describeBound(details: SchemaIssueDetails, side: 'min' | 'max'): string | undefined {
	const bound = side === 'min' ? details.minimum : details.maximum;
	if (typeof bound !== 'number' && typeof bound !== 'bigint') return undefined;
	const exclusive = details.inclusive === false;
	const comparison = side === 'min' ? (exclusive ? 'greater than' : 'at least') : exclusive ? 'less than' : 'at most';
	const noun =
		details.origin === 'string'
			? 'character'
			: details.origin === 'array' || details.origin === 'set'
				? 'item'
				: '';
	const unit = noun ? ` ${noun}${bound === 1 || bound === 1n ? '' : 's'}` : '';
	return `${comparison} ${bound}${unit}`;
}

/**
 * What a schema issue says. A message the schema or its author wrote is kept as is; the bare
 * fallback is replaced by what the issue itself reports (the allowed values, the expected type, a
 * bound, a format).
 *
 * @remarks
 * `zod/mini` loads no locale, so its own issues all read `Invalid input`; the `code` and its details
 * carry what a reader needs. These are author diagnostics, not copy rendered to a form's users. A
 * host that loads a locale (`z.config(z.locales.en())`) gets that locale's messages untouched. A
 * schema that reports offending `keys` without a known code keeps them listed after its message.
 */
function describeSchemaIssue(issue: StandardSchemaIssue, details: SchemaIssueDetails): string {
	if (issue.message === GENERIC_SCHEMA_MESSAGE) {
		if (details.code === 'invalid_value' && Array.isArray(details.values)) {
			return `Expected one of ${details.values.map(String).join(', ')}.`;
		}
		if (details.code === 'invalid_type' && typeof details.expected === 'string') {
			return `Expected ${details.expected}.`;
		}
		const bound =
			details.code === 'too_small'
				? describeBound(details, 'min')
				: details.code === 'too_big'
					? describeBound(details, 'max')
					: undefined;
		if (bound) return `Must be ${bound}.`;
		if (details.code === 'invalid_format' && typeof details.format === 'string') {
			return details.format === 'regex' && typeof details.pattern === 'string'
				? `Must match the pattern ${details.pattern}.`
				: `Invalid ${details.format} format.`;
		}
	}
	const keys = issueKeys(details);
	return keys.length > 0 ? `${issue.message} (${keys.map(String).join(', ')})` : issue.message;
}

const PARAM_NAMES = [
	'values',
	'expected',
	'origin',
	'minimum',
	'maximum',
	'inclusive',
	'format',
	'pattern',
	'keys',
] as const satisfies ReadonlyArray<keyof SchemaIssueDetails>;

/** The code a schema issue carries and the details that code reports, left out when there is no code. */
function issueCode(details: SchemaIssueDetails): Pick<FormValidationIssue, 'code' | 'params'> {
	if (typeof details.code !== 'string') return {};
	const params: Record<string, unknown> = {};
	for (const name of PARAM_NAMES) {
		if (details[name] !== undefined) params[name] = details[name];
	}
	return { code: details.code, params };
}

function isSchemaIssue(value: unknown): value is StandardSchemaIssue {
	return typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string';
}

/** Whether a schema issue is a miss on one literal value, as a discriminator key reports. */
function missedLiteral(issue: StandardSchemaIssue): boolean {
	const { code, values } = issue as StandardSchemaIssue & SchemaIssueDetails;
	return code === 'invalid_value' && Array.isArray(values) && values.length === 1;
}

/**
 * The branch of a failed union the value was closest to, when one branch is clearly closest.
 *
 * @remarks
 * Each branch reports the issues it found, with paths relative to the union. A branch is out when the
 * value is not of its kind: an issue about the value itself (an empty path, a wrong type for that branch)
 * or a miss on a single literal value (the discriminator key of another variant). Of the rest, the closest
 * is the one with the fewest issues, and only when it is the only such branch. Any other outcome returns
 * `undefined`, so the issue stays at the union instead of pointing into a branch the value did not choose.
 * An enum of one value reads as a literal, so a branch that fails on it is out.
 */
function closestBranch(details: SchemaIssueDetails): StandardSchemaIssue[] | undefined {
	if (details.code !== 'invalid_union' || !Array.isArray(details.errors)) return undefined;
	const branches = details.errors
		.filter(Array.isArray)
		.map((branch) => branch.filter(isSchemaIssue))
		.filter(
			(branch) =>
				branch.length > 0 &&
				branch.every((issue) => schemaIssuePath(issue.path).length > 0 && !missedLiteral(issue)),
		);
	const fewest = Math.min(...branches.map((branch) => branch.length));
	const closest = branches.filter((branch) => branch.length === fewest);
	return closest.length === 1 ? closest[0] : undefined;
}

/**
 * Schema issues as form issues, each path laid under `base`, the location of the thing that was validated.
 *
 * @remarks
 * An `unrecognized_keys` issue names the object, so it becomes one issue per key, at the key itself. A
 * locale's message that names a single key is kept; one that names several is replaced per key.
 * That is where an editor or a YAML file should point, and where the engine's own check of a view's
 * unknown keys already points.
 *
 * An `invalid_union` issue is replaced by the issues of the branch the value was closest to (see
 * {@link closestBranch}), laid under the union's own path, so it points at the key that failed. A
 * union whose branches cannot be told apart keeps its one issue at the union.
 */
export function fromSchemaIssues(issues: readonly StandardSchemaIssue[], base: Path): FormValidationIssue[] {
	if (issues.length === 0) return [issueAt(base, 'Validation failed')];
	return issues.flatMap((issue) => {
		const details = issue as StandardSchemaIssue & SchemaIssueDetails;
		const path = [...base, ...schemaIssuePath(issue.path)];
		const branch = closestBranch(details);
		if (branch) return fromSchemaIssues(branch, path);
		const keys = issueKeys(details);
		if (details.code === 'unrecognized_keys' && keys.length > 0) {
			return keys.map((key) =>
				issueAt(
					[...path, key],
					issue.message === GENERIC_SCHEMA_MESSAGE || keys.length > 1
						? `Unrecognized key: ${String(key)}.`
						: issue.message,
					issueCode({ ...details, keys: [key] }),
				),
			);
		}
		return [issueAt(path, describeSchemaIssue(issue, details), issueCode(details))];
	});
}
