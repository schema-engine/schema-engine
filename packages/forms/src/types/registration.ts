// oxlint-disable no-redundant-type-constituents
import type { Brand } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type { BuilderActionBaseContext, BuilderActionTrigger } from './actions.js';
import type { ActionRegistration, ActionConfigBase } from '@schema-engine/actions';

declare global {
	namespace FormEngine {
		interface ElementRegistry {}
		interface RecipeRegistry {}
	}
}

/**
 * Input element registration - form inputs, selects, checkboxes, and interactive elements.
 *
 * `TSchema` is the concrete Standard Schema. Authoring uses its input type;
 * `render` receives its output type (defaults and transforms applied).
 *
 * @template TType - Element type identifier
 * @template TSchema - Concrete registration schema
 * @template TProps - Framework-specific props (must accept schema output)
 */
export type InputRegistration<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TProps = TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : unknown,
> = Brand<
	{
		$type: TType;
		schema: TSchema;
		metadata: ElementMetadata;
		render: (props: TProps) => unknown;
	},
	'Input'
>;

/**
 * Static element registration - display-only elements without event handlers.
 */
export type StaticRegistration<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TProps = TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : unknown,
> = Brand<
	{
		$type: TType;
		schema: TSchema;
		metadata: ElementMetadata;
		render: (props: TProps) => unknown;
	},
	'Static'
>;

/**
 * View recipe registration — code-defined wiring of shell and slot blocks.
 *
 * @template TType - Recipe type identifier
 * @template TSchema - Concrete view schema
 */
export type RecipeRegistration<
	TType extends keyof FormEngine.RecipeRegistry | string = keyof FormEngine.RecipeRegistry | string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TRender = unknown,
> = Brand<
	{
		$type: TType;
		kind: import('@/recipes/types').RecipeKind;
		slots: import('@/recipes/types').RecipeSlot[];
		schema: TSchema;
		metadata: import('@/recipes/types').RecipeMetadata;
		slotDefaults?: Partial<Record<import('@/recipes/types').RecipeSlot, Record<string, unknown>>>;
		/** Adapter render payload (shell + slot components). */
		render: TRender;
	},
	'Recipe'
>;

/**
 * Action registration object for forms.
 *
 * This extends the base ActionRegistration from @schema-engine/actions,
 * specialized with form-specific base context and trigger types.
 * Action handlers receive schema output at runtime. `schema` keeps the
 * concrete Standard Schema so authoring input and execute output stay distinct.
 *
 * @template TType - The action type identifier
 * @template TSchema - Concrete registration schema
 */
export type BuilderActionRegistration<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
> = Omit<
	ActionRegistration<
		StandardSchemaV1.InferOutput<TSchema> & ActionConfigBase<TType>,
		BuilderActionBaseContext,
		BuilderActionTrigger
	>,
	'schema' | '$type'
> & {
	$type: TType;
	schema: TSchema;
};
