import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { submitFormHandler } from '../src/stories/msw/submit-form';
import { StoryWrapper } from '../src/stories/shared/story-wrapper';
import '../src/styles/global.css';
import '../../../registry/shared/forms/recipes/recipes.css';

initialize({
	onUnhandledRequest: 'bypass',
});

const preview: Preview = {
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		msw: {
			handlers: [submitFormHandler],
		},
	},
	loaders: [mswLoader],
};

export default preview;
