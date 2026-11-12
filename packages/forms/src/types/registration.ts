import type { Brand } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type { BuilderActionBaseContext } from './actions.js';
import type { FormActionTrigger } from '../actions/triggers';
import type { ActionRegistration, ActionConfigBase } from '@schema-engine/actions';
import type { AnyValidationRegistration } from '@/schemas/validation/types';

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
		containerKind?: ContainerKind;
		/**
		 * Appearance axes this element supports (`['size']`); undeclared axes fail validation on it.
		 *
		 * @remarks Values the form, step or a containing element picks for a supported axis reach this element.
		 */
		appearanceAxes?: readonly string[];
		metadata: ElementMetadata;
		render: (props: TProps) => unknown;
		validations?: readonly AnyValidationRegistration[];
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
		containerKind?: ContainerKind;
		/**
		 * Appearance axes this element supports (`['size']`); undeclared axes fail validation on it.
		 *
		 * @remarks Values the form, step or a containing element picks for a supported axis reach this element.
		 */
		appearanceAxes?: readonly string[];
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
	TType extends string = string,
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
		/** Appearance axes each slot supports; see {@link import('@/recipes/types').RecipeSpec.appearanceAxes}. */
		appearanceAxes?: Partial<Record<import('@/recipes/types').RecipeSlot, readonly string[]>>;
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
		FormActionTrigger
	>,
	'schema' | '$type'
> & {
	$type: TType;
	schema: TSchema;
};

/** Determines how named child fields compose their value paths. */
export type ContainerKind = 'object' | 'array';

/**
 * @remarks Runtime storage erases each registration's schema and render props;
 * factories enforce their relationship before registrations enter this boundary.
 */
export type AnyElementRegistration = InputRegistration<string, any, any> | StaticRegistration<string, any, any>;

/** @remarks Runtime recipe storage accepts heterogeneous schema types checked by the recipe factory. */
export type AnyRecipeRegistration = RecipeRegistration<string, any>;

/** @remarks Runtime action storage erases concrete configuration output checked at registration time. */
export type AnyActionRegistration = BuilderActionRegistration<string, any>;
