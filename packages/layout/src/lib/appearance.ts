import {
	createRegistry,
	type BaseRegistration,
	type ReadOnlyRegistry,
	type RegistrationMetadata,
} from '@schema-engine/registry';
import * as z from 'zod/mini';
import type { LayoutTheme, LayoutThemeCompilerOptions } from './layout-theme';

/**
 * Appearance axes a document picks values on and renderers emit as data attributes.
 *
 * @remarks
 * An axis is one independent dimension of appearance, with two to five named values. Each value
 * stands for a set of semantic CSS tokens, which components read; components never read an axis
 * value. The theme declares the axes ({@link defineAxis}, stored in a registry), a registration
 * declares which axes it responds to, and a document picks values that pass down.
 *
 * A domain checks the pick against the vocabulary and the owner's declared axes
 * ({@link checkAppearance}), merges it with the pick it inherits ({@link mergeAppearance}), and a
 * renderer emits the result as `data-se-<axis>="<value>"` ({@link getAppearanceAttributes}).
 * Walking the document tree to inherit picks belongs to the domain, because only it knows the
 * tree's shape.
 *
 * Compile once, where the theme is built ({@link createLayoutTheme} does, with the grid). Token rules are
 * emitted inside `:where()`, so they add no specificity and an author's `className` always wins; they
 * are scoped to the theme by `data-se-theme`, so two themes with different tokens cannot overwrite
 * each other.
 */

/** Custom properties a value stands for, keyed `--name`. */
export type AppearanceTokens = Readonly<Record<`--${string}`, string | number>>;

/** A pick of one value per axis. */
export type AppearanceSelection = Readonly<Record<string, string>>;

/**
 * An appearance axis, stored in a registry like every other registration.
 *
 * @remarks
 * `schema` is a Standard Schema that accepts exactly the value names, which satisfies the
 * registry's build check and is what a catalog or JSON Schema export lists. {@link defineAxis}
 * produces it.
 */
export interface AxisRegistration<
	TName extends string = string,
	TValue extends string = string,
> extends BaseRegistration<unknown, RegistrationMetadata> {
	readonly $type: TName;
	/** Each value name and the semantic tokens it stands for. */
	readonly values: Readonly<Record<TValue, AppearanceTokens>>;
	/**
	 * The value that stands for no pick.
	 *
	 * @remarks
	 * A component's own CSS fallbacks are the look of this value, so a document that picks it looks
	 * like one that picks nothing. To make that true under an inherited pick, a default value that
	 * leaves the tokens to the component sets them to `initial`: a custom property set to `initial`
	 * makes `var(--token, fallback)` use its fallback, so a step that picks `default` inside a
	 * `compact` form undoes the compact tokens.
	 */
	readonly default: TValue;
}

/** Any axis registration, whatever its name and values. */
export type AnyAxisRegistration = AxisRegistration;

/** A registry of axes, as {@link createLayoutTheme} builds it. */
export type AxisRegistry = ReadOnlyRegistry<AnyAxisRegistration>;

/** Input to {@link defineAxis}. */
export interface AxisDefinition<TName extends string, TValues extends Readonly<Record<string, AppearanceTokens>>> {
	/** The axis name, which becomes the `data-se-<axis>` attribute and the key of a pick. */
	readonly $type: TName;
	/** Each value name and the semantic tokens it stands for. Two to five values. */
	readonly values: TValues;
	/** One of the value names. */
	readonly default: keyof TValues & string;
	readonly metadata: RegistrationMetadata;
}

const AXIS_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VALUE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const UNSAFE_TOKEN_VALUE = /[{};<]|\/\*/;
const MIN_AXIS_VALUES = 2;
const MAX_AXIS_VALUES = 5;

/**
 * Throws when an axis name is one a domain reserves.
 *
 * @remarks The one place the message lives, shared by the compiler and by {@link assertAxesNotReserved}.
 */
export function assertAxisNotReserved(axisName: string, reserved: ReadonlySet<string>): void {
	if (reserved.has(axisName)) {
		throw new Error(`Invalid appearance axis name '${axisName}': data-se-${axisName} is reserved by the renderer.`);
	}
}

/**
 * Throws when an axis is not a usable one: a bad name, fewer than two or more than five values, a
 * value that would break a selector, a token that is not a custom property, or a `default` that is
 * not a value.
 *
 * @remarks
 * Axis names become `data-se-<axis>` attribute names and values go into attribute selectors, so
 * both are restricted to plain identifiers. {@link defineAxis} and the compiler both run this, so an
 * object that did not come from `defineAxis` is held to the same rules.
 */
