/**
 * Named appearance values a form picks and both renderers emit as data attributes.
 *
 * @remarks
 * The engine owns the vocabulary: which axes exist (`size`, `surface`, and any a host adds), the
 * closed list of values on each, and optionally the CSS custom properties a value stands for. The
 * form owns intent: it picks a value per axis on the form, a step, a field or a view slot.
 * `validateForm` checks the pick against the vocabulary and the registration's declared axes, and
 * writes the resolved selection into the normalized config. A renderer emits it as
 * `data-se-<axis>="<value>"` and reads nothing else, so React and Radiant share one DOM contract.
 *
 * Compile once at the engine boundary ({@link compileAppearance}). Token rules are emitted inside
 * `:where()`, so they add no specificity and an author's `className` always wins; they are scoped to
 * the engine by `data-se-appearance-theme`, so two engines with different tokens cannot overwrite
 * each other.
 */

/** Custom properties a value stands for, keyed `--name`. */
export type AppearanceTokens = Readonly<Record<`--${string}`, string | number>>;

/** An axis's values: names only (the host styles them) or names with the custom properties each sets. */
export type AppearanceAxisOptions = readonly string[] | Readonly<Record<string, AppearanceTokens>>;

/** Engine `appearance` option: axis name to its values. */
export type AppearanceOptions = Readonly<Record<string, AppearanceAxisOptions>>;

/** A pick of one value per axis. */
export type AppearanceSelection = Readonly<Record<string, string>>;

export interface CompiledAppearance {
	/** Identity of the vocabulary, written to `data-se-appearance-theme` on the form element. */
	readonly id: string;
	/** Axis name to its closed value list, built-in axes first. */
	readonly axes: Readonly<Record<string, readonly string[]>>;
	/** Token rules for every value that declares tokens. Empty when none do. */
	readonly css: string;
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
 * Axis-to-value-union map of an engine: the built-in axes extended by a host's `appearance` option.
 *
 * @remarks Typed authoring narrows `appearance` to these literals. `TOptions` should be a const-inferred option.
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

/**
 * Suffixes of the `data-se-*` attributes the renderers already write, which an axis cannot reuse.
 *
 * @remarks
 * `getAppearanceAttributes` spreads after these on the same elements, so an axis named like one
 * would overwrite it. A test scans the renderer sources for `data-se-*` names, so a renderer that
 * adds an attribute fails it until the name is listed here.
 */
export const RENDERER_DATA_ATTRIBUTES = [
	'step',
	'grid-theme',
	'appearance-theme',
	'appearance-css',
	'constraint-field',
	'constraints',
	'base-required',
	'validation-rules',
	'last-invalid',
	'row-id',
	'required-marker',
] as const;

const RESERVED_AXES: ReadonlySet<string> = new Set(RENDERER_DATA_ATTRIBUTES);

function isNameList(axis: AppearanceAxisOptions): axis is readonly string[] {
	return Array.isArray(axis);
}

function axisEntries(axis: AppearanceAxisOptions): Array<[string, AppearanceTokens]> {
	return isNameList(axis) ? axis.map((name) => [name, {}]) : Object.entries(axis);
}

function mergeAxes(options: AppearanceOptions | undefined): Map<string, Map<string, AppearanceTokens>> {
	const axes = new Map<string, Map<string, AppearanceTokens>>();
	const add = (axisName: string, entries: Array<[string, AppearanceTokens]>) => {
		if (!AXIS_NAME.test(axisName)) {
			throw new Error(
				`Invalid appearance axis name '${axisName}': use lowercase letters, digits and hyphens, starting with a letter.`,
			);
		}
		if (RESERVED_AXES.has(axisName)) {
			throw new Error(
				`Invalid appearance axis name '${axisName}': data-se-${axisName} is reserved by the renderers.`,
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

function renderTokenRules(themeId: string, axes: Map<string, Map<string, AppearanceTokens>>): string {
	const rules: string[] = [];
	for (const [axisName, values] of axes) {
		for (const [value, tokens] of values) {
			const declarations = Object.entries(tokens).map(([token, tokenValue]) => `${token}:${tokenValue};`);
			if (declarations.length === 0) continue;
			const scope = `[data-se-appearance-theme="${themeId}"]`;
			const match = `[data-se-${axisName}="${value}"]`;
			rules.push(`:where(${scope} ${match},${scope}${match}){${declarations.join('')}}`);
		}
	}
	return rules.join('\n');
}

function appearanceThemeId(axes: Map<string, Map<string, AppearanceTokens>>): string {
	const serialized = JSON.stringify([...axes].map(([axis, values]) => [axis, [...values]]));
	let hash = 5381;
	for (let index = 0; index < serialized.length; index += 1) {
		hash = ((hash << 5) + hash + serialized.charCodeAt(index)) | 0;
	}
	return `a${(hash >>> 0).toString(36)}`;
}

/**
 * Compiles an engine's `appearance` option over the built-in `size` and `surface` axes.
 *
 * @remarks
 * A host adds an axis by naming it, or extends one by listing more values: values union with the
 * built-in ones, and tokens a host sets for a built-in value are merged over the built-in tokens, per token. Axis names
 * become `data-se-<axis>` attribute names and values go into attribute selectors, so both are
 * restricted to plain identifiers. Throws on a name, value or token that is not.
 */
export function compileAppearance(options?: AppearanceOptions): CompiledAppearance {
	const axes = mergeAxes(options);
	const id = appearanceThemeId(axes);
	return Object.freeze({
		id,
		axes: Object.freeze(
			Object.fromEntries([...axes].map(([axis, values]) => [axis, Object.freeze([...values.keys()])])),
		),
		css: renderTokenRules(id, axes),
	});
}

let cachedDefaultCompiledAppearance: CompiledAppearance | undefined;

/** Frozen library-default vocabulary; shared by engines built without an `appearance` option. */
export function getDefaultCompiledAppearance(): CompiledAppearance {
	cachedDefaultCompiledAppearance ??= compileAppearance();
	return cachedDefaultCompiledAppearance;
}

/**
 * The `data-se-<axis>` attributes for a resolved selection.
 *
 * @remarks Both renderers spread this on the form, step, field host and slot elements.
 */
export function getAppearanceAttributes(appearance: AppearanceSelection | undefined): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const [axis, value] of Object.entries(appearance ?? {})) attributes[`data-se-${axis}`] = value;
	return attributes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks an authored pick against the vocabulary and, when given, the axes its owner supports.
 *
 * @param subject Names the owner in a message, for example `Element 'fieldSet'`.
 * @param supported The axes the owner declares; an owner that declares none passes `[]`. Omit it for the form and steps, which accept every axis.
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
