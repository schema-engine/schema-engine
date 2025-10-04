import { registerLayout } from '@/registries/layout-registry';
import { SplitScreenLayout } from './split-screen-layout';

/**
 * Register split screen layout component
 * Tree-shakable: Only imported when needed
 */
export const splitScreenLayoutRegistration = {
	layoutId: 'split-screen',
	name: 'Split Screen Layout',
	description: 'Display form content alongside additional information or media',
	component: SplitScreenLayout,
	defaultConfig: {
		sidePlacement: 'left',
		sideWidth: '50%',
		backgroundColor: '#f8f9fa',
		sideContent: '<h3>Welcome!</h3><p>Please fill out this form to continue.</p>',
	},
};

registerLayout(splitScreenLayoutRegistration);
