import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RecipeMetadata, ProtocolRecipeSlotSchemas, ProtocolRecipeSpec } from '@schema-engine/layout';
import type { RecipeKind, RecipeSlot } from './protocol';

export type { RecipeKind, RecipeSlot } from './protocol';

export type RecipeSlotSchemas = ProtocolRecipeSlotSchemas<RecipeSlot>;

export interface RecipeDescriptor {
	$type: string;
	kind: RecipeKind;
	slots: RecipeSlot[];
	metadata: RecipeMetadata;
	viewSchema: Record<string, unknown>;
}

export interface ViewCatalog {
	recipes: RecipeDescriptor[];
	rules: {
		noViewSingleStep: string;
		noViewMultiStep: string;
		oneViewPerForm: string;
	};
}

/**
 * A form recipe spec: the layout recipe spec on the forms protocol.
 *
 * @remarks
 * `appearanceAxes` is declared per slot; see {@link ProtocolRecipeSpec.appearanceAxes}.
 */
export type RecipeSpec<
	TType extends string = string,
	TSchema extends StandardSchemaV1 = StandardSchemaV1,
	TSlots extends RecipeSlotSchemas = RecipeSlotSchemas,
> = ProtocolRecipeSpec<RecipeSlot, RecipeKind, TType, TSchema, TSlots>;

/**
 * Render payload an adapter binds to a spec: `slots` holds exactly the spec's non-shell slots,
 * each required. `shell` is required only when the spec declares a shell config; a spec without
 * one may still bind a shell component (the stack shell has no config).
 *
 * @remarks
 * Adapters supply the component types, so a payload that omits a declared slot, or adds an
 * undeclared one, fails to type-check at the binding site.
 */
export type RecipeRenderPayload<TSlots extends RecipeSlotSchemas, TShell, TSlot> = ('shell' extends keyof TSlots
	? { shell: TShell }
	: { shell?: TShell }) & {
	slots: { [K in Exclude<keyof TSlots, 'shell'>]-?: TSlot };
};

export interface FormShellLayout<TNode> {
	slots: {
		header?: TNode;
		progress?: TNode;
		content: TNode;
		actions?: TNode;
	};
	viewConfig: Record<string, unknown>;
}
