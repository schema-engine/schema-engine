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
