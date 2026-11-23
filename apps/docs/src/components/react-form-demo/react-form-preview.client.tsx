/** @jsxImportSource react */
import { hydrateRoot } from 'react-dom/client';
import type { FormConfig, FormEngineRuntime } from '@schema-engine/forms';
import { docsReactFormEngine } from './demo-engine';
import { ReactFormContent } from './react-form-content.react';
import { installMockFormApi } from '@/lib/mock-form-api';

const ROOT_ATTR = 'data-se-react-form-demo-root';
const CONFIG_ATTR = 'data-se-form-config';
const KIT_ATTR = 'data-se-react-form-demo-kit';

const mounted = new WeakSet<Element>();

function isReactHydrated(element: Element): boolean {
	return Object.keys(element).some((key) => key.startsWith('__react'));
}

function readFormConfig(element: HTMLElement): FormConfig {
	const raw = element.getAttribute(CONFIG_ATTR);
	if (!raw) {
		throw new Error('[docs] React form demo is missing serialized form config.');
	}
	return JSON.parse(raw) as FormConfig;
}

/**
 * Resolves the engine a demo names.
 *
 * @remarks
 * Nothing else in the client graph imports the shadcn engine, so its code, the copied registry
 * source and Base UI sit in a chunk that only a page with a `kit="shadcn"` demo requests. Its CSS
 * ships separately, through `ShadcnFormPreview`.
 */
async function resolveEngine(element: HTMLElement): Promise<FormEngineRuntime> {
	if (element.getAttribute(KIT_ATTR) === 'shadcn') {
		return (await import('./shadcn-engine')).docsShadcnFormEngine;
	}
	return docsReactFormEngine;
}

async function mountDemo(element: HTMLElement): Promise<void> {
	if (element.getAttribute(ROOT_ATTR) !== 'true' || mounted.has(element) || isReactHydrated(element)) {
		return;
	}
	mounted.add(element);

	try {
		installMockFormApi();
		const config = readFormConfig(element);
		const engine = await resolveEngine(element);
		hydrateRoot(element, <ReactFormContent config={config} engine={engine} />);
	} catch (error) {
		mounted.delete(element);
		console.error('[docs] React form demo failed to hydrate.', error);
	}
}

function hydrateReactFormDemos(): void {
	for (const element of document.querySelectorAll<HTMLElement>(`.docs-react-form-demo[${ROOT_ATTR}="true"]`)) {
		void mountDemo(element);
	}
}

let initialized = false;

/**
 * Starts React form demo hydration for the current page and later route swaps.
 *
 * @remarks The route script can be evaluated repeatedly, so this installs its listeners only once.
 */
export function initializeReactFormDemos(): void {
	if (initialized) return;
	initialized = true;

	hydrateReactFormDemos();
	document.addEventListener('eco:page-load', hydrateReactFormDemos);
	document.addEventListener('eco:after-swap', hydrateReactFormDemos);
}
