import { registerLayout } from '@/registries/layout-registry';
import { CardLayout } from './card-layout';

/**
 * Register card layout component
 * Tree-shakable: Only imported when needed
 */
export const cardLayoutRegistration = {
	layoutId: 'card',
	name: 'Card Layout',
	description: 'Display form content in a centered card',
	component: CardLayout,
	defaultConfig: {
		maxWidth: '500px',
		padding: '2rem',
		backgroundColor: 'white',
		shadowSize: 'medium',
	},
};

registerLayout(cardLayoutRegistration);
