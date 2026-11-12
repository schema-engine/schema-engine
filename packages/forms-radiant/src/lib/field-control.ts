import { registerFieldControl } from '@ecopages/radiant-ui/form';

/** The attribute that names, as a selector, the control inside a host that carries the label and ARIA. */
export const FIELD_ARIA_TARGET_ATTR = 'data-rui-aria-target';

/**
 * Host attributes that make a custom host the control of its `rui-field`.
 *
 * @remarks
 * `data-rui-control` lets the field see focus leaving the host, and
 * `data-rui-aria-target` names the visible input inside it. Declaring a target
 * makes the host paint the field's label and ARIA state onto it itself, with
 * `fieldAria(field)` from `@ecopages/radiant-ui/field`.
 *
 * @remarks
 * A host that a view creates on the client only receives these from its decorator
 * once it connects, after the field around it connected and synced. Spread them on
 * the element in the view too, so the field sees the declaration on its first sync
 * and leaves the host free of ARIA.
 */
export function fieldControlHostAttributes(ariaTarget: string): Record<string, string> {
	return { 'data-rui-control': '', [FIELD_ARIA_TARGET_ATTR]: ariaTarget };
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
			Reflect.set(host, 'value', value == null ? '' : String(value));
		},
		submission: 'host',
	});
}

/** Tells the field the control's `value` changed through user input. */
export function emitControlChange(host: HTMLElement, value: unknown): void {
	host.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, detail: { value } }));
}
