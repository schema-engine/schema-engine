import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
	CheckedChildPaths,
	DefineElementRegistration,
	InputValueDeclaration,
	ResolvedInputDeclaration,
} from '../types/define-element.js';
import type { ContainerKind, ElementChildPaths, InputRegistration, StaticRegistration } from '../types/registration.js';

/**
 * An input element without the part a renderer adds: its `$type`, schema, value declaration, container kind,
 * appearance axes and metadata.
 *
 * @remarks
 * `render` and `validations` are what a renderer binds, so a contract holds neither. `value` is required exactly when
 * there is no `childPaths`, as `defineInput` requires it, so a contract spread into `defineInput` keeps both.
 */
export type InputContract<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TValue extends StandardSchemaV1 = StandardSchemaV1,
	TKind extends ContainerKind | undefined = ContainerKind | undefined,
	TChildPaths extends ElementChildPaths | undefined = ElementChildPaths | undefined,
> = Omit<
	InputRegistration<TType, TSchema, never, TValue, TKind, TChildPaths>,
	'render' | 'validations' | 'value' | 'containerKind' | 'childPaths'
> &
	ResolvedInputDeclaration<TType, TSchema, TValue, TKind, TChildPaths>;

/** A display-only element without the `render` a renderer binds. */
export type StaticContract<TType extends string = string, TSchema extends StandardSchemaV1 = StandardSchemaV1> = Omit<
	StaticRegistration<TType, TSchema, never>,
	'render'
>;

/**
 * Declare an input element's contract, with the same checks `defineInput` makes of its schema and `value`.
 *
 * @remarks
 * Binding a renderer's `render` to the contract gives the registration `defineInput` would have built.
 */
export function defineInputContract<
	const TType extends string,
	TSchema extends StandardSchemaV1,
	TValue extends StandardSchemaV1 = never,
	const TKind extends ContainerKind | undefined = undefined,
	const TChildPaths extends ElementChildPaths | undefined = undefined,
>(
	contract: Omit<DefineElementRegistration<TType, TSchema, never>, 'render'> &
		InputValueDeclaration<TType, TSchema, TValue, TKind, TChildPaths> &
		CheckedChildPaths<TType, TSchema, TChildPaths>,
): InputContract<TType, TSchema, TValue, TKind, TChildPaths> {
	return { ...contract, kind: 'input' } as unknown as InputContract<TType, TSchema, TValue, TKind, TChildPaths>;
}

/** Declare a display-only element's contract. */
export function defineStaticContract<const TType extends string, TSchema extends StandardSchemaV1>(
	contract: Omit<DefineElementRegistration<TType, TSchema, never>, 'render'>,
): StaticContract<TType, TSchema> {
	return { ...contract, kind: 'static' } as StaticContract<TType, TSchema>;
}
