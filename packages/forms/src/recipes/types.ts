import { z } from 'zod';
import type { ComponentMetadata } from '@schema-engine/registry';

export type RecipeKind = 'single-step' | 'wizard';

export type RecipeSlot = 'shell' | 'header' | 'progress' | 'actions';

export const RECIPE_SLOT_ORDER = ['shell', 'header', 'progress', 'actions'] as const satisfies readonly RecipeSlot[];

/**
 * Base view configuration schema — recipe registrations extend this with slot keys.
 */
export const BaseViewConfigSchema = z
	.object({
		$type: z.string().describe('Recipe type identifier'),
	})
	.strict();

export interface RecipeMetadata extends ComponentMetadata {
	category?: string;
	deprecated?: boolean;
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

export interface RecipeSpec<TType extends string = string, TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
	$type: TType;
	kind: RecipeKind;
	slots: RecipeSlot[];
	slotSchemas: Partial<Record<RecipeSlot, z.ZodTypeAny>>;
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
