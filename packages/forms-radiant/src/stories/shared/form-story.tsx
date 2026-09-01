import { FormRenderer, type FormRendererProps } from '@/components/internals/form-renderer';
import { getEngine, radiantAdapter } from './form-builder';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { Meta } from '@ecopages/storybook-radiant-vite';

export const storyEngine = getEngine();

export function renderFormStory(args: FormRendererProps) {
	return <FormRenderer engine={storyEngine} adapter={radiantAdapter} {...args} />;
}

export function fieldFormConfig(
	id: string,
	title: string,
	elements: FormEngine.ElementConfig[],
	description?: string,
): FormConfig {
	return {
		id,
		title,
		description,
		steps: [{ id: 'step-1', title, elements }],
	};
}

export const formRendererMeta = {
	component: FormRenderer,
	render: renderFormStory,
	args: {
		engine: storyEngine,
		adapter: radiantAdapter,
		className: 'se-form-story--narrow',
	},
	parameters: {
		layout: 'padded',
		// No `element` / `ssrModule`: FormRendererElement is not a stamped `.script` host,
		// and engine/adapter cannot hydrate through HTML. The CSF stamp falls back to
		// JSX story SSR so hydrate can re-apply live args.
		radiant: {
			renderMode: 'client',
		},
	},
} satisfies Meta<typeof FormRenderer>;
