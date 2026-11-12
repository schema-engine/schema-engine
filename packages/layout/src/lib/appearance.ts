/**
 * Named appearance values a document picks and renderers emit as data attributes.
 *
 * @remarks
 * The theme owns the vocabulary: which axes exist (`size`, `surface`, and any a host adds), the
 * closed list of values on each, and optionally the CSS custom properties a value stands for. The
 * document owns intent: it picks a value per axis on the document, a container, an item or a slot.
 * A domain checks the pick against the vocabulary and the owner's declared axes
 * ({@link checkAppearance}), merges it with the pick it inherits ({@link mergeAppearance}), and a
 * renderer emits the result as `data-se-<axis>="<value>"` ({@link getAppearanceAttributes}).
 * Walking the document tree to inherit picks belongs to the domain, because only it knows the
 * tree's shape.
 *
 * Compile once at the engine boundary ({@link createLayoutTheme} does, with the grid). Token rules are
 * emitted inside `:where()`, so they add no specificity and an author's `className` always wins; they
 * are scoped to the theme by `data-se-theme`, so two engines with different tokens cannot overwrite
 * each other.
 */

/** Custom properties a value stands for, keyed `--name`. */
export type AppearanceTokens = Readonly<Record<`--${string}`, string | number>>;

/** An axis's values: names only (the host styles them) or names with the custom properties each sets. */
export type AppearanceAxisOptions = readonly string[] | Readonly<Record<string, AppearanceTokens>>;

/** The `appearance` option of a theme: axis name to its values. */
export type AppearanceOptions = Readonly<Record<string, AppearanceAxisOptions>>;

/** A pick of one value per axis. */
export type AppearanceSelection = Readonly<Record<string, string>>;

export interface CompiledAppearance {
	/** Axis name to its closed value list, built-in axes first. */
	readonly axes: Readonly<Record<string, readonly string[]>>;
	/** The custom properties each value sets, by axis and value. Values that set none are empty. */
	readonly tokens: Readonly<Record<string, Readonly<Record<string, AppearanceTokens>>>>;
}

const BUILT_IN_APPEARANCE = {
	size: {
		compact: {
			'--se-size-padding': 'var(--space-block, 1rem)',
			'--se-size-max-width': '24rem',
			'--se-size-font-size': '0.875rem',
		},
		default: {
			'--se-size-padding': 'var(--space-block-lg, 1.5rem)',
			'--se-size-max-width': '28rem',
			'--se-size-font-size': '1rem',
		},
		comfortable: {
			'--se-size-padding': 'var(--space-block-xl, 2rem)',
			'--se-size-max-width': '32rem',
			'--se-size-font-size': '1.0625rem',
		},
	},
	surface: {
		flat: {
			'--se-surface-border-width': '0',
			'--se-surface-shadow': 'none',
		},
		outlined: {
			'--se-surface-border-width': '1px',
			'--se-surface-shadow': 'none',
		},
		elevated: {
			'--se-surface-border-width': '1px',
			'--se-surface-shadow': '0 8px 24px color-mix(in srgb, var(--on-surface, #000) 10%, transparent)',
		},
	},
} as const satisfies Record<string, Record<string, AppearanceTokens>>;

/** Built-in axes and their values, as literal types, for typed authoring. */
export type BuiltInAppearanceAxes = {
	[A in keyof typeof BUILT_IN_APPEARANCE]: keyof (typeof BUILT_IN_APPEARANCE)[A];
};

/** Value names of one axis option: the list entries, or the keys of a token map. */
type AppearanceAxisValueNames<TAxis> = TAxis extends readonly (infer V extends string)[]
	? V
	: TAxis extends Readonly<Record<infer V extends string, unknown>>
		? V
		: never;

/**
 * Axis-to-value-union map of a theme: the built-in axes extended by a host's `appearance` option.
 *
 * @remarks Typed authoring narrows a pick to these literals. `TOptions` should be a const-inferred option.
 */
export type ResolvedAppearanceAxes<TOptions extends AppearanceOptions = Record<never, never>> = {
	[A in keyof BuiltInAppearanceAxes | (keyof TOptions & string)]:
		| (A extends keyof BuiltInAppearanceAxes ? BuiltInAppearanceAxes[A] : never)
		| (A extends keyof TOptions ? AppearanceAxisValueNames<TOptions[A]> : never);
};

