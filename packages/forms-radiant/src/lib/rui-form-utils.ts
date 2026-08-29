import { querySelectorDeep } from './dom-utils';

type RuiFormStore = {
	isSubmitted: boolean;
	validateField: (name: string) => Promise<boolean>;
	markTouched: (name: string) => void;
};

function queryNativeForm(root: ParentNode): HTMLFormElement | null {
	const found = querySelectorDeep(root, 'form.rui-form, form');
	return found?.tagName === 'FORM' ? (found as HTMLFormElement) : null;
}

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
	if (ruiForm) {
		return (ruiForm.shadowRoot ? queryNativeForm(ruiForm.shadowRoot) : null) ?? queryNativeForm(ruiForm);
	}

	if (!host) {
		return null;
	}

	const root = host.getRootNode();
	if (root instanceof Document || root instanceof DocumentFragment || root instanceof Element) {
		return queryNativeForm(root);
	}

	return null;
}

export function getRuiFormStore(host: HTMLElement | null): RuiFormStore | null {
	const ruiForm = findNearestRuiForm(host);
	if (!ruiForm) {
		return null;
	}

	const store = Reflect.get(ruiForm, 'store');
	if (
		store &&
		typeof store === 'object' &&
		typeof Reflect.get(store, 'validateField') === 'function' &&
		typeof Reflect.get(store, 'markTouched') === 'function'
	) {
		return store as RuiFormStore;
	}

	return null;
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
