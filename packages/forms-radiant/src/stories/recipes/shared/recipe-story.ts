import type { Meta } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story.js';

type RecipeLayout = 'fullscreen' | 'padded';

export function recipeStoryMeta(options: {
	description: string;
	layout?: RecipeLayout;
}): Meta<typeof formRendererMeta.component> {
	const layout = options.layout ?? 'fullscreen';
	return {
		...formRendererMeta,
		args: {
			...formRendererMeta.args,
			class: layout === 'fullscreen' ? 'se-form-story--full' : '',
		},
		parameters: {
			...formRendererMeta.parameters,
			layout,
			docs: {
				description: {
					component: options.description,
				},
			},
		},
		argTypes: {
			...formRendererMeta.argTypes,
			config: {
				control: false,
				description: 'Form config with a recipe `view.$type`',
			},
		},
	};
}
