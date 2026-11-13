import { checkAppearance, mergeAppearance, pickSupportedAppearance, type LayoutTheme } from '@schema-engine/layout';

/**
 * Appearance picks that reach a part of the form: the vocabulary, and what the form, step and
 * containing elements chose.
 */
export interface AppearanceScope {
	readonly axes: LayoutTheme['axes'];
	readonly inherited: Readonly<Record<string, string>>;
}

/** What {@link resolveAppearance} found for one owner in the form tree. */
export interface ResolvedAppearance {
	/** One message per problem, already prefixed with the owner's location. */
	readonly issues: string[];
	/** The pick the owner renders with. Empty means the owner carries no `appearance` key. */
	readonly selection: Record<string, string>;
	/** The scope for the owner's children: what it inherited, with its own pick laid over it. */
	readonly childScope: AppearanceScope;
}

/**
 * Walks one step of the appearance inheritance down the form tree: checks an owner's authored pick,
 * merges it over what it inherits, and keeps the axes the owner supports.
 *
 * @param owner.subject Names the owner in a message, for example `Element 'fieldSet'`.
 * @param owner.location Where the owner sits, prefixed to each issue. Empty for a standalone element.
 * @param owner.supported The axes the owner declares; an owner that declares none passes `[]`. Omit it
 * for the form and its steps, which accept every axis.
 *
 * @remarks
 * The one place the form's inheritance rule lives (form, then step, then element or view slot, a
 * closer pick winning), so the form, steps, elements and slots cannot drift apart. Walking the tree
 * stays here because only forms know its shape; the checks and merges are pure helpers in
 * `@schema-engine/layout`.
 */
export function resolveAppearance(
	authored: unknown,
	scope: AppearanceScope,
	owner: { subject: string; location: string; supported?: readonly string[] },
): ResolvedAppearance {
	const checked = checkAppearance(authored, {
		axes: scope.axes,
		subject: owner.subject,
		supported: owner.supported,
	});
	const own = mergeAppearance(scope.inherited, checked.appearance);
	return {
		issues: checked.issues.map((issue) => (owner.location ? `${owner.location}: ${issue}` : issue)),
		selection: owner.supported === undefined ? own : pickSupportedAppearance(own, owner.supported),
		childScope: { axes: scope.axes, inherited: own },
	};
}

/**
 * `config` without any authored `appearance`, plus the resolved selection when it is not empty.
 *
 * @remarks
 * An owner without a pick carries no `appearance` key at all, so a normalized config only mentions
 * appearance where it applies.
 */
export function withAppearance<T extends object>(config: T, selection: Readonly<Record<string, string>>): T {
	if (Object.keys(selection).length === 0) return withoutAppearanceKey(config);
	return { ...withoutAppearanceKey(config), appearance: selection };
}

/** `config` without an authored `appearance`, or `config` itself when it has none. */
export function withoutAppearanceKey<T extends object>(config: T): T {
	if (!('appearance' in config)) return config;
	const { appearance: _authored, ...rest } = config as T & { appearance?: unknown };
	return rest as T;
}
