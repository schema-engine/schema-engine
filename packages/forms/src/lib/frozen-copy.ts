import { isPlainObject } from './is-plain-object.js';

/**
 * A deep, frozen copy of a serializable value.
 *
 * @remarks
 * For data that crosses into an immutable snapshot, such as the `params` of an issue: a caller that keeps
 * the original and changes it later must not change what a snapshot says. Plain records and arrays are
 * copied; anything else (a primitive, or a value that is not data) is kept as it is.
 */
export function frozenCopy<T>(value: T): T {
	if (Array.isArray(value)) return Object.freeze(value.map(frozenCopy)) as T;
	if (isPlainObject(value)) {
		return Object.freeze(
			Object.fromEntries(Object.entries(value).map(([key, child]) => [key, frozenCopy(child)])),
		) as T;
	}
	return value;
}
