import type { FormConfig } from '@schema-engine/forms/schemas';
import { formEngine, rhfAdapter } from '@/lib/form-engine-setup';
import { createElement, createRoot, FormEngineProvider, FormRenderer } from '@/lib/forms-react-host';

export function mountFormRenderer(container: HTMLElement, config: FormConfig) {
	const root = createRoot(container);
	root.render(
		createElement(
			FormEngineProvider,
			{ engine: formEngine, adapter: rhfAdapter },
			createElement(FormRenderer, { config, engine: formEngine, adapter: rhfAdapter }),
		),
	);
	return { unmount: () => root.unmount() };
}
