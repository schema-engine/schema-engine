import { isServer } from '@ecopages/radiant/is-server';
import { ContextEventsTypes, ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { formEngine } from '@/lib/form-engine-setup';

const PREVIEW_ENGINE_BINDING = Symbol.for('@schema-engine/docs.preview-engine-binding');

type DocsEngine = typeof formEngine;

/** Imports the engine module with the form elements deferred, so the server-rendered previews stay inert until the engine can be provided. */
async function loadEngine() {
	const { deferFormElements } = await import('@schema-engine/forms-radiant/define');
	deferFormElements();
	const [{ formEngine: engine }, { formEngineContext }] = await Promise.all([
		import('@/lib/form-engine-setup'),
		import('@schema-engine/forms-radiant'),
	]);
	return { engine, formEngineContext };
}

/**
 * Answers every form engine request that reaches the document with the docs engine.
 *
 * @remarks
 * Form hosts resolve their engine once, when they connect, from the context above
 * them. The document is the provider, so a preview resolves it at whatever moment it
 * connects, including when the router rebuilds a page's previews while swapping it in.
 */
function provideEngine(engine: DocsEngine, formEngineContext: unknown): void {
	document.addEventListener(ContextEventsTypes.SUBSCRIPTION_REQUEST, (event) => {
		if (!(event instanceof ContextSubscriptionRequestEvent) || event.context !== formEngineContext) return;
		event.stopPropagation();
		event.markHandled();
		event.callback({ engine }, () => {});
	});
}

/**
 * Provides the docs engine to every form preview, on first load and after each client-side navigation.
 *
 * @remarks
 * Live engine objects are not serialized into server-rendered previews, and the
 * form elements would upgrade them as soon as they are defined. So the elements
 * are defined only after the engine exists and the document provides it ("provide,
 * then define"); the server markup stays visible and untouched meanwhile. A page
 * navigated to afterwards finds the provider already in place. If the engine cannot
 * load, the server markup stays as it is.
 */
export function installPreviewEngineBinding(): void {
	if (isServer || typeof document === 'undefined' || PREVIEW_ENGINE_BINDING in document) return;
	Reflect.set(document, PREVIEW_ENGINE_BINDING, true);

	loadEngine().then(
		async ({ engine, formEngineContext }) => {
			const { defineFormElements } = await import('@schema-engine/forms-radiant/define');
			provideEngine(engine, formEngineContext);
			defineFormElements();
		},
		(error: unknown) => {
			console.error('The docs form engine failed to load; form previews stay as server-rendered.', error);
		},
	);
}
