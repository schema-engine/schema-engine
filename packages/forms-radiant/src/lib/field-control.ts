import { registerFieldControl } from '@ecopages/radiant-ui/form';

/**
 * Coerces a store value to the string a value control holds.
 *
 * @remarks
 * Strings pass through; numbers, booleans and bigints are stringified. `null`, `undefined` and
 * values with no sensible text form (objects, arrays, symbols, functions) become `''` instead of
 * `'[object Object]'`.
 */
function toControlString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
	return '';
}

/**
 * Registers a form-associated host whose `value` is a string with `rui-field`.
 *
 * @remarks
 * The field reads and writes the host's `value` property, so a store write
 * (reset, `setValue`, a default) reaches the visible control through the setter.
 */
export function registerValueControl(tagName: string): void {
	registerFieldControl(tagName, {
		read: (host) => Reflect.get(host, 'value'),
		write: (host, value) => {
			Reflect.set(host, 'value', toControlString(value));
		},
		submission: 'host',
	});
}

/** Tells the field the control's `value` changed through user input. */
export function emitControlChange(host: HTMLElement, value: unknown): void {
	host.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, detail: { value } }));
}