/** The axes an element or a recipe slot declares it supports. */
export type AppearanceAxisList = readonly string[];

/** The axes each slot of a recipe supports, keyed by slot name. */
export type SlotAppearanceAxes<TSlot extends PropertyKey = string> = { [K in TSlot]?: AppearanceAxisList };

/** Authoring shape of a pick: any declared axis, restricted to its values. */
export type AppearanceInput<TAxes extends Record<string, string>> = { readonly [A in keyof TAxes]?: TAxes[A] };

const AXIS_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VALUE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const UNSAFE_TOKEN_VALUE = /[{};<]|\/\*/;

function isNameList(axis: AppearanceAxisOptions): axis is readonly string[] {
	return Array.isArray(axis);
}

function axisEntries(axis: AppearanceAxisOptions): Array<[string, AppearanceTokens]> {
	return isNameList(axis) ? axis.map((name) => [name, {}]) : Object.entries(axis);
}

function mergeAxes(
	options: AppearanceOptions | undefined,
	reserved: ReadonlySet<string>,
): Map<string, Map<string, AppearanceTokens>> {
	const axes = new Map<string, Map<string, AppearanceTokens>>();
	const add = (axisName: string, entries: Array<[string, AppearanceTokens]>) => {
		if (!AXIS_NAME.test(axisName)) {
			throw new Error(
				`Invalid appearance axis name '${axisName}': use lowercase letters, digits and hyphens, starting with a letter.`,
			);
		}
		if (reserved.has(axisName)) {
			throw new Error(
				`Invalid appearance axis name '${axisName}': data-se-${axisName} is reserved by the renderer.`,
			);
		}
		const values = axes.get(axisName) ?? new Map<string, AppearanceTokens>();
		axes.set(axisName, values);
		for (const [value, tokens] of entries) {
			if (!VALUE_NAME.test(value)) {
				throw new Error(
					`Invalid appearance value '${value}' on axis '${axisName}': use letters, digits, hyphens and underscores.`,
				);
			}
			for (const [token, tokenValue] of Object.entries(tokens)) {
				if (!token.startsWith('--') || token.length < 3) {
					throw new Error(
						`Invalid appearance token '${token}' on '${axisName}.${value}': tokens are CSS custom properties and start with '--'.`,
					);
				}
				if (UNSAFE_TOKEN_VALUE.test(String(tokenValue))) {
					throw new Error(`Invalid appearance token value for '${token}' on '${axisName}.${value}'.`);
				}
			}
			values.set(value, { ...values.get(value), ...tokens });
		}
	};
	for (const [axisName, values] of Object.entries(BUILT_IN_APPEARANCE)) add(axisName, Object.entries(values));
	for (const [axisName, axis] of Object.entries(options ?? {})) add(axisName, axisEntries(axis));
	return axes;
}

/**
 * The token rules of a compiled appearance, scoped to the layout theme with the given id.
 *
 * @remarks
 * Every rule sits inside `:where()`, so it adds no specificity, and matches both a descendant of the
 * theme root and the root itself. Empty when no value declares tokens.
 */
export function getAppearanceCss(appearance: CompiledAppearance, themeId: string): string {
	const rules: string[] = [];
	const scope = `[data-se-theme="${themeId}"]`;
	for (const [axisName, values] of Object.entries(appearance.axes)) {
		for (const value of values) {
			const declarations = Object.entries(appearance.tokens[axisName]?.[value] ?? {}).map(
				([token, tokenValue]) => `${token}:${tokenValue};`,
			);
			if (declarations.length === 0) continue;
			const match = `[data-se-${axisName}="${value}"]`;
			rules.push(`:where(${scope} ${match},${scope}${match}){${declarations.join('')}}`);
		}
	}
	return rules.join('\n');
}

/** Inputs to {@link compileAppearance} that come from the domain rather than the author. */
export interface AppearanceCompilerOptions {
	/**
	 * Suffixes of the `data-se-*` attributes the domain's renderers already write, which an axis cannot reuse.
	 *
	 * @remarks
	 * {@link getAppearanceAttributes} spreads after a renderer's own attributes on the same elements, so
	 * an axis named like one would overwrite it. Each domain lists its own, so this package hard-codes none.
	 */
	readonly reservedNames?: readonly string[];
}

