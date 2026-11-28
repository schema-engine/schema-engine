import type { Decorator } from '@storybook/react-vite';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { getEngine } from '@/stories/shared/form-builder.ui.js';

export const recipeStoryEngine = getEngine();

export const recipeStoryDecorators: Decorator[] = [
	(Story) => (
		<StoryWrapper engine={recipeStoryEngine}>
			<Story />
		</StoryWrapper>
	),
];
