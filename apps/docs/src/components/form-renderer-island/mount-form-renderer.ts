import type { FormConfig } from '@schema-engine/forms/schemas';
import { formEngine } from '@/lib/form-engine-setup';
import { createElement, createRoot, FormEngineProvider, FormRenderer, rhfAdapter } from '@/lib/forms-react-host';

export function mountFormRenderer(container: HTMLElement, config: FormConfig) {
	const root = createRoot(container);
	root.render(
		createElement(
			FormEngineProvider,
			{ engine: formEngine, adapter: rhfAdapter },
			createElement(FormRenderer, { config }),
		),
	);
	return { unmount: () => root.unmount() };
}
