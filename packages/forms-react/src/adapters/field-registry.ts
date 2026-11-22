/** The controls of a form by field path, which `setFocus` and a failed submit move focus to. */
export interface FieldRegistry {
	/** Records a control of `path`; returns the function that removes that control. */
	register(path: string, element: HTMLElement): () => void;
	focus(path: string): void;
	/** Focuses the first of `paths`, in document order, that has a control. */
	focusFirst(paths: readonly string[]): void;
	/** Focuses the first control, in document order, of the field at `path` or below it. */
	focusWithin(path: string): void;
}

function focusFirstInDocument(elements: readonly HTMLElement[]): void {
	elements
		.filter((element) => element.isConnected)
		.reduce<HTMLElement | undefined>(
			(first, element) =>
				first && !(first.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) ? first : element,
			undefined,
		)
		?.focus();
}

/**
 * @remarks
 * A path can have several controls at once, such as a row that is replaced while the old one unmounts.
 * The latest registered one that is still mounted answers for the path.
 */
export function createFieldRegistry(): FieldRegistry {
	const controls = new Map<string, HTMLElement[]>();
	const current = (path: string): HTMLElement | undefined => controls.get(path)?.at(-1);
	return {
		register(path, element) {
			controls.set(path, [...(controls.get(path) ?? []), element]);
			return () => {
				const remaining = (controls.get(path) ?? []).filter((control) => control !== element);
				if (remaining.length > 0) controls.set(path, remaining);
				else controls.delete(path);
			};
		},
		focus(path) {
			current(path)?.focus();
		},
		focusFirst(paths) {
			focusFirstInDocument(paths.flatMap((path) => current(path) ?? []));
		},
		focusWithin(path) {
			focusFirstInDocument(
				Array.from(controls.keys())
					.filter((key) => key === path || key.startsWith(`${path}.`))
					.flatMap((key) => current(key) ?? []),
			);
		},
	};
}