/**
 * Compiles an `appearance` option over the built-in `size` and `surface` axes.
 *
 * @remarks
 * A host adds an axis by naming it, or extends one by listing more values: values union with the
 * built-in ones, and tokens a host sets for a built-in value are merged over the built-in tokens, per token. Axis names
 * become `data-se-<axis>` attribute names and values go into attribute selectors, so both are
 * restricted to plain identifiers. Throws on a name, value or token that is not, and on an axis named in `reservedNames`.
 */
export function compileAppearance(
	options?: AppearanceOptions,
	compiler: AppearanceCompilerOptions = {},
): CompiledAppearance {
	const axes = mergeAxes(options, new Set(compiler.reservedNames));
	return Object.freeze({
		axes: Object.freeze(
			Object.fromEntries([...axes].map(([axis, values]) => [axis, Object.freeze([...values.keys()])])),
		),
		tokens: Object.freeze(
			Object.fromEntries(
				[...axes].map(([axis, values]) => [axis, Object.freeze(Object.fromEntries(values))] as const),
			),
		),
	});
}

let cachedDefaultCompiledAppearance: CompiledAppearance | undefined;

/** Frozen library-default vocabulary; shared by every theme built without an `appearance` option. */
export function getDefaultCompiledAppearance(): CompiledAppearance {
	cachedDefaultCompiledAppearance ??= compileAppearance();
	return cachedDefaultCompiledAppearance;
}

/**
 * The `data-se-<axis>` attributes for a resolved selection.
 *
 * @remarks A renderer spreads this on every element that carries a pick.
 */
export function getAppearanceAttributes(appearance: AppearanceSelection | undefined): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const [axis, value] of Object.entries(appearance ?? {})) attributes[`data-se-${axis}`] = value;
	return attributes;
}

/**
 * A child's picks laid over the picks it inherits: the child's value wins per axis.
 *
 * @remarks Pure merge; checking that the child's axes are valid is {@link checkAppearance}'s job.
 */
export function mergeAppearance(
	inherited: AppearanceSelection | undefined,
	own: AppearanceSelection | undefined,
): Record<string, string> {
	return { ...inherited, ...own };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks an authored pick against the vocabulary and, when given, the axes its owner supports.
 *
 * @param subject Names the owner in a message, for example `Element 'fieldSet'`.
 * @param supported The axes the owner declares; an owner that declares none passes `[]`. Omit it for an owner that accepts every axis.
 * @returns One message per problem, without a location prefix, and the valid picks.
 */
export function checkAppearance(
	authored: unknown,
	options: { axes: CompiledAppearance['axes']; subject: string; supported?: readonly string[] },
): { issues: string[]; appearance: Record<string, string> } {
	const issues: string[] = [];
	const appearance: Record<string, string> = {};
	if (authored === undefined) return { issues, appearance };
	if (!isRecord(authored)) {
		return { issues: ['appearance: expected an object of axis names to values.'], appearance };
	}
	const declared = Object.keys(options.axes).join(', ');
	for (const [axis, value] of Object.entries(authored)) {
		const values = options.axes[axis];
		if (!values) {
			issues.push(`appearance.${axis}: unknown axis '${axis}'. Declared axes: ${declared}.`);
			continue;
		}
		if (options.supported !== undefined && !options.supported.includes(axis)) {
			const supported = options.supported.length > 0 ? options.supported.join(', ') : '(none)';
			issues.push(
				`appearance.${axis}: ${options.subject} does not support the axis '${axis}'. Supported axes: ${supported}.`,
			);
			continue;
		}
		if (typeof value !== 'string') {
			issues.push(`appearance.${axis}: expected one of ${values.join(', ')}.`);
			continue;
		}
		if (!values.includes(value)) {
			issues.push(`appearance.${axis}: '${value}' is not a value of '${axis}'. Allowed: ${values.join(', ')}.`);
			continue;
		}
		appearance[axis] = value;
	}
	return { issues, appearance };
}

/** Keeps the axes an owner supports. An owner that declares none keeps none. */
export function pickSupportedAppearance(
	selection: AppearanceSelection,
	supported: readonly string[] | undefined,
): Record<string, string> {
	const picked: Record<string, string> = {};
	for (const axis of supported ?? []) {
		const value = selection[axis];
		if (value !== undefined) picked[axis] = value;
	}
	return picked;
}
