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

	const ancestor = findAncestorElement(host, 'rui-form');
	if (ancestor) {
		return ancestor;
	}

	const root = host.getRootNode?.() ?? host.ownerDocument;
	if (root && typeof (root as ParentNode).querySelector === 'function') {
		return querySelectorDeep(root as ParentNode, 'rui-form') as HTMLElement | null;
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

export function readRuiFormStore<T extends object>(host: HTMLElement | null, methods: readonly string[]): T | null {
	const ruiForm = findNearestRuiForm(host);
	const store = ruiForm ? Reflect.get(ruiForm, 'store') : null;
	if (!store || typeof store !== 'object') {
		return null;
	}

	return methods.every((method) => typeof Reflect.get(store, method) === 'function') ? (store as T) : null;
}

export function getRuiFormStore(host: HTMLElement | null): RuiFormStore | null {
	return readRuiFormStore<RuiFormStore>(host, ['validateField', 'markTouched']);
}

export type RuiConstraintStore = {
	getValues: () => Record<string, unknown>;
	subscribe: (listener: () => void) => () => void;
};

export function getRuiConstraintStore(host: HTMLElement | null): RuiConstraintStore | null {
	return readRuiFormStore<RuiConstraintStore>(host, ['getValues', 'subscribe']);
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
