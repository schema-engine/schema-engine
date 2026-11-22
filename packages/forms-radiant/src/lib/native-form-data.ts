/**
 * The entries a native post sends for a submission's values, named as the controls name them.
 *
 * @remarks
 * Nested values use dotted names (`address.street`), and an array of records indexed ones
 * (`contacts.0.email`), as the rows of an array render. An array of plain values repeats its name, as a
 * multiple select or a group of checkboxes does, and an array of files is one entry for each file. `null`
 * and `undefined` send nothing, a boolean follows the native checkbox (`true` sends `'on'`, `false` sends nothing),
 * and every other plain value is its text.
 */
export function nativeEntries(values: Readonly<Record<string, unknown>>): Array<[string, string | Blob]> {
	const entries: Array<[string, string | Blob]> = [];
	const add = (name: string, value: unknown): void => {
		if (value === null || value === undefined) return;
		if (value instanceof Blob) {
			entries.push([name, value]);
		} else if (Array.isArray(value)) {
			value.forEach((item: unknown, index) => {
				const isPlain = item === null || typeof item !== 'object' || item instanceof Blob;
				add(isPlain ? name : `${name}.${index}`, item);
			});
		} else if (typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) add(`${name}.${key}`, child);
		} else if (typeof value === 'string') {
			entries.push([name, value]);
		} else if (typeof value === 'boolean') {
			if (value) entries.push([name, 'on']);
		} else if (typeof value === 'number' || typeof value === 'bigint') {
			entries.push([name, String(value)]);
		}
	};
	for (const [key, value] of Object.entries(values)) add(key, value);
	return entries;
}

/**
 * Replaces what a form is about to send with the submission's values, keeping the entries in `keep`.
 *
 * @remarks
 * Meant for the `formdata` event of the inner form, right before a native post: the DOM holds controls that
 * took no part (hidden by a constraint, disabled) and lacks what travels with every submission (the config's
 * `payload`), so the container's passed values are the one source of what is posted.
 */
export function replaceFormData(
	formData: FormData,
	values: Readonly<Record<string, unknown>>,
	keep: ReadonlyArray<{ readonly name: string; readonly value: string }> = [],
): void {
	for (const name of new Set(formData.keys())) formData.delete(name);
	for (const [name, value] of nativeEntries(values)) formData.append(name, value);
	for (const { name, value } of keep) formData.set(name, value);
}
