import type { StandardSchemaV1 } from '@standard-schema/spec';
import { safeParseStandardSchema } from '@schema-engine/registry';
import { checkAppearance, mergeAppearance, pickSupportedAppearance, type SlotAppearanceAxes } from '../lib/appearance';
import type { LayoutIssue } from '../lib/layout-issue';
import type { LayoutTheme } from '../lib/layout-theme';
import { mergeSlotDefaults } from './merge-slot-defaults';

/** Appearance picks a view inherits: the theme's vocabulary, and what the containing document picked. */
export interface RecipeViewScope {
	readonly axes: LayoutTheme['axes'];
	readonly inherited: Readonly<Record<string, string>>;
}

/** The part of a recipe registration that resolving a view reads. */
export interface RecipeViewSource {
	readonly $type: string;
	readonly slots: readonly string[];
	readonly schema: StandardSchemaV1;
	readonly slotDefaults?: Readonly<Record<string, unknown>>;
	readonly appearanceAxes?: SlotAppearanceAxes;
}

/** An authored view: the recipe's `$type` and the config of its slots. */
export type RecipeViewInput = Readonly<Record<string, unknown>> & { readonly $type: string };

/**
 * What {@link resolveRecipeView} found.
 *
 * @remarks
 * `view` is present when the schema parsed and kept its `$type`; it can still come with `issues`
 * (an appearance pick that is not valid, or a key the recipe does not declare). `schemaIssues` is
 * present, with no `view`, when the schema rejected the view: the caller formats them, since only
 * the domain knows how it reports a schema's issues.
 */
export interface ResolvedRecipeView {
	/** One issue per problem, with a path relative to the view (`[slot, 'appearance', axis]`, `[key]`). */
	issues: LayoutIssue[];
	view?: Record<string, unknown>;
	schemaIssues?: StandardSchemaV1.Issue[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function withoutAppearance(config: Record<string, unknown>): Record<string, unknown> {
	if (!('appearance' in config)) return config;
	const { appearance: _authored, ...rest } = config;
	return rest;
}

/** The issue message for a view key that the recipe does not declare, shared by the view schema and {@link resolveRecipeView}. */
export function unknownViewKeyMessage($type: string, key: string, allowed: readonly string[]): string {
	return `Recipe '${$type}' does not accept view key '${key}'. Allowed: ${allowed.join(', ') || '(none)'}.`;
}

/**
 * Resolves the view a document selects for a recipe: the recipe defaults laid under the author's
 * slot config, each slot's appearance, the schema parse, and the keys the recipe does not declare.
 *
 * @param recipe - The winning registration the view's `$type` selects
 * @param view - The authored view; not changed
 * @param scope - The picks the view inherits from its document
 *
 * @remarks
 * Slot appearance follows the recipe's inheritance rule: the document's picks reach a slot for the
 * axes the recipe declares on it, and the slot's own pick wins. The authored `appearance` key is
 * removed before the slot schema parses, so a schema only has to type it, and the resolved
 * selection is written back on the slot when it is not empty. Domain rules that need the document
 * (a kind that wants one step, a default recipe) stay with the domain's validator.
 */
export function resolveRecipeView(
	recipe: RecipeViewSource,
	view: RecipeViewInput,
	scope: RecipeViewScope,
): ResolvedRecipeView {
	const issues: LayoutIssue[] = [];
	const stripped: Record<string, unknown> = { ...view };
	const resolved: Record<string, Record<string, string>> = {};
	for (const slot of recipe.slots) {
		const authoredSlot = view[slot];
		const supported = recipe.appearanceAxes?.[slot] ?? [];
		const checked = checkAppearance(isPlainRecord(authoredSlot) ? authoredSlot.appearance : undefined, {
			axes: scope.axes,
			subject: `Slot '${slot}' of recipe '${recipe.$type}'`,
			supported,
		});
		issues.push(...checked.issues.map((issue) => ({ ...issue, path: [slot, ...issue.path] })));
		const selection = pickSupportedAppearance(mergeAppearance(scope.inherited, checked.appearance), supported);
		if (Object.keys(selection).length > 0) resolved[slot] = selection;
		if (isPlainRecord(authoredSlot)) stripped[slot] = withoutAppearance(authoredSlot);
	}

	const parsed = safeParseStandardSchema(recipe.schema, mergeSlotDefaults(stripped, recipe.slotDefaults));
	if (!parsed.success) return { issues, schemaIssues: parsed.error.issues };
	const output = parsed.data;
	if (typeof output !== 'object' || output === null || !('$type' in output) || typeof output.$type !== 'string') {
		issues.push({
			path: ['$type'],
			message: `Invalid view configuration for recipe '${recipe.$type}': parsed output is missing $type.`,
		});
		return { issues };
	}

	const allowedSlots = new Set<string>(recipe.slots);
	for (const key of Object.keys(view)) {
		if (key !== '$type' && !allowedSlots.has(key)) {
			issues.push({ path: [key], message: unknownViewKeyMessage(recipe.$type, key, recipe.slots) });
		}
	}

	const next: Record<string, unknown> = { ...output };
	for (const [slot, selection] of Object.entries(resolved)) {
		const slotConfig = (output as Record<string, unknown>)[slot];
		if (isPlainRecord(slotConfig)) next[slot] = { ...slotConfig, appearance: selection };
	}
	return { issues, view: next };
}
