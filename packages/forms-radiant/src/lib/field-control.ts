import { registerFieldControl, RUI_FIELD_MANAGED_ATTR } from '@ecopages/radiant-ui/form';

/** The attribute that names, as a selector, the control inside a host that carries the label and ARIA. */
export const FIELD_ARIA_TARGET_ATTR = 'data-rui-aria-target';

/**
 * Host attributes that make a custom host the control of its `rui-field`.
 *
 * @remarks
 * `data-rui-control` lets the field see focus leaving the host, and
 * `data-rui-aria-target` names the visible input inside it, so the label and
 * the ARIA state land on the input the user types in.
 */
export function fieldControlHostAttributes(ariaTarget: string): Record<string, string> {
	return { 'data-rui-control': '', [FIELD_ARIA_TARGET_ATTR]: ariaTarget };
}

/**
 * Removes the ARIA state `rui-field` wrote on a host before its own control rendered.
 *
 * @remarks
 * A field connects, and syncs once, before the host renders the control that
 * `data-rui-aria-target` names. That sync finds no target and falls back to the
 * host, leaving an id, `aria-invalid`, `aria-required`, `aria-labelledby` and
 * `aria-describedby` on a generic element, where they are invalid ARIA. The next
 * sync, after the render, writes the same state on the control.
 */
export function releaseFieldAria(host: HTMLElement): void {
	if (host.id.startsWith('rui-field-')) {
		host.removeAttribute('id');
	}
	for (const attribute of [
		'aria-invalid',
		'aria-required',
		'aria-disabled',
		'aria-describedby',
		'aria-labelledby',
		RUI_FIELD_MANAGED_ATTR,
	]) {
		host.removeAttribute(attribute);
	}
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
