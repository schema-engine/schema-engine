/** The hidden inputs this module added, so a stale one can be removed without touching an author's own. */
const owned = new WeakSet<HTMLInputElement>();

/**
 * Puts the CSRF `field` into `form` as a hidden input, or removes the one a former post left when there is none.
 *
 * @remarks
 * Written right before a native post, so the value is the current token. An input the form already has under the
 * field's name is updated, owned or not; only one this module added is ever removed.
 */
export function syncCsrfField(
	form: HTMLFormElement,
	field: { readonly name: string; readonly value: string } | undefined,
): void {
	const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));
	const marked = inputs.find((input) => owned.has(input));
	if (!field) {
		marked?.remove();
		return;
	}
	const existing = inputs.find((input) => input.name === field.name) ?? marked;
	const input = existing ?? form.ownerDocument.createElement('input');
	input.type = 'hidden';
	input.name = field.name;
	input.value = field.value;
	if (!existing) {
		owned.add(input);
		form.append(input);
	}
}
