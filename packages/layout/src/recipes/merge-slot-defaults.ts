/**
 * @remarks
 * Duplicates the helper the forms package keeps for its own deep operations on purpose: this
 * package cannot import forms.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function mergeDeep(base: unknown, override: unknown): unknown {
	if (override === undefined) return base;
	if (!isPlainObject(base) || !isPlainObject(override)) return override;
	const merged: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		merged[key] = mergeDeep(base[key], value);
	}
	return merged;
}

/**
 * Lays a view's slot config over the recipe's `slotDefaults`, deep for plain objects.
 *
 * @remarks
 * Runs before the view schema parses, so schema defaults fill only what neither the author
 * nor the recipe set. Arrays and other non-plain values replace the default whole. A key the author sets to `undefined` keeps the recipe default.
 */
export function mergeSlotDefaults(
	view: Record<string, unknown>,
	slotDefaults: Record<string, unknown> | undefined,
): Record<string, unknown> {
	if (!slotDefaults) return view;
	const merged = { ...view };
	for (const [slot, defaults] of Object.entries(slotDefaults)) {
		merged[slot] = mergeDeep(defaults, view[slot]);
	}
	return merged;
}
