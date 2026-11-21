import { isPlainObject } from '@/lib/is-plain-object';
import type { FormStoreError } from './types';
import { createMap, join, type NullMap } from './value-tree';

/**
 * Flattens the nested errors `validateFormValues` returns into one error per dotted path.
 *
 * @remarks
 * A leaf is an object carrying a string `type` and `message`; anything else nested is a container.
 */
export function flattenErrors(errors: unknown, path = '', out: NullMap<FormStoreError> = createMap()) {
	if (isPlainObject(errors) && typeof errors.type === 'string' && typeof errors.message === 'string') {
		if (path) out[path] = Object.freeze({ type: errors.type, message: errors.message });
		return out;
	}
	if (Array.isArray(errors)) {
		errors.forEach((child, index) => flattenErrors(child, join(path, String(index)), out));
	} else if (isPlainObject(errors)) {
		for (const [key, child] of Object.entries(errors)) flattenErrors(child, join(path, key), out);
	}
	return out;
}
