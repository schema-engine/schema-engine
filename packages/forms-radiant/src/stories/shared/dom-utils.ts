export function queryAllDeep(root: ParentNode, selector: string): Element[] {
	const results: Element[] = [];

	const visit = (node: ParentNode) => {
		for (const element of node.querySelectorAll(selector)) {
			results.push(element);
		}
		for (const child of node.querySelectorAll('*')) {
			if (child.shadowRoot) {
				visit(child.shadowRoot);
			}
		}
	};

	visit(root);
	return results;
}

export function matchesText(text: string, matcher: string | RegExp): boolean {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (typeof matcher === 'string') {
		return normalized.includes(matcher);
	}
	return matcher.test(normalized);
}

export function queryByTextDeep(root: ParentNode, matcher: string | RegExp): Element | null {
	for (const element of queryAllDeep(root, '[data-rui-field-error]:not([hidden]), [role="alert"]:not([hidden])')) {
		if (matchesText(element.textContent ?? '', matcher)) {
			return element;
		}
	}

	return null;
}

export function queryByTextContentDeep(root: ParentNode, matcher: string | RegExp): Element | null {
	for (const element of queryAllDeep(root, '*')) {
		if (matchesText(element.textContent ?? '', matcher)) {
			return element;
		}
	}

	return null;
}

export function queryDeep(root: ParentNode, selector: string): Element | null {
	return queryAllDeep(root, selector)[0] ?? null;
}
