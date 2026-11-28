import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { BaseRegistration, ChildPath } from './types.js';

/**
 * What the tree types need of a registration: its `$type`, its schema and where its children are.
 *
 * @remarks
 * `$type` is required, unlike for {@link safeParseNode}, because `accepts` names `$type`s and the data of a child is
 * found by one.
 */
export type TreeRegistration = Pick<BaseRegistration, '$type' | 'schema' | 'childPaths'>;

type Output<TRegistration extends Pick<BaseRegistration, 'schema'>> = StandardSchemaV1.InferOutput<
	TRegistration['schema']
>;

/**
 * The keys an object type declares, without the keys an index signature (a loose schema) only allows.
 *
 * @remarks
 * A parent schema has to declare every key of a child path, so its exported JSON Schema shows the whole node. A loose
 * object type allows any key through its index signature, which does not count as declaring one.
 */
export type DeclaredKeys<T> = T extends object
	? keyof { [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: 0 }
	: never;

/**
 * Whether every key of a child path is declared, walking through optional objects.
 *
 * @remarks
 * A widened `keys` (`string[]`, from a registration that was not written with literals) is not checked.
 */
type PathDeclared<T, TKeys> = TKeys extends readonly []
	? true
	: TKeys extends readonly [infer THead extends string, ...infer TRest]
		? THead extends DeclaredKeys<NonNullable<T>>
			? PathDeclared<NonNullable<T>[THead & keyof NonNullable<T>], TRest>
			: false
		: true;

/** The child paths a registration declares that its schema output does not declare, as `{ $type, keys }`. */
type UndeclaredChildPaths<T> = T extends {
	$type: infer TType;
	schema: infer TSchema extends StandardSchemaV1;
	readonly childPaths: readonly (infer TPath)[];
}
	? unknown extends StandardSchemaV1.InferOutput<TSchema>
		? never
		: TPath extends { readonly keys: infer TKeys }
			? PathDeclared<StandardSchemaV1.InferOutput<TSchema>, TKeys> extends true
				? never
				: { $type: TType; keys: TKeys }
			: never
	: never;

/**
 * The properties of a child path entry other than `keys`, `accepts` and `list`, as `{ $type, property }`.
 *
 * @remarks
 * `createRegistry` infers its registrations with a `const` type parameter, which keeps a property the constraint does
 * not know (`accept` for `accepts`) instead of rejecting it as an excess property.
 */
type UnknownChildPathProperties<T> = T extends { $type: infer TType; readonly childPaths: readonly (infer TPath)[] }
	? TPath extends unknown
		? [Exclude<keyof TPath, keyof ChildPath>] extends [never]
			? never
			: { $type: TType; property: Exclude<keyof TPath, keyof ChildPath> }
		: never
	: never;

/**
 * What `createRegistry` intersects with its `registrations` parameter, so a child path the schema does not declare is
 * an error that names it: `Property 'childPathNotInSchema' is missing`, with the `$type` and the keys. A child path
 * entry with a property other than `keys`, `accepts` and `list` is `childPathUnknownProperty`, with the `$type` and the
 * property.
 *
 * @remarks
 * `unknown` when every path is declared and well formed, which is the identity of an intersection. A schema whose
 * output type cannot be read (`unknown`, a plain `StandardSchemaV1`) is not checked here; `safeParseTree` checks it at
 * runtime.
 */
export type CheckChildPaths<T> = ([UndeclaredChildPaths<T>] extends [never]
	? unknown
	: { readonly childPathNotInSchema: UndeclaredChildPaths<T> }) &
	([UnknownChildPathProperties<T>] extends [never]
		? unknown
		: { readonly childPathUnknownProperty: UnknownChildPathProperties<T> });

type AcceptedNames<T extends TreeRegistration> = T extends { readonly childPaths: readonly (infer TPath)[] }
	? TPath extends { readonly accepts: readonly (infer TName)[] }
		? TName
		: never
	: never;

/** The registrations whose schema output, when it can be read, declares no `$type`. */
type WithoutType<T extends TreeRegistration> = T extends unknown
	? unknown extends Output<T>
		? never
		: '$type' extends DeclaredKeys<Output<T>>
			? never
			: T['$type']
	: never;

/**
 * What `safeParseTree` intersects with its lookup: an `accepts` name the lookup lacks is `acceptsUnknownType`, and a
 * registration whose output declares no `$type` is `schemaOutputWithoutType`.
 *
 * @remarks
 * The check is here, not in `createRegistry`, because a registry is not always the whole vocabulary of a document (a
 * layout names components of another registry), while the lookup handed to `safeParseTree` is whole. Widened
 * declarations skip it.
 */
export type CheckLookup<T extends TreeRegistration> = ([Exclude<AcceptedNames<T>, T['$type']>] extends [never]
	? unknown
	: { readonly acceptsUnknownType: Exclude<AcceptedNames<T>, T['$type']> }) &
	([WithoutType<T>] extends [never] ? unknown : { readonly schemaOutputWithoutType: WithoutType<T> });

/**
 * The registrations of a union that may answer one of the names `TName`: every one whose `$type` overlaps them.
 *
 * @remarks
 * A literal `$type` overlaps when it is one of the names, a union of literals when any member is, and a widened
 * `$type` (`string`, as `BaseRegistration` has) or a missing one always does, since it may hold any name at run time.
 */
export type AcceptedOf<TAll extends TreeRegistration, TName> = TAll extends { $type: infer TType }
	? string extends TType
		? TAll
		: [Extract<TType, TName>] extends [never]
			? never
			: TAll
	: TAll;

/** The registrations a child path accepts: those {@link AcceptedOf} its `accepts`, or all without one. */
export type Accepted<TAll extends TreeRegistration, TPath> = TPath extends {
	readonly accepts: readonly (infer TName)[];
}
	? AcceptedOf<TAll, TName>
	: TAll;

/**
 * The value at a child path once its children are parsed. A list stays a list, an absent slot stays absent, and `null`
 * is not a slot value (it is an issue at runtime).
 */
type Replace<TValue, TChild, TList> = unknown extends TValue
	? (TList extends true ? TChild[] : TChild | TChild[]) | undefined
	: TValue extends undefined
		? TValue
		: TValue extends null
			? never
			: TValue extends readonly unknown[]
				? TChild[]
				: TChild;

type SetAt<T, TKeys, TPath, TAll extends TreeRegistration> = TKeys extends readonly [
	infer THead extends string,
	...infer TRest,
]
	? T extends object
		? {
				[P in keyof T]: P extends THead
					? TRest extends readonly []
						? Replace<
								T[P],
								NodeData<TAll, Accepted<TAll, TPath>>,
								TPath extends { readonly list: true } ? true : false
							>
						: SetAt<T[P], TRest, TPath, TAll>
					: T[P];
			}
		: T
	: T;

type WithChildren<T, TPaths, TAll extends TreeRegistration> = TPaths extends readonly [infer THead, ...infer TRest]
	? THead extends ChildPath
		? WithChildren<SetAt<T, THead['keys'], THead, TAll>, TRest, TAll>
		: T
	: T;

/**
 * The data of a node once its children are parsed: the schema output of the registration with each child path replaced
 * by the data of what the document holds there.
 *
 * @remarks
 * Optional stays optional, an array slot is an array and an object slot an object. A slot typed `unknown` becomes
 * `child | child[] | undefined`, and `child[] | undefined` for a path that sets `list`. The child type is computed inside the mapped property, so a registration that accepts
 * itself does not recurse eagerly. `child` is the union of the registrations the path accepts, or of the whole lookup
 * without `accepts`. A registry typed as plain `BaseRegistration` has no concrete schema to read, so its data is
 * `unknown`. A `childPaths` that lost its literal keys (a registration declared apart without `as const`) leaves the
 * schema output unchanged.
 */
export type NodeData<
	TAll extends TreeRegistration,
	TRegistration extends TreeRegistration = TAll,
> = TRegistration extends unknown ? WithChildren<Output<TRegistration>, TRegistration['childPaths'], TAll> : never;
