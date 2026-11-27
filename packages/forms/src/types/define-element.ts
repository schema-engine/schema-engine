import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type { ContainerKind, InputRegistration, StaticRegistration, ValueDeclaration } from './registration';
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

export type DefineElementRegistration<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TProps,
	TKind extends ContainerKind | undefined = ContainerKind | undefined,
> = {
	$type: TType;
	schema: TSchema;
	metadata: ElementMetadata;
	containerKind?: TKind;
	appearanceAxes?: AppearanceAxisList;
	render: (props: TProps) => unknown;
};

/**
 * What an input declares about its value, by one rule: `value` is required exactly when its schema output has no `elements`.
 *
 * @remarks
 * A schema that declares `elements` makes the element a container, whose value the engine composes from its children,
 * so it declares no `value` and may set `containerKind` (`'object'` when it does not). Any other input must declare
 * `value`, which is how a registration whose control writes a value the engine cannot check is a type error. A schema
 * that merely allows any key (an index signature) does not declare `elements`.
 */
export type InputValueDeclaration<TSchema extends StandardSchemaV1, TValue extends StandardSchemaV1> =
	DeclaresChildren<InferOutput<TSchema>> extends true
		? { containerKind?: ContainerKind; value?: never }
		: { containerKind?: undefined; value: ValueDeclaration<WithNormalizedChildren<InferOutput<TSchema>>, TValue> };

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
> = DefineElementRegistration<TType, TSchema, TProps, TKind> & {
	validations?: readonly ValidationRegistrationConstraint[];
} & InputValueDeclaration<TSchema, TValue>;

type DefineElementArg<TType extends string, TSchema extends StandardSchemaV1, TProps> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineElementRegistration<TType, TSchema, TProps>
		: never;

type DefineInputArg<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TProps,
	TValue extends StandardSchemaV1,
	TKind extends ContainerKind | undefined,
> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineInputRegistration<TType, TSchema, TProps, TValue, TKind>
		: never;

/**
 * Register an input element while preserving schema input/output inference.
 *
 * Form authors supply schema input (defaults stay optional). The render function
 * must accept schema output, with container `elements` already normalized.
 * `validations` are registered when the element is added to a form engine.
 *
 * `value` declares the value the control writes, as a function of the configured element
 * (see {@link ValueDeclaration}); it is required unless the schema has `elements`.
 *
 * It sets the registration's `kind` to `'input'`, which is what the engine reads to require `value`, not the metadata category.
 */
export function defineInput<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TProps = WithNormalizedChildren<InferOutput<TSchema>>,
	TValue extends StandardSchemaV1 = never,
	const TKind extends ContainerKind | undefined = undefined,
>(
	registration: DefineInputArg<TType, TSchema, TProps, TValue, TKind>,
): InputRegistration<TType, TSchema, TProps, TValue, TKind> {
	return { ...registration, kind: 'input' } as unknown as InputRegistration<TType, TSchema, TProps, TValue, TKind>;
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
