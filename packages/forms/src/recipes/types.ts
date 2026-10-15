import * as z from 'zod/mini';
import type { ComponentMetadata } from '@schema-engine/registry';

export type RecipeKind = 'single-step' | 'wizard';

export type RecipeSlot = 'shell' | 'header' | 'progress' | 'actions';

export const RECIPE_SLOT_ORDER = ['shell', 'header', 'progress', 'actions'] as const satisfies readonly RecipeSlot[];

/**
 * Base view configuration schema — recipe registrations extend this with slot keys.
 */
export const BaseViewConfigSchema = z.strictObject({
	$type: z.string().check(z.describe('Recipe type identifier')),
});

export interface RecipeMetadata extends ComponentMetadata {
	category?: string;
	example?: unknown;
	preview?: string;
}

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

export interface RecipeSpec<
	TType extends string = string,
	TSchema extends z.ZodMiniType = z.ZodMiniType,
	TSlots extends Partial<Record<RecipeSlot, z.ZodMiniType>> = Partial<Record<RecipeSlot, z.ZodMiniType>>,
> {
	$type: TType;
	kind: RecipeKind;
	slots: RecipeSlot[];
	slotSchemas: TSlots;
	slotDefaults?: Partial<Record<RecipeSlot, Record<string, unknown>>>;
	metadata: RecipeMetadata;
	schema: TSchema;
}

export interface FormShellLayout<TNode> {
	slots: {
		header?: TNode;
		progress?: TNode;
		content: TNode;
		actions?: TNode;
	};
	viewConfig: Record<string, unknown>;
}
