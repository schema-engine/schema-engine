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

/**
 * Tells the field a registered host's `value` changed through user input.
 *
 * @remarks
 * Dispatches the native `input` event on the host, which `rui-field` reads to write the host's `value`
 * into the form, so update `value` first. `commit` also dispatches `change`, once, for a change that is
 * final (a paste, a drop, a pick, a field's `change`). Setting `value` from code dispatches nothing.
 */
export function emitControlChange(host: HTMLElement, options: { commit?: boolean } = {}): void {
	host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
	if (options.commit) emitControlCommit(host);
}

/** Dispatches the native `change` event on a registered host whose value the user committed. */
export function emitControlCommit(host: HTMLElement): void {
	host.dispatchEvent(new Event('change', { bubbles: true }));
}
