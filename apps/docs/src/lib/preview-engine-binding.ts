import { isServer } from '@ecopages/radiant/is-server';
import type { FormRendererElement } from '@schema-engine/forms-radiant';
import type { formEngine } from '@/lib/form-engine-setup';

const PREVIEW_ENGINE_BINDING = Symbol.for('@schema-engine/docs.preview-engine-binding');
const PREVIEW_SELECTOR = '.docs-form-renderer-preview';

/**
 * Moves the server-rendered children of each preview out of the tree they are in.
 *
 * @remarks
 * The form hosts upgrade, parent first, as soon as their elements are defined
 * and attached to the live document, and each resolves its engine once, when it
 * connects. A parked preview cannot upgrade, so the engine can be assigned to
 * its renderer first.
 */
function parkPreviews(root: ParentNode): DocumentFragment[] {
	return Array.from(root.querySelectorAll(PREVIEW_SELECTOR), (container) => {
		const parked = container.ownerDocument.createDocumentFragment();
		parked.append(...container.childNodes);
		return parked;
	});
}

/** Binds the engine to each parked renderer, then returns the previews to the containers in the live document. */
function restorePreviews(parked: DocumentFragment[], engine: typeof formEngine | undefined): void {
	const containers = document.querySelectorAll(PREVIEW_SELECTOR);
	parked.forEach((fragment, index) => {
		for (const renderer of fragment.querySelectorAll<FormRendererElement>('se-form-renderer')) {
			if (engine) renderer.engine = engine;
		}
		containers[index]?.append(fragment);
	});
}

/**
 * Binds the docs engine to every form preview, on first load and after each client-side navigation.
 *
 * @remarks
 * Live engine objects are not serialized into server-rendered previews, and
 * importing the engine module defines the form elements. So previews are parked
 * before that import starts and restored with the engine bound, which is also how
 * the incoming page's previews are handled: they are parked in the incoming
 * document before it is swapped in, and restored once the swap is done.
 */
export function installPreviewEngineBinding(): void {
	if (isServer || typeof document === 'undefined' || PREVIEW_ENGINE_BINDING in document) return;
	Reflect.set(document, PREVIEW_ENGINE_BINDING, true);

	let parked = parkPreviews(document);
	const engine = import('@/lib/form-engine-setup').then((module) => module.formEngine);
	engine.then(
		(resolved) => restorePreviews(parked, resolved),
		() => restorePreviews(parked, undefined),
	);

	document.addEventListener('eco:before-swap', (event) => {
		parked = parkPreviews((event as CustomEvent<{ newDocument: Document }>).detail.newDocument);
	});
	document.addEventListener('eco:after-swap', () => {
		void engine.then((resolved) => restorePreviews(parked, resolved));
	});
}
