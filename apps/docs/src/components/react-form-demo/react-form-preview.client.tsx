/** @jsxImportSource react */
import { hydrateRoot } from 'react-dom/client';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { docsReactFormEngine, rhfAdapter } from './demo-engine';
import { installMockFormApi } from '@/lib/mock-form-api';

const ROOT_ATTR = 'data-se-react-form-demo-root';
const CONFIG_ATTR = 'data-se-form-config';

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

function mountDemo(element: HTMLElement): void {
	if (element.getAttribute(ROOT_ATTR) !== 'true' || isReactHydrated(element)) {
		return;
	}

	installMockFormApi();
	const config = readFormConfig(element);
	hydrateRoot(
		element,
		<FormEngineProvider engine={docsReactFormEngine} adapter={rhfAdapter}>
			<FormRenderer config={config} engine={docsReactFormEngine} adapter={rhfAdapter} />
		</FormEngineProvider>,
	);
}

function hydrateReactFormDemos(): void {
	for (const element of document.querySelectorAll<HTMLElement>(`.docs-react-form-demo[${ROOT_ATTR}="true"]`)) {
		mountDemo(element);
	}
}

hydrateReactFormDemos();
document.addEventListener('eco:page-load', hydrateReactFormDemos);
document.addEventListener('eco:after-swap', hydrateReactFormDemos);
