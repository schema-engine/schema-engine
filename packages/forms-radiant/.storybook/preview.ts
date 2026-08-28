import type { Preview } from '@ecopages/storybook-radiant-vite';
import '@ecopages/radiant/client/install-hydrator';
import './preview.css';

const preview: Preview = {
	decorators: [
		(Story) => {
			document.documentElement.dataset.ruiColors = 'glacier';
			document.documentElement.style.colorScheme = 'light';
			return Story();
		},
	],
	parameters: {
		layout: 'padded',
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: 'todo',
		},
		radiant: {
			renderMode: 'client',
		},
	},
};

export default preview;
