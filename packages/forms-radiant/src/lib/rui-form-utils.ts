import { querySelectorDeep } from './dom-utils';

export function findAncestorElement(host: Node | null, ...localNames: string[]): HTMLElement | null {
	let current: Node | null = host;
	while (current) {
		if (current instanceof HTMLElement && localNames.includes(current.localName)) {
			return current;
		}
		if (typeof ShadowRoot !== 'undefined' && current instanceof ShadowRoot) {
			current = current.host;
			continue;
		}
		current = current.parentNode;
	}
	return null;
}

/**
 * Resolves the `rui-form` this host belongs to: itself, a descendant, or an
 * ancestor. Does not search the document for an unrelated form.
 */
export function findNearestRuiForm(host: HTMLElement | null): HTMLElement | null {
	if (!host) {
		return null;
	}

	if (host.localName === 'rui-form') {
		return host;
	}

	const nested =
		(host.shadowRoot ? querySelectorDeep(host.shadowRoot, 'rui-form') : null) ??
		querySelectorDeep(host, 'rui-form');
	if (nested instanceof HTMLElement) {
		return nested;
	}

	return findAncestorElement(host, 'rui-form');
}
