import { querySelectorDeep } from './dom-utils';

export function findNearestRuiForm(host: HTMLElement | null): HTMLElement | null {
	if (!host) {
		return null;
	}

	let node: Node | null = host;
	while (node) {
		if (node instanceof HTMLElement && node.localName === 'rui-form') {
			return node;
		}
		if (node instanceof ShadowRoot) {
			node = node.host;
			continue;
		}
		node = node.parentNode;
	}

	const root = host.getRootNode();
	if (root instanceof Document || root instanceof DocumentFragment || root instanceof Element) {
		return querySelectorDeep(root, 'rui-form') as HTMLElement | null;
	}

	return null;
}

export function findNativeForm(host: HTMLElement | null): HTMLFormElement | null {
	const ruiForm = findNearestRuiForm(host);
	const scopedForm = ruiForm
		? querySelectorDeep(ruiForm, 'form.rui-form, form')
		: host
			? querySelectorDeep(host.getRootNode() as ParentNode, 'form.rui-form, form')
			: null;

	return scopedForm instanceof HTMLFormElement ? scopedForm : null;
}

export function submitNativeForm(form: {
	requestSubmit?: HTMLFormElement['requestSubmit'];
	dispatchEvent: (event: Event) => boolean;
}): void {
	if (typeof form.requestSubmit === 'function') {
		form.requestSubmit();
		return;
	}

	form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

export function requestNearestFormSubmit(host: HTMLElement | null): void {
	const nativeForm = findNativeForm(host);
	if (!nativeForm) {
		return;
	}

	submitNativeForm(nativeForm);
}

export function requestNearestFormValidation(host: HTMLElement | null): void {
	requestNearestFormSubmit(host);
}