function assertValidAxis(axis: AnyAxisRegistration): void {
	const name = axis.$type;
	if (!AXIS_NAME.test(name)) {
		throw new Error(
			`Invalid appearance axis name '${name}': use lowercase letters, digits and hyphens, starting with a letter.`,
		);
	}
	const entries = Object.entries(axis.values);
	if (entries.length < MIN_AXIS_VALUES || entries.length > MAX_AXIS_VALUES) {
		throw new Error(
			`Invalid appearance axis '${name}': an axis has ${MIN_AXIS_VALUES} to ${MAX_AXIS_VALUES} values, found ${entries.length}. A raw value is a token override, not an axis value.`,
		);
	}
	if (!Object.hasOwn(axis.values, axis.default)) {
		throw new Error(
			`Invalid appearance axis '${name}': default '${axis.default}' is not one of its values (${entries.map(([value]) => value).join(', ')}).`,
		);
	}
	for (const [value, tokens] of entries) {
		if (!VALUE_NAME.test(value)) {
			throw new Error(
				`Invalid appearance value '${value}' on axis '${name}': use letters, digits, hyphens and underscores.`,
			);
		}
		for (const [token, tokenValue] of Object.entries(tokens)) {
			if (!token.startsWith('--') || token.length < 3) {
				throw new Error(
					`Invalid appearance token '${token}' on '${name}.${value}': tokens are CSS custom properties and start with '--'.`,
				);
			}
			if (UNSAFE_TOKEN_VALUE.test(String(tokenValue))) {
				throw new Error(`Invalid appearance token value for '${token}' on '${name}.${value}'.`);
			}
		}
	}
}

/**
 * Defines an appearance axis: one independent dimension of appearance with a small closed set of
 * named values.
 *
 * @remarks
 * Each value stands for a set of semantic CSS custom properties (`--se-space`, `--se-shadow`) that
 * components read; components never read the axis value. A token names a role, not a component, so
 * it means the same on every component that reads it. A value that sets a token to `initial`
 * hands it back to the component's own fallback. Appearance only: structure is slot config or the grid.
 *
 * The axis carries a Standard Schema that accepts exactly its value names. Throws on an axis with
 * a name that is not a lowercase identifier, fewer than 2 or more than 5 values, a value name that
 * would break a selector, a token that is not a custom property or has an unsafe value, or a
 * `default` that is not one of the values.
 */
export function defineAxis<
	const TName extends string,
	const TValues extends Readonly<Record<string, AppearanceTokens>>,
>(definition: AxisDefinition<TName, TValues>): AxisRegistration<TName, keyof TValues & string> {
	const axis: AxisRegistration<TName, keyof TValues & string> = {
		$type: definition.$type,
		values: definition.values,
		default: definition.default,
		metadata: definition.metadata,
		schema: z
			.enum(Object.keys(definition.values) as [string, ...string[]])
			.check(z.describe(definition.metadata.description ?? definition.metadata.name)),
	};
	assertValidAxis(axis);
	return Object.freeze(axis);
}

const sizeAxis = defineAxis({
	$type: 'size',
	metadata: {
		name: 'Size',
		description: 'How much room components take: spacing, type size and readable width.',
	},
	default: 'default',
	values: {
		compact: {
			'--se-space': 'var(--se-space-compact, 1rem)',
			'--se-font-size': '0.875rem',
			'--se-measure': '24rem',
		},
		default: {
			'--se-space': 'initial',
			'--se-font-size': 'initial',
			'--se-measure': 'initial',
		},
		comfortable: {
			'--se-space': 'var(--se-space-comfortable, 2rem)',
			'--se-font-size': '1.0625rem',
			'--se-measure': '32rem',
		},
	},
});

const surfaceAxis = defineAxis({
	$type: 'surface',
	metadata: {
		name: 'Surface',
		description: 'How a container sets itself apart: border, shadow and background.',
	},
	default: 'elevated',
	values: {
		flat: {
			'--se-border-width': '0',
			'--se-shadow': 'none',
			'--se-surface-background': 'initial',
		},
		outlined: {
			'--se-border-width': '1px',
			'--se-shadow': 'none',
			'--se-surface-background': 'initial',
		},
		elevated: {
			'--se-border-width': 'initial',
			'--se-shadow': 'initial',
			'--se-surface-background': 'initial',
		},
	},
});

/**
 * The axes every layout theme starts from: `size` (compact, default, comfortable) and `surface`
 * (flat, outlined, elevated).
 *
 * @remarks
 * The tokens are renderer-neutral and name no host theme. `size.default` and the background of
 * `surface.elevated` are `initial`, which hands the token back to the component's own fallback, so
 * a renderer's fallbacks, which it maps to its host theme, stay in force and `size: default`
 * looks like no pick, also inside a `compact` form. Override an axis by listing another
 * with the same `$type` after these: `createLayoutTheme({ appearance: [...builtInAxes, mine] })`.
 */
