import type { FormValues } from '@/runtime/types.js';
import type { ValueEntry } from './types.utils.js';

/**
 * The values a form submits, read from its literal config and the engine's value entries.
 *
 * @remarks
 * The static twin of `FormEngine.submissionSchema`: it follows the same rules, so what the runtime accepts is what
 * the type says. Dotted names nest, a named container is an object of its children, a container of kind `array`
 * is a list of rows, a one-child row is the child's value, and the config's `payload` keys are added.
 *
 * A key is required only when its field has a `required` rule and neither it, a container around it nor its step has
 * `constraints` or `disabled`: any of those can leave it out. A field with the rule and a constraint is an
 * optional key of its declared type; a field without the rule is an optional key that may also hold its empty
 * value (`''` or `null`), which a submission keeps. An element whose `$type` has no entry, a static one, adds nothing.
 *
 * It falls back to {@link FormValues} when the config is not a literal: an element whose `$type` or `name` is
 * the wide `string`, as a config built at runtime has. Widening there would claim a shape nothing checks.
 */
export type ValuesOf<TConfig, TEntries extends Record<string, unknown>> = string extends keyof TEntries
	? FormValues
	: TConfig extends { readonly steps: infer TSteps extends readonly unknown[] }
		? IsLiteral<TSteps> extends true
			? Simplify<
					MergeAll<StepValues<TSteps[number], TEntries>> &
						(TConfig extends { readonly payload: infer TPayload extends object }
							? Readonly<TPayload>
							: unknown)
				>
			: FormValues
		: FormValues;

type Simplify<T> = { [K in keyof T]: T[K] };

/**
 * What an element that holds no value adds: nothing, which an intersection keeps as it is.
 *
 * @remarks
 * An object type with no keys, written as a mapped type over `never` so it reads as intent. `unknown` would also
 * be the identity of an intersection, but `Simplify` of it is not the empty object the callers expect.
 */
type Empty = { readonly [K in never]: never };

/** The intersection of the members of a union. An empty union is `unknown`, the identity of an intersection. */
type MergeAll<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : unknown;

type Mode = 'required' | 'present' | 'optional';

/** `{ [name]: V }` with the key required, optional but present as `V`, or optional and possibly empty. */
type Field<TName extends string, V, M extends Mode> = M extends 'required'
	? { readonly [K in TName]: V }
	: M extends 'present'
		? { readonly [K in TName]?: V }
		: { readonly [K in TName]?: V | '' | null };

/** A field under a dotted name nests: `address.street` is `{ address: { street } }`, required when the field is. */
type Nest<TName extends string, V, M extends Mode> = TName extends `${infer Head}.${infer Tail}`
	? M extends 'required'
		? { readonly [K in Head]: Simplify<Nest<Tail, V, M>> }
		: { readonly [K in Head]?: Simplify<Nest<Tail, V, M>> }
	: Field<TName, V, M>;

type IsLiteral<TSteps extends readonly unknown[]> = [NonLiteralStep<TSteps[number]>] extends [never] ? true : false;

type NonLiteralStep<S> = S extends { readonly elements: infer C extends readonly unknown[] }
	? NonLiteralElement<C[number]>
	: S;

type NonLiteralElement<E> = E extends { readonly $type: infer T }
	? string extends T
		? E
		: E extends { readonly name: infer N }
			? string extends N
				? E
				: ChildrenNonLiteral<E>
			: ChildrenNonLiteral<E>
	: E;

type ChildrenNonLiteral<E> = E extends { readonly elements: infer C extends readonly unknown[] }
	? NonLiteralElement<C[number]>
	: never;

/**
 * Whether a config can leave its key out: it is `disabled` (a wide `boolean` can be), or has `constraints` (a wide list can).
 *
 * @remarks The one test for an element and for a step, which has `constraints` and no `disabled`.
 */
type IsConditional<E> = E extends { readonly disabled: infer D }
	? [D] extends [false]
		? HasConstraints<E>
		: true
	: HasConstraints<E>;

type HasConstraints<E> = E extends { readonly constraints: infer C extends readonly unknown[] }
	? C extends readonly []
		? false
		: true
	: false;

type IsRequiredRule<E> = E extends { readonly rules: infer R extends readonly unknown[] }
	? R[number] extends infer Rule
		? Rule extends { readonly $type: infer T }
			? 'required' extends T
				? string extends T
					? never
					: true
				: never
			: never
		: never
	: never;

/** The mode of an element's own key, from its rule and whether it or anything around it is conditional. */
type ModeOf<E, TConditional extends boolean> = [IsRequiredRule<E>] extends [never]
	? 'optional'
	: TConditional extends true
		? 'present'
		: 'required';

type StepValues<S, TEntries extends Record<string, unknown>> = S extends {
	readonly elements: infer C extends readonly unknown[];
}
	? ElementsValues<C[number], TEntries, IsConditional<S>>
	: never;

/** The contribution of each element of a union, a union of the objects they add. */
type ElementsValues<E, TEntries extends Record<string, unknown>, TConditional extends boolean> = E extends unknown
	? Contribution<E, TEntries, TConditional>
	: never;

