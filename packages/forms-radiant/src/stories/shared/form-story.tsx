import { FormRenderer, type FormRendererProps } from '@/components/internals/form-renderer';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { getEngine, radiantAdapter } from './form-builder';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { Meta } from '@ecopages/storybook-radiant-vite';

export const storyEngine = getEngine();

export function renderFormStory(args: FormRendererProps) {
	return <FormRenderer {...args} engine={args.engine ?? storyEngine} adapter={args.adapter ?? radiantAdapter} />;
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
		className: 'se-form-story--narrow',
	},
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		onSubmit: { table: { disable: true } },
	},
	parameters: {
		layout: 'padded',
		radiant: { element: FormRendererElement },
	},
} satisfies Meta<typeof FormRenderer>;
