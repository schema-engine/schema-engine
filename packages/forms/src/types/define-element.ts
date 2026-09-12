import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type { InputRegistration, StaticRegistration } from './registration';
import type { NormalizedElementConfig } from '@/lib/normalized-form-config';
import type { AnyValidationRegistration } from '@/schemas/validation/types';

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

type DefineElementRegistration<TType extends string, TSchema extends StandardSchemaV1, TProps> = {
	$type: TType;
	schema: TSchema;
	metadata: ElementMetadata;
	render: (props: TProps) => unknown;
};

type DefineInputRegistration<
	TType extends string,
	TSchema extends StandardSchemaV1,
	TProps,
> = DefineElementRegistration<TType, TSchema, TProps> & {
	validations?: readonly AnyValidationRegistration[];
};

type DefineElementArg<TType extends string, TSchema extends StandardSchemaV1, TProps> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineElementRegistration<TType, TSchema, TProps>
		: never;

type DefineInputArg<TType extends string, TSchema extends StandardSchemaV1, TProps> =
	WithNormalizedChildren<InferOutput<TSchema>> extends TProps
		? DefineInputRegistration<TType, TSchema, TProps>
		: never;

/**
 * Register an input element while preserving schema input/output inference.
 *
 * Form authors supply schema input (defaults stay optional). The render function
 * must accept schema output, with container `elements` already normalized.
 * `validations` are registered when the element is added to a form engine.
 */
export function defineInput<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TProps = WithNormalizedChildren<InferOutput<TSchema>>,
>(registration: DefineInputArg<TType, TSchema, TProps>): InputRegistration<TType, TSchema, TProps> {
	return registration as InputRegistration<TType, TSchema, TProps>;
}

/**
 * Register a display-only element while preserving schema input/output inference.
 */
export function defineStatic<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TProps = WithNormalizedChildren<InferOutput<TSchema>>,
>(registration: DefineElementArg<TType, TSchema, TProps>): StaticRegistration<TType, TSchema, TProps> {
	return registration as StaticRegistration<TType, TSchema, TProps>;
}
