import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type {
	ContainerKind,
	ElementChildPaths,
	InputRegistration,
	StaticRegistration,
	ValueDeclaration,
} from './registration';
import type { NormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
import type { AppearanceAxisList } from '@schema-engine/layout';

type InferOutput<TSchema> = TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : never;

/**
 * Rewrite container `elements` to the normalized children the renderer receives.
 * Parent schemas only require `$type`; the engine supplies frozen, validated children.
 */
export type WithNormalizedChildren<T> = T extends { elements: unknown[] }
	? Omit<T, 'elements'> & { readonly elements: ReadonlyArray<NormalizedElementConfig> }
	: T;

export type ElementRenderProps<TSchema extends StandardSchemaV1, THandlers = unknown> = WithNormalizedChildren<
	InferOutput<TSchema>
> & {
	/** Stable array-item identity overlaid at render time. Not part of authoring. */
	instanceId?: string;
} & THandlers;

export type DefineElementRegistration<TType extends string, TSchema extends StandardSchemaV1, TProps> = {
	$type: TType;
	schema: TSchema;
	metadata: ElementMetadata;
	appearanceAxes?: AppearanceAxisList;
	render: (props: TProps) => unknown;
};

/** The declarations of a container: where its children are, and how they make its value. It declares no `value`. */
type ContainerDeclaration<
	TKind extends ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined,
> = {
	childPaths: TChildPaths & ElementChildPaths;
	containerKind?: TKind;
	value?: never;
};

/**
 * The declarations of an input that is not a container: it declares `value`, and neither `childPaths` nor
 * `containerKind`. A schema that declares `elements` is the migration error instead: the required
 * `elementsWithoutChildPaths` names the `$type` to fix.
 */
type ValueDeclarationOf<TType extends string, TSchema extends StandardSchemaV1, TValue extends StandardSchemaV1> =
	DeclaresChildren<InferOutput<TSchema>> extends true
		? {
				readonly elementsWithoutChildPaths: TType;
				childPaths?: undefined;
				containerKind?: undefined;
				value?: never;
			}
		: {
				childPaths?: undefined;
				containerKind?: undefined;
				value: ValueDeclaration<WithNormalizedChildren<InferOutput<TSchema>>, TValue>;
			};

/**
 * What an input declares about its value, by one rule: it declares `childPaths` (a container) or it declares `value`.
 *
 * @remarks
 * A container holds its children under `elements`, so its value is its children's and it declares no `value`; it may
 * set `containerKind` (`'object'` when it does not). Any other input must declare `value`, which is how a registration
 * whose control writes a value the engine cannot check is a type error, and it cannot set `containerKind`. A schema
 * that declares `elements` without `childPaths` is the migration error: the required `elementsWithoutChildPaths` names
 * the `$type` to fix. A schema that merely allows any key (an index signature) does not declare `elements`.
 *
 * A union, so that `childPaths` and `containerKind` are inferred from the argument itself and never from a condition on
 * a type parameter that is still being inferred.
 */
export type InputValueDeclaration<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TValue extends StandardSchemaV1,
	TKind extends ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined,
> = ContainerDeclaration<TKind, TChildPaths> | ValueDeclarationOf<TType, TSchema, TValue>;

/** {@link InputValueDeclaration} of an input whose `childPaths` is known: the one declaration it has. */
export type ResolvedInputDeclaration<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TValue extends StandardSchemaV1,
	TKind extends ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined,
> = [TChildPaths] extends [ElementChildPaths]
	? ContainerDeclaration<TKind, TChildPaths>
	: ValueDeclarationOf<TType, TSchema, TValue>;

/** Whether a schema output declares `elements`: a key of its own, or an array typed beside an index signature. */
type DeclaresChildren<TOutput> = 'elements' extends keyof TOutput
	? string extends keyof TOutput
		? TOutput extends { elements?: readonly unknown[] }
			? true
			: false
		: true
	: false;

type DefineInputRegistration<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TProps,
	TValue extends StandardSchemaV1,
	TKind extends ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined,
> = DefineElementRegistration<TType, TSchema, TProps> & {
	validations?: readonly ValidationRegistrationConstraint[];
} & InputValueDeclaration<TType, TSchema, TValue, TKind, TChildPaths>;

/**
 * The argument of `defineStatic`: a display-only element holds no children, so a schema that declares `elements` is the
 * migration error, the required `elementsWithoutChildPaths`. A container is made with `defineInput`.
 */
type DefineElementArg<TType extends string, TSchema extends StandardSchemaV1, TProps> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineElementRegistration<TType, TSchema, TProps> &
				(DeclaresChildren<InferOutput<TSchema>> extends true
					? { readonly elementsWithoutChildPaths: TType }
					: unknown)
		: never;

type DefineInputArg<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TProps,
	TValue extends StandardSchemaV1,
	TKind extends ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined,
> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineInputRegistration<TType, TSchema, TProps, TValue, TKind, TChildPaths>
		: never;

/**
 * Register an input element while preserving schema input/output inference.
 *
 * Form authors supply schema input (defaults stay optional). The render function
 * must accept schema output, with container `elements` already normalized.
 * `validations` are registered when the element is added to a form engine.
 *
 * `value` declares the value the control writes, as a function of the configured element
 * (see {@link ValueDeclaration}); it is required unless the input is a container, which declares
 * `childPaths: [{ keys: ['elements'], list: true }]` instead (see {@link ElementChildPaths}).
 *
 * It sets the registration's `kind` to `'input'`, which is what the engine reads to require `value`, not the metadata category.
 */
export function defineInput<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TProps = WithNormalizedChildren<InferOutput<TSchema>>,
	TValue extends StandardSchemaV1 = never,
	const TKind extends ContainerKind | undefined = undefined,
	const TChildPaths extends ElementChildPaths | undefined = undefined,
>(
	registration: DefineInputArg<TType, TSchema, TProps, TValue, TKind, TChildPaths>,
): InputRegistration<TType, TSchema, TProps, TValue, TKind, TChildPaths> {
	return { ...registration, kind: 'input' } as unknown as InputRegistration<
		TType,
		TSchema,
		TProps,
		TValue,
		TKind,
		TChildPaths
	>;
}

/**
 * Register a display-only element while preserving schema input/output inference.
 *
 * It sets the registration's `kind` to `'static'`, so the engine asks it for no `value`, whatever its metadata category.
 */
export function defineStatic<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TProps = WithNormalizedChildren<InferOutput<TSchema>>,
>(registration: DefineElementArg<TType, TSchema, TProps>): StaticRegistration<TType, TSchema, TProps> {
	return { ...registration, kind: 'static' } as StaticRegistration<TType, TSchema, TProps>;
}
