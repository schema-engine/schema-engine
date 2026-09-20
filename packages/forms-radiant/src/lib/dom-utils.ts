export function querySelectorDeep(root: ParentNode, selector: string): Element | null {
	const direct = root.querySelector(selector);
	if (direct) {
		return direct;
	}

	for (const element of root.querySelectorAll('*')) {
		if (!element.shadowRoot) {
			continue;
		}
		const found = querySelectorDeep(element.shadowRoot, selector);
		if (found) {
			return found;
		}
	}

	return null;
}
