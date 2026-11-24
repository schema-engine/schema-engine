import { safeParseStandardSchema, type BaseRegistration, type StandardSchemaIssue } from '@schema-engine/registry';
import type { ActionConfigBase, ParsedAction, ParsedActionSequence } from './types';

/** What {@link parseActions} needs of a registry: the registration of a `$type`, for its schema. */
export interface ActionSchemaLookup {
	getAction(type: string): Pick<BaseRegistration, 'schema'> | undefined;
}

/** What a domain tells {@link parseActions} about the entries it accepts. */
export interface ParseActionsOptions {
	/**
	 * The trigger names an entry's `triggers` may hold.
	 *
	 * @remarks Without it, any string is accepted, since the engine cannot know a domain's triggers.
	 */
	triggers?: readonly string[];
}

/**
 * What {@link parseActions} returns: the parsed sequence, or every issue found.
 *
 * @remarks
 * An issue is a Standard Schema issue whose `path` starts with the index of the entry, then the index inside
 * a group, then the path the schema reported (`[1, 0, 'endpoint']`). An entry that is not an action object
 * with a `$type`, and a `$type` no registration answers, are issues at `$type`. An empty group is an issue at its index.
 */
export type ParseActionsResult<TConfig extends ActionConfigBase = ActionConfigBase> =
	{ success: true; data: ParsedActionSequence<TConfig> } | { success: false; issues: StandardSchemaIssue[] };

type ParsedEntry<TConfig extends ActionConfigBase> =
	{ ok: true; action: ParsedAction<TConfig> } | { ok: false; issues: StandardSchemaIssue[] };

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issueAt(path: ReadonlyArray<PropertyKey>, message: string): StandardSchemaIssue {
	return { message, path };
}

/** The envelope keys the engine checks itself; a registration's schema never sees them. */
const BASE_KEYS = ['id', '$type', 'enabled', 'triggers'] as const;

function checkBase(
	entry: Record<PropertyKey, unknown>,
	path: ReadonlyArray<PropertyKey>,
	options: ParseActionsOptions | undefined,
): StandardSchemaIssue[] {
	const issues: StandardSchemaIssue[] = [];
	if (typeof entry.id !== 'string' || entry.id === '') {
		issues.push(issueAt([...path, 'id'], 'Action ID must be a non-empty string.'));
	}
	if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
		issues.push(issueAt([...path, 'enabled'], 'enabled must be a boolean.'));
	}
	const { triggers } = entry;
	if (triggers === undefined) return issues;
	if (!Array.isArray(triggers)) {
		issues.push(issueAt([...path, 'triggers'], 'triggers must be an array of trigger names.'));
		return issues;
	}
	triggers.forEach((trigger: unknown, index) => {
		if (typeof trigger !== 'string') {
			issues.push(issueAt([...path, 'triggers', index], 'A trigger must be a string.'));
		} else if (options?.triggers && !options.triggers.includes(trigger)) {
			issues.push(
				issueAt(
					[...path, 'triggers', index],
					`Unknown trigger '${trigger}'. Use one of: ${options.triggers.join(', ')}.`,
				),
			);
		}
	});
	return issues;
}

function parseEntry<TConfig extends ActionConfigBase>(
	registry: ActionSchemaLookup,
	entry: unknown,
	path: ReadonlyArray<PropertyKey>,
	options: ParseActionsOptions | undefined,
): ParsedEntry<TConfig> {
	if (!isRecord(entry) || typeof entry.$type !== 'string') {
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
	const issues = checkBase(entry, path, options);
	const base: Record<string, unknown> = {};
	const own: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(entry)) {
		if ((BASE_KEYS as readonly string[]).includes(key)) base[key] = value;
		else own[key] = value;
	}
	const result = safeParseStandardSchema(registration.schema, own);
	if (!result.success) {
		issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [...path, ...(issue.path ?? [])] })));
		return { ok: false, issues };
	}
	const { data } = result;
	if (!isRecord(data)) {
		issues.push(
			issueAt(path, `Invalid action configuration for '${entry.$type}': the schema must return an object.`),
		);
	}
	if (issues.length > 0 || !isRecord(data)) return { ok: false, issues };
	const action: ActionConfigBase = { ...data, ...base, id: entry.id as string, $type: entry.$type };
	return { ok: true, action: action as ParsedAction<TConfig> };
}

/**
 * Check serialized actions against their registrations, and return them as {@link ParsedAction}s.
 *
 * @param registry - Where each entry's `$type` finds its registration and schema
 * @param input - The sequence as it arrived, for example the result of `JSON.parse`: entries, where an array entry is a group
 * @param options - What the domain adds, such as the trigger names it accepts
 *
 * @remarks
 * This is the only way to produce a {@link ParsedAction}, and so the only way to a call of
 * {@link ActionDispatcher.dispatch}. Every entry is checked, so a sequence with two bad entries reports both.
 *
 * The engine owns the keys every entry carries: `id` (a non-empty string), `$type` (a registered one), `enabled` and
 * `triggers`. It checks them itself, then hands the remaining keys to the registration's schema, which describes
 * the action's own arguments only. The result is those keys merged with what the schema returned, so its defaults and
 * transforms apply. `TConfig` is the caller's claim about the result; the parse itself checks the schemas, not that claim.
 *
 * @throws {Error} When a registration's schema validates asynchronously, which is a misuse of the registry.
 */
export function parseActions<TConfig extends ActionConfigBase = ActionConfigBase>(
	registry: ActionSchemaLookup,
	input: unknown,
	options?: ParseActionsOptions,
): ParseActionsResult<TConfig> {
	if (!Array.isArray(input)) {
		return { success: false, issues: [issueAt([], 'Actions must be an array.')] };
	}

	const issues: StandardSchemaIssue[] = [];
	const sequence: Array<ParsedAction<TConfig> | Array<ParsedAction<TConfig>>> = [];
	const collect = (entry: unknown, path: ReadonlyArray<PropertyKey>): ParsedAction<TConfig> | undefined => {
		const parsed = parseEntry<TConfig>(registry, entry, path, options);
		if (parsed.ok) return parsed.action;
		issues.push(...parsed.issues);
		return undefined;
	};

	input.forEach((entry: unknown, index) => {
		if (Array.isArray(entry)) {
			if (entry.length === 0) {
				issues.push(issueAt([index], 'A group of actions must hold at least one action.'));
				return;
			}
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
