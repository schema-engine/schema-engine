import { isServer } from '@ecopages/radiant/is-server';
import type { FormRendererElement } from '@schema-engine/forms-radiant';
import type { formEngine } from '@/lib/form-engine-setup';

const PREVIEW_ENGINE_BINDING = Symbol.for('@schema-engine/docs.preview-engine-binding');

type DocsEngine = typeof formEngine;
type NavigationEvent = CustomEvent<{ newDocument: Document }>;

function bindEngine(root: ParentNode, engine: DocsEngine): void {
	for (const renderer of root.querySelectorAll<FormRendererElement>('se-form-renderer')) {
		renderer.engine = engine;
	}
}

/**
 * Binds the docs engine to every form preview, on first load and after each client-side navigation.
 *
 * @remarks
 * Live engine objects are not serialized into server-rendered previews, so the app
 * assigns `engine` to each `se-form-renderer`. On first load the renderers are
 * already in the document and the hosts below them follow the engine when it arrives.
 * On navigation the router parses the incoming page without upgrading it, so the
 * engine is set on its renderers in `eco:before-swap` and they upgrade with it,
 * because the router inserts those nodes themselves. If the engine cannot load, the
 * server markup stays as it is.
 */
export function installPreviewEngineBinding(): void {
	if (isServer || typeof document === 'undefined' || PREVIEW_ENGINE_BINDING in document) return;
	Reflect.set(document, PREVIEW_ENGINE_BINDING, true);

	import('@/lib/form-engine-setup').then(
		({ formEngine: engine }) => {
			document.addEventListener('eco:before-swap', (event) => {
				bindEngine((event as NavigationEvent).detail.newDocument, engine);
			});
			bindEngine(document, engine);
		},
		(error: unknown) => {
			console.error('The docs form engine failed to load; form previews stay as server-rendered.', error);
		},
	);
}
