import { FormRenderer, FormRendererElement, type FormRendererProps } from '@/components/internals/form-renderer';
import { getEngine, radiantAdapter } from './form-builder';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { Meta } from '@ecopages/storybook-radiant-vite';

export const storyEngine = getEngine();

export function renderFormStory(args: FormRendererProps) {
	return <FormRenderer engine={storyEngine} adapter={radiantAdapter} {...args} />;
}

export function withStepLayout(
	config: FormConfig,
	layout: NonNullable<FormConfig['steps'][number]['layout']>,
): FormConfig {
	return {
		...config,
		steps: config.steps.map((step) => ({
			...step,
			layout,
		})),
	};
}

export const minimalistStepper = {
	$type: 'minimalist' as const,
	showProgress: true,
};

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
		mode: 'free',
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
		radiant: {
			renderMode: 'client',
			element: FormRendererElement,
		},
	},
} satisfies Meta<typeof FormRenderer>;
