import * as z from 'zod/mini';

export const RESERVED_HTML_ATTRIBUTE_KEYS = new Set([
	'$type',
	'name',
	'id',
	'value',
	'defaultValue',
	'checked',
	'defaultChecked',
	'type',
	'disabled',
	'readonly',
	'readOnly',
	'required',
	'className',
	'class',
	'style',
	'ref',
	'key',
	'children',
	'dangerouslySetInnerHTML',
]);

export const HtmlAttributeValueSchema = z.union([z.string(), z.number(), z.boolean()]);

function htmlAttributesAreAllowed(record: Record<string, unknown>): boolean {
	for (const key of Object.keys(record)) {
		if (RESERVED_HTML_ATTRIBUTE_KEYS.has(key)) {
			return false;
		}
		if (/^on[a-z]/i.test(key)) {
			return false;
		}
	}
	return true;
}

export const HtmlAttributesSchema = z
	.record(z.string(), z.optional(HtmlAttributeValueSchema))
	.check(
		z.refine(htmlAttributesAreAllowed, {
			message: 'htmlAttributes cannot contain reserved control props or event handlers',
		}),
	)
	.check(z.describe('Extra attributes forwarded to the focusable control (for example data-testid)'));

export type HtmlAttributes = z.infer<typeof HtmlAttributesSchema>;

/**
 * Merges optional field `htmlAttributes` under engine control props (identity, a11y, disabled).
 *
 * @remarks
 * Pass static control props only. Wire event handlers on the JSX node after spreading the result.
 */
export function mergeControlProps<const TControl extends Record<string, unknown>>(
	controlProps: TControl,
	htmlAttributes?: HtmlAttributes | null,
): TControl {
	if (!htmlAttributes) {
		return controlProps;
	}

	const passthrough = Object.fromEntries(
		Object.entries(htmlAttributes).filter((entry): entry is [string, string | number | boolean] => {
			return entry[1] !== undefined;
		}),
	);

	return { ...passthrough, ...controlProps };
}
