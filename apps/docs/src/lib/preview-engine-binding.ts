import { isServer } from '@ecopages/radiant/is-server';
import type { FormRendererElement } from '@schema-engine/forms-radiant';
import type { docsEngines } from '@/lib/form-engine-setup';

const PREVIEW_ENGINE_BINDING = Symbol.for('@schema-engine/docs.preview-engine-binding');

type DocsEngines = typeof docsEngines;
type NavigationEvent = CustomEvent<{ newDocument: Document }>;

function isEngineName(engines: DocsEngines, name: string): name is keyof DocsEngines {
	return Object.hasOwn(engines, name);
}

function bindEngine(root: ParentNode, engines: DocsEngines): void {
	for (const renderer of root.querySelectorAll<FormRendererElement>('se-form-renderer')) {
		const name = renderer.closest('[data-docs-engine]')?.getAttribute('data-docs-engine') ?? 'default';
		renderer.engine = isEngineName(engines, name) ? engines[name] : engines.default;
	}
}

/**
 * Binds an engine to every form preview, on first load and after each client-side navigation.
 *
 * @remarks
 * The engine is the one the preview's nearest `data-docs-engine` ancestor names, or the default.
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
		({ docsEngines: engines }) => {
			document.addEventListener('eco:before-swap', (event) => {
				bindEngine((event as NavigationEvent).detail.newDocument, engines);
			});
			bindEngine(document, engines);
		},
		(error: unknown) => {
			console.error('The docs form engine failed to load; form previews stay as server-rendered.', error);
		},
	);
}
