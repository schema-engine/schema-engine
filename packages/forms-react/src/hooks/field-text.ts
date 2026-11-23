/**
 * A field value as the text of a text control: a string as it is, a number or boolean as its string, anything else as `''`.
 *
 * @remarks For a control whose value is text; a control that holds a list or a number narrows the value itself.
 */
export function fieldText(value: unknown): string {
	return typeof value === 'string'
		? value
		: typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint'
			? String(value)
			: '';
}