export const builtInAxes = [sizeAxis, surfaceAxis] as const;

/** The value names of an axis registration. */
type AxisValueNames<TAxis> = TAxis extends AxisRegistration<string, infer V> ? V : never;

type Flatten<T> = { [K in keyof T]: T[K] & string };

type AxesOfTuple<TAxes extends readonly AnyAxisRegistration[]> = TAxes extends readonly [
	...infer Rest extends readonly AnyAxisRegistration[],
	infer Last extends AnyAxisRegistration,
]
	? Omit<AxesOfTuple<Rest>, Last['$type']> & { [K in Last['$type']]: AxisValueNames<Last> }
	: unknown;

/**
 * Axis-to-value-union map of a theme: the axes a host lists in `appearance`, the last of a name winning.
 *
 * @remarks Typed authoring narrows a pick to these literals. `TAxes` should be a const-inferred list;
 * a list that is not a tuple, or a member typed as a plain `AnyAxisRegistration` (name `string`),
 * widens to any axis name and any value.
 */
export type ResolvedAppearanceAxes<TAxes extends readonly AnyAxisRegistration[] = typeof builtInAxes> =
	number extends TAxes['length'] ? Record<string, string> : Flatten<AxesOfTuple<TAxes>>;

/** Built-in axes and their values, as literal types, for typed authoring. */
export type BuiltInAppearanceAxes = ResolvedAppearanceAxes;

/** The axes an element or a recipe slot declares it supports. */
export type AppearanceAxisList = readonly string[];

/** The axes each slot of a recipe supports, keyed by slot name. */
export type SlotAppearanceAxes<TSlot extends PropertyKey = string> = { [K in TSlot]?: AppearanceAxisList };

/** Authoring shape of a pick: any declared axis, restricted to its values. */
export type AppearanceInput<TAxes extends Record<string, string>> = { readonly [A in keyof TAxes]?: TAxes[A] };

/** A theme's compiled appearance vocabulary. */
export interface CompiledAppearance {
	/** The axes, last registration of a `$type` winning, in first-registration order. */
	readonly registry: AxisRegistry;
	/** Axis name to its closed value list. */
	readonly axes: Readonly<Record<string, readonly string[]>>;
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
	for (const axis of appearance.registry.all()) {
		for (const [value, tokens] of Object.entries(axis.values)) {
			const declarations = Object.entries(tokens).map(([token, tokenValue]) => `${token}:${tokenValue};`);
			if (declarations.length === 0) continue;
			const match = `[data-se-${axis.$type}="${value}"]`;
			rules.push(`:where(${scope} ${match},${scope}${match}){${declarations.join('')}}`);
		}
	}
	return rules.join('\n');
}

/**
 * Compiles a list of axes into the theme's appearance vocabulary.
 *
 * @param axes - The axes of the theme; defaults to {@link builtInAxes}. A later axis with the same
 * `$type` replaces the earlier one, so `[...builtInAxes, mine]` overrides.
 *
 * @remarks
 * Stores the axes with `createRegistry`, so each needs a Standard Schema, and holds every winner to
 * the rules {@link defineAxis} states. Throws on an invalid axis and on one named in `reservedNames`.
 */
export function compileAppearance(
	axes: readonly AnyAxisRegistration[] = builtInAxes,
	compiler: LayoutThemeCompilerOptions = {},
): CompiledAppearance {
	const registry = createRegistry<AnyAxisRegistration>('Axis', axes);
	const reserved = new Set(compiler.reservedNames);
	for (const axis of registry.all()) {
		assertValidAxis(axis);
		assertAxisNotReserved(axis.$type, reserved);
	}
	return Object.freeze({
		registry,
		axes: Object.freeze(
			Object.fromEntries(registry.all().map((axis) => [axis.$type, Object.freeze(Object.keys(axis.values))])),
		),
	});
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
	options: { axes: LayoutTheme['axes']; subject: string; supported?: readonly string[] },
): { issues: string[]; appearance: Record<string, string> } {
	const issues: string[] = [];
	const appearance: Record<string, string> = {};
	if (authored === undefined) return { issues, appearance };
	if (!isRecord(authored)) {
		return { issues: ['appearance: expected an object of axis names to values.'], appearance };
	}
	const declared = Object.keys(options.axes).join(', ');
	for (const [axis, value] of Object.entries(authored)) {
		const values = Object.hasOwn(options.axes, axis) ? options.axes[axis] : undefined;
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
