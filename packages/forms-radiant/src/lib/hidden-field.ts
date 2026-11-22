/**
 * Sets a hidden input named `name` in `form` to `value`, adding it when the form has none.
 *
 * @remarks For a field a native post carries, such as the engine's CSRF token: the value is written right before the post, so it is the current one.
 */
export function setHiddenField(form: HTMLFormElement | null, name: string, value: string): void {
	if (!form) return;
	const existing = Array.from(form.querySelectorAll('input[type="hidden"]')).find(
		(input) => input instanceof HTMLInputElement && input.name === name,
	);
	if (existing instanceof HTMLInputElement) {
		existing.value = value;
		return;
	}
	const input = form.ownerDocument.createElement('input');
	input.type = 'hidden';
	input.name = name;
	input.value = value;
	form.append(input);
}
