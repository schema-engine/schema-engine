import { isServer } from '@ecopages/radiant/is-server';
import type { FormRendererElement } from '@schema-engine/forms-radiant';
import { formEngine } from '@/lib/form-engine-setup';

const PREVIEW_ENGINE_BINDING = Symbol.for('@schema-engine/docs.preview-engine-binding');

/** @remarks Live engine objects are not serialized into server-rendered previews. */
function bindPreviewEngines(): void {
	void customElements.whenDefined('se-form-renderer').then(() => {
		for (const renderer of document.querySelectorAll<FormRendererElement>(
			'.docs-form-renderer-preview se-form-renderer',
		)) {
			renderer.engine = formEngine;
		}
	});
}

/** Binds the docs engine to previews after initial load and client-side navigation. */
export function installPreviewEngineBinding(): void {
	if (isServer || typeof document === 'undefined' || PREVIEW_ENGINE_BINDING in document) return;
	Reflect.set(document, PREVIEW_ENGINE_BINDING, true);
	bindPreviewEngines();
	document.addEventListener('eco:after-swap', bindPreviewEngines);
}
