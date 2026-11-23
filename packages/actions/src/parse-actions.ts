import { safeParseStandardSchema, type BaseRegistration, type StandardSchemaIssue } from '@schema-engine/registry';
import type { ActionConfigBase, ParsedAction, ParsedActionSequence } from './types';

/** What {@link parseActions} needs of a registry: the registration of a `$type`, for its schema. */
export interface ActionSchemaLookup {
	getAction(type: string): Pick<BaseRegistration, 'schema'> | undefined;
}

/**
 * What {@link parseActions} returns: the parsed sequence, or every issue found.
 *
 * @remarks
 * An issue is a Standard Schema issue whose `path` starts with the index of the entry, then the index inside
 * a group, then the path the schema reported (`[1, 0, 'endpoint']`). An entry that is not an action object
 * with a `$type`, and a `$type` no registration answers, are issues at `$type`.
 */
export type ParseActionsResult<TConfig extends ActionConfigBase = ActionConfigBase> =
	{ success: true; data: ParsedActionSequence<TConfig> } | { success: false; issues: StandardSchemaIssue[] };

type ParsedEntry<TConfig extends ActionConfigBase> =
	{ ok: true; action: ParsedAction<TConfig> } | { ok: false; issues: StandardSchemaIssue[] };

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTagged(value: unknown): value is ActionConfigBase {
	return isRecord(value) && typeof value.$type === 'string';
}

function issueAt(path: ReadonlyArray<PropertyKey>, message: string): StandardSchemaIssue {
	return { message, path };
}

function parseEntry<TConfig extends ActionConfigBase>(
	registry: ActionSchemaLookup,
	entry: unknown,
	path: ReadonlyArray<PropertyKey>,
): ParsedEntry<TConfig> {
	if (!isTagged(entry)) {
		return { ok: false, issues: [issueAt([...path, '$type'], 'Invalid action configuration: missing $type.')] };
	}
	const registration = registry.getAction(entry.$type);
	if (!registration) {
		return {
			ok: false,
			issues: [
				issueAt(
					[...path, '$type'],
					`Unknown action type '${entry.$type}'. Register it in the action registry.`,
				),
			],
		};
	}
	const result = safeParseStandardSchema(registration.schema, entry);
	if (!result.success) {
		return {
			ok: false,
			issues: result.error.issues.map((issue) => ({ ...issue, path: [...path, ...(issue.path ?? [])] })),
		};
	}
	if (!isTagged(result.data)) {
		return {
			ok: false,
			issues: [
				issueAt(
					[...path, '$type'],
					`Invalid action configuration for '${entry.$type}': parsed output is missing $type.`,
				),
			],
		};
	}
	return { ok: true, action: result.data as ParsedAction<TConfig> };
}

/**
 * Check serialized actions against their registrations, and return them as {@link ParsedAction}s.
 *
 * @param registry - Where each entry's `$type` finds its registration and schema
 * @param input - The sequence as it arrived, for example the result of `JSON.parse`: entries, where an array entry is a group
 *
 * @remarks
 * This is the only way to produce a {@link ParsedAction}, and so the only way to a call of
 * {@link ActionDispatcher.dispatch}. Every entry is checked, so a sequence with two bad entries reports both.
 * The result holds what each schema returned, so its defaults and transforms apply. `TConfig` is the
 * caller's claim about the registered schemas' output; the parse itself checks the schemas, not that claim.
 *
 * @throws {Error} When a registration's schema validates asynchronously, which is a misuse of the registry.
 */
export function parseActions<TConfig extends ActionConfigBase = ActionConfigBase>(
	registry: ActionSchemaLookup,
	input: unknown,
): ParseActionsResult<TConfig> {
	if (!Array.isArray(input)) {
		return { success: false, issues: [issueAt([], 'Actions must be an array.')] };
	}

	const issues: StandardSchemaIssue[] = [];
	const sequence: Array<ParsedAction<TConfig> | Array<ParsedAction<TConfig>>> = [];
	const collect = (entry: unknown, path: ReadonlyArray<PropertyKey>): ParsedAction<TConfig> | undefined => {
		const parsed = parseEntry<TConfig>(registry, entry, path);
		if (parsed.ok) return parsed.action;
		issues.push(...parsed.issues);
		return undefined;
	};

	input.forEach((entry: unknown, index) => {
		if (Array.isArray(entry)) {
			const group = entry
				.map((member: unknown, memberIndex) => collect(member, [index, memberIndex]))
				.filter((action): action is ParsedAction<TConfig> => action !== undefined);
			sequence.push(group);
			return;
		}
		const action = collect(entry, [index]);
		if (action) sequence.push(action);
	});

	if (issues.length > 0) return { success: false, issues };
	return { success: true, data: sequence };
}
