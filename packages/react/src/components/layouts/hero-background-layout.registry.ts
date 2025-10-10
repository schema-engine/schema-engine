import { registerLayout } from '@/registries/layout-registry';
import { HeroBackgroundLayout } from './hero-background-layout';

/**
 * Register hero background layout component
 * Tree-shakable: Only imported when needed
 */
export const heroBackgroundLayoutRegistration = {
	layoutId: 'hero-background',
	name: 'Hero Background Layout',
	description: 'Display form content over a background image or video',
	component: HeroBackgroundLayout,
	defaultConfig: {
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		contentWidth: '600px',
		textColor: 'white',
	},
};

registerLayout(heroBackgroundLayoutRegistration);
