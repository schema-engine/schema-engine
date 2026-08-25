import { createRoot } from 'react-dom/client';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormAdapter } from '@/adapters/types';
import { FormEngineProvider } from '@/components/adapter-provider';
import { FormRenderer } from '@/components/internals/form-renderer';

export type MountFormRendererOptions = {
	engine: CoreFormEngine;
	adapter: FormAdapter;
	config: FormConfig;
};

export type MountedFormRenderer = {
	unmount: () => void;
};

/**
 * Mount FormRenderer into a DOM node using this package's React instance.
 * Use this from non-React hosts (islands, custom elements) so createRoot
 * and form components share one copy of React.
 */
export function mountFormRenderer(container: HTMLElement, options: MountFormRendererOptions): MountedFormRenderer {
	const root = createRoot(container);
	root.render(
		<FormEngineProvider engine={options.engine} adapter={options.adapter}>
			<FormRenderer config={options.config} />
		</FormEngineProvider>,
	);
	return { unmount: () => root.unmount() };
}
