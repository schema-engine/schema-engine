import type { Brand } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ElementMetadata } from './metadata';
import type { WithNormalizedChildren } from './define-element';
import type { BuilderActionBaseContext } from './actions.js';
import type { FormActionTrigger } from '../actions/triggers';
import type {
	ActionRegistration,
	ActionConfigBase,
	AnyActionRegistration as ActionsAnyActionRegistration,
} from '@schema-engine/actions';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
import type { AppearanceAxisList, RecipeMetadata, SlotAppearanceAxes } from '@schema-engine/layout';

/**
 * Input element registration - form inputs, selects, checkboxes, and interactive elements.
 *
 * `TSchema` is the concrete Standard Schema. Authoring uses its input type;
 * `render` receives its output type (defaults and transforms applied).
 *
 * @template TType - Element type identifier
 * @template TSchema - Concrete registration schema
 * @template TProps - Framework-specific props (must accept schema output)
 * @template TValue - Schema of the value the control writes, as {@link ValueDeclaration} returns it
 * @template TKind - The `containerKind` the registration declares, which the form's values type reads
 */
export type InputRegistration<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TProps = TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : unknown,
	TValue extends StandardSchemaV1 = StandardSchemaV1,
	TKind extends ContainerKind | undefined = ContainerKind | undefined,
> = {
	$type: TType;
	/** Set by `defineInput`: an input holds a value, or is a container whose value is its children's. See {@link ElementKind}. */
	kind: 'input';
	schema: TSchema;
	containerKind?: TKind;
	/**
	 * Appearance axes this element supports (`['size']`); undeclared axes fail validation on it.
	 *
	 * @remarks Values the form, step or a containing element picks for a supported axis reach this element.
	 */
	appearanceAxes?: AppearanceAxisList;
	metadata: ElementMetadata;
	render: (props: TProps) => unknown;
	validations?: readonly ValidationRegistrationConstraint[];
	/**
	 * The value this element's control writes, as a schema of its configured instance.
	 *
	 * @remarks
	 * Required by `defineInput` exactly when the schema output has no `elements`: a container declares none,
	 * since the engine composes its value from its children. The engine checks each submission against it,
	 * and `createFormEngine` rejects an input that has none. See {@link ValueDeclaration}.
	 */
	value?: ValueDeclaration<WithNormalizedChildren<StandardSchemaV1.InferOutput<TSchema>>, TValue>;
};

/**
 * The value schema of one configured element: the Standard Schema of what its control writes.
 *
 * @remarks
 * A function of the configuration so the check can be exact: a select's `options` become an enum (an array of it
 * with `multiple`) and a rating's `max` a bound. The schema describes the value of a field that was written; that
 * a field may be absent, or empty, is the form's business (see `FormEngine.submissionSchema`). Any Standard
 * Schema works; a JSON Schema of the submission is exported only where these schemas can produce one.
 */
export type ValueDeclaration<TConfig = never, TValue extends StandardSchemaV1 = StandardSchemaV1> = (
	config: TConfig,
) => TValue;

/**
 * What an element registration is, which `defineInput` and `defineStatic` set and the engine reads.
 *
 * @remarks
 * The two helpers build the same kind of object otherwise, so the kind is the one thing that says whether the
 * element holds a value: an `input` must declare `value` unless its schema declares `elements`, and a `static`
 * element declares none, whatever its metadata says. A registration written by hand states its `kind`, and the
 * engine rejects one that does not.
 */
export type ElementKind = 'input' | 'static';

/**
 * Static element registration - display-only elements without event handlers.
 */
export type StaticRegistration<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TProps = TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : unknown,
> = {
	$type: TType;
	/** Set by `defineStatic`: a static element holds no value. See {@link ElementKind}. */
	kind: 'static';
	schema: TSchema;
	/**
	 * Appearance axes this element supports (`['size']`); undeclared axes fail validation on it.
	 *
	 * @remarks Values the form, step or a containing element picks for a supported axis reach this element.
	 */
	appearanceAxes?: AppearanceAxisList;
	metadata: ElementMetadata;
	render: (props: TProps) => unknown;
};

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
		metadata: RecipeMetadata;
		slotDefaults?: Partial<Record<import('@/recipes/types').RecipeSlot, Record<string, unknown>>>;
		/** Appearance axes each slot supports; see {@link import('@/recipes/types').RecipeSpec.appearanceAxes}. */
		appearanceAxes?: SlotAppearanceAxes<import('@/recipes/types').RecipeSlot>;
		/**
		 * The schema of each declared slot; see {@link import('@schema-engine/layout').ProtocolRecipeRegistration.slotSchemas}.
		 *
		 * @remarks
		 * The JSON Schema export reads it to list each slot. A registration written by hand may leave it out.
		 */
		slotSchemas?: Readonly<Partial<Record<import('@/recipes/types').RecipeSlot, StandardSchemaV1>>>;
		/** Adapter render payload (shell + slot components). */
		render: TRender;
	},
	'Recipe'
>;

/**
 * The arguments of an action as its schema types them, or nothing when the schema takes none.
 *
 * @remarks
 * A schema for no arguments, such as `z.object({})`, types its input and output as `Record<string, never>`. Intersected with the base keys it
 * would turn `id` and every other base key into `never`, so it stands for no arguments instead.
 */
export type ActionArguments<TOutput> = string extends keyof TOutput
	? TOutput[string] extends never
		? unknown
		: TOutput
	: TOutput;

/**
 * The config of a form action: the keys the engine owns plus the output of the registration's schema.
 *
 * @template TType - The action type identifier
 * @template TSchema - The registration's schema, which lists the action's own arguments only
 */
export type BuilderActionConfig<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
> = ActionConfigBase<TType> & ActionArguments<StandardSchemaV1.InferOutput<TSchema>>;

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
	ActionRegistration<BuilderActionConfig<TType, TSchema>, BuilderActionBaseContext, FormActionTrigger>,
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
export type AnyActionRegistration = ActionsAnyActionRegistration<BuilderActionBaseContext, FormActionTrigger>;
