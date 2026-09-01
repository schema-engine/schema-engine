import type { Decorator } from '@storybook/react-vite';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { getEngine } from '@/stories/shared/form-builder.ui';

export const recipeStoryEngine = getEngine();

export const recipeStoryDecorators: Decorator[] = [
	(Story) => (
		<StoryWrapper engine={recipeStoryEngine}>
			<Story />
		</StoryWrapper>
	),
];
