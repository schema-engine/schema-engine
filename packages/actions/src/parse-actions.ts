import {
	safeParseNode,
	safeParseStandardSchema,
	standardSchema,
	type BaseRegistration,
	type NodeLookup,
	type RegistryIssue,
	type StandardSchemaIssue,
} from '@schema-engine/registry';
import type { ActionConfigBase, ParsedAction, ParsedActionSequence } from './types';

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
 * a group, then the path the schema reported (`[1, 0, 'endpoint']`). Each entry is checked by `safeParseNode`, so its
 * issues sit where that function puts them: an entry that is not an object at the entry, and a missing or unregistered
 * `$type` at `$type`. An unregistered `$type` says where to register it ({@link NodeLookup.hint}). An empty group is an issue at its index.
 * An issue the registry creates has its namespaced `code` (`registry/unregistered-type` with `received`, say); the ones
 * of the engine's own checks have none.
 */
export type ParseActionsResult<TConfig extends ActionConfigBase = ActionConfigBase> =
	{ success: true; data: ParsedActionSequence<TConfig> } | { success: false; issues: RegistryIssue[] };

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issueAt(path: ReadonlyArray<PropertyKey>, message: string): StandardSchemaIssue {
	return { message, path };
}

const DEFAULT_HINT = 'Register it in the action registry.';

/** The envelope keys the engine checks itself; a registration's schema never sees them. */
const BASE_KEYS = ['id', '$type', 'enabled', 'triggers'] as const;

function checkBase(
	entry: Record<PropertyKey, unknown>,
	options: ParseActionsOptions | undefined,
): StandardSchemaIssue[] {
	const issues: StandardSchemaIssue[] = [];
	if (typeof entry.id !== 'string' || entry.id === '') {
		issues.push(issueAt(['id'], 'Action ID must be a non-empty string.'));
	}
	if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
		issues.push(issueAt(['enabled'], 'enabled must be a boolean.'));
	}
	const { triggers } = entry;
	if (triggers === undefined) return issues;
	if (!Array.isArray(triggers)) {
		issues.push(issueAt(['triggers'], 'triggers must be an array of trigger names.'));
		return issues;
	}
	triggers.forEach((trigger: unknown, index) => {
		if (typeof trigger !== 'string') {
			issues.push(issueAt(['triggers', index], 'A trigger must be a string.'));
		} else if (options?.triggers && !options.triggers.includes(trigger)) {
			issues.push(
				issueAt(
					['triggers', index],
					`Unknown trigger '${trigger}'. Use one of: ${options.triggers.join(', ')}.`,
				),
			);
		}
	});
	return issues;
}

/**
 * The schema of a whole entry: the envelope keys the engine checks, then the remaining keys checked by the
 * registration's schema, merged into the parsed action.
 *
 * @remarks
 * `safeParseNode` runs it only once it has found the registration, so the entry is an object with a registered
 * `$type`. Its issues are relative to the entry; `safeParseNode` puts the entry's path in front.
 */
function entrySchema(
	type: string,
	own: BaseRegistration['schema'],
	options: ParseActionsOptions | undefined,
): BaseRegistration['schema'] {
	return standardSchema((value) => {
		const entry = value as Record<PropertyKey, unknown>;
		const issues = checkBase(entry, options);
		const base: Record<string, unknown> = {};
		const rest: Record<string, unknown> = {};
		for (const [key, field] of Object.entries(entry)) {
			if ((BASE_KEYS as readonly string[]).includes(key)) base[key] = field;
			else rest[key] = field;
		}
		const result = safeParseStandardSchema(own, rest);
		if (!result.success) return { issues: [...issues, ...result.error.issues] };
		const { data } = result;
		if (!isRecord(data)) {
			const message = `Invalid action configuration for '${type}': the schema must return an object.`;
			return { issues: [...issues, issueAt([], message)] };
		}
		if (issues.length > 0) return { issues };
		return { value: { ...data, ...base, id: entry.id, $type: type } };
	});
}

/**
 * Check serialized actions against their registrations, and return them as {@link ParsedAction}s.
 *
 * @param registry - Where each entry's `$type` finds its registration and schema: a registry of either kind, or any
 * {@link NodeLookup}. Its `hint` ends the message of an unregistered `$type`; without one the sentence is
 * `Register it in the action registry.`
 * @param input - The sequence as it arrived, for example the result of `JSON.parse`: entries, where an array entry is a group
 * @param options - What the domain adds, such as the trigger names it accepts
 *
 * @remarks
 * This is the only way to produce a {@link ParsedAction}, and so the only way to a call of
 * {@link ActionDispatcher.dispatch}. Every entry is checked, so a sequence with two bad entries reports both.
 *
 * Each entry is a node, checked with `safeParseNode` from `@schema-engine/registry` like any other node. The engine
 * owns the keys every entry carries: `id` (a non-empty string), `$type` (a registered one), `enabled` and
 * `triggers`. It checks them itself, then hands the remaining keys to the registration's schema, which describes
 * the action's own arguments only. The result is those keys merged with what the schema returned, so its defaults and
 * transforms apply. `TConfig` is the caller's claim about the result; the parse itself checks the schemas, not that claim.
 *
 * @throws {Error} When a registration's schema validates asynchronously, which is a misuse of the registry.
 */
export function parseActions<TConfig extends ActionConfigBase = ActionConfigBase>(
	registry: NodeLookup<Pick<BaseRegistration, 'schema'>>,
	input: unknown,
	options?: ParseActionsOptions,
): ParseActionsResult<TConfig> {
	if (!Array.isArray(input)) {
		return { success: false, issues: [issueAt([], 'Actions must be an array.')] };
	}

	const entries: NodeLookup<Pick<BaseRegistration, 'schema'>> = {
		get(type) {
			const registration = registry.get(type);
			return registration && { schema: entrySchema(type, registration.schema, options) };
		},
		hint: registry.hint ?? DEFAULT_HINT,
	};
	const issues: StandardSchemaIssue[] = [];
	const sequence: Array<ParsedAction<TConfig> | Array<ParsedAction<TConfig>>> = [];
	const collect = (entry: unknown, path: ReadonlyArray<PropertyKey>): ParsedAction<TConfig> | undefined => {
		const parsed = safeParseNode(entries, entry, { path });
		if (parsed.success) return parsed.data as ParsedAction<TConfig>;
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
