const catalogue: Record<string, string> = {
	'form.fields.email': 'Email',
	'form.rules.password-min': 'Use at least {minLength} characters for your password',
	'form.validation.minLength': 'Use at least {minLength} characters',
	'form.validation.required': '{field} is required',
	'form.native.typeMismatch': 'Enter a valid {inputType}',
	'form.native.badInput': 'Enter a number',
	'form.submission.actionFailed': 'Something went wrong. Please try again.',
};

/**
 * The first catalogue entry among `keys`, with `{name}` filled from `values`.
 *
 * @remarks
 * A stand-in for an i18n library: the formatter of the guide only needs a lookup that takes a list of keys.
 */
export function t(keys: string[], values: Record<string, unknown> = {}): string | undefined {
	const key = keys.find((candidate) => candidate in catalogue);
	return (
		key &&
		catalogue[key]!.replace(/\{(\w+)\}/g, (_, name: string) => {
			const value = values[name];
			return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
		})
	);
}