type Contribution<E, TEntries extends Record<string, unknown>, TAbove extends boolean> = E extends {
	readonly $type: infer T extends string;
	readonly name: infer N extends string;
}
	? T extends keyof TEntries
		? TEntries[T] extends infer Entry extends ValueEntry
			? Entry extends { readonly container: infer K }
				? ContainerContribution<E, N, K, TEntries, TAbove extends true ? true : IsConditional<E>>
				: Entry extends { readonly value: infer V }
					? Nest<N, V, ModeOf<E, TAbove extends true ? true : IsConditional<E>>>
					: Empty
			: Empty
		: Empty
	: Empty;

type ChildrenOf<E> = E extends { readonly elements: infer C extends readonly unknown[] } ? C : readonly [];

/** The object a container's children make, with its keys as the children's own modes say. */
type ChildrenObject<E, TEntries extends Record<string, unknown>, TConditional extends boolean> = Simplify<
	MergeAll<ElementsValues<ChildrenOf<E>[number], TEntries, TConditional>>
>;

type ContainerContribution<
	E,
	N extends string,
	K,
	TEntries extends Record<string, unknown>,
	TConditional extends boolean,
> = K extends 'array'
	? Nest<N, ArrayRows<E, TEntries, TConditional>, ContainerMode<E, TConditional, false>>
	: Nest<
			N,
			ChildrenObject<E, TEntries, TConditional>,
			ContainerMode<E, TConditional, HasRequiredKey<ChildrenObject<E, TEntries, TConditional>>>
		>;

/** A container is a required key when its own rule requires it or a key inside it is required. */
type ContainerMode<E, TConditional extends boolean, TInside extends boolean> =
	ModeOf<E, TConditional> extends 'required' ? 'required' : TInside extends true ? 'required' : 'present';

type HasRequiredKey<T> = {} extends T ? false : true;

/**
 * A one-child array has scalar rows, unless its `initialValues` or the child's default is a record, or the child is a
 * container that is not an array (a group or a fieldset), which makes each row an object of the array's children.
 *
 * @remarks The static twin of `usesScalarArrayItem`, which decides the same from the config.
 */
type ArrayRows<E, TEntries extends Record<string, unknown>, TConditional extends boolean> =
	ChildrenOf<E> extends readonly [infer Only]
		? E extends { readonly initialValues: object }
			? Array<ChildrenObject<E, TEntries, TConditional>>
			: Only extends { readonly defaultValue: object }
				? Array<ChildrenObject<E, TEntries, TConditional>>
				: IsObjectContainer<Only, TEntries> extends true
					? Array<ChildrenObject<E, TEntries, TConditional>>
					: Array<RowValue<Only, TEntries, TConditional>>
		: Array<ChildrenObject<E, TEntries, TConditional>>;

/** Whether an element holds children that make an object: a container that is not an array and is not empty. */
type IsObjectContainer<E, TEntries extends Record<string, unknown>> = E extends {
	readonly $type: infer T extends string;
}
	? T extends keyof TEntries
		? TEntries[T] extends { readonly container: infer K }
			? K extends 'array'
				? false
				: ChildrenOf<E> extends readonly []
					? false
					: true
			: false
		: false
	: false;

/** The value of a scalar row: its child's own value, as a field or as a container. */
type RowValue<E, TEntries extends Record<string, unknown>, TConditional extends boolean> = E extends {
	readonly $type: infer T extends string;
}
	? T extends keyof TEntries
		? TEntries[T] extends infer Entry extends ValueEntry
			? Entry extends { readonly container: infer K }
				? K extends 'array'
					? ArrayRows<E, TEntries, TConditional>
					: ChildrenObject<E, TEntries, TConditional>
				: Entry extends { readonly value: infer V }
					? ModeOf<E, TConditional> extends 'optional'
						? V | '' | null
						: V
					: never
			: never
		: never
	: never;

type DefaultOf<T> = T extends readonly (infer Row)[]
	? Array<DefaultRow<Row>>
	: T extends Blob
		? T | null
		: T extends object
			? { [K in keyof T]?: DefaultOf<Exclude<T[K], undefined>> }
			: T | '' | null | undefined;

/**
 * A row of a list default, which is as the values type has it.
 *
 * @remarks
 * A row is not a field of its own, so it gains no empty value here: an optional scalar row already has it in the values
 * type (`ValuesOf`), and the rows of an array-valued leaf, such as a checkbox group, have none, because its declared
 * schema rejects them. A record row is partial, as a default may give some of its keys.
 */
type DefaultRow<T> = T extends readonly (infer Row)[]
	? Array<DefaultRow<Row>>
	: T extends Blob
		? T
		: T extends object
			? { [K in keyof T]?: DefaultOf<Exclude<T[K], undefined>> }
			: T;

/**
 * What a form may start from: its values with every key optional at every depth, and an empty value in place of any leaf.
 *
 * @remarks
 * A default is a start, not a submission: a field may be left out, empty or only partly given (one row of a list, one
 * key of an object). Only a leaf has an empty value (`''` or `null`, where its own type allows it): the empty value of a
 * list or a group is its empty list or object. A form whose values type is {@link FormValues} takes any record, as
 * `defaultValues` did.
 * Whether a value is the one its field declares is checked when the runtime is created.
 */
export type DefaultValuesOf<TValues> = { [K in keyof TValues]?: DefaultOf<Exclude<TValues[K], undefined>> };
