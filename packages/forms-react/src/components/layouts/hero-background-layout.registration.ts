/**
 * Hero Background Layout Registration with Type Augmentation
 */

import { HeroBackgroundLayout } from './hero-background-layout';
import type { HeroBackgroundLayoutConfig, HeroBackgroundLayoutProps } from './hero-background-layout.types';
import { HeroBackgroundLayoutConfigSchema } from './hero-background-layout.types';
import type { LayoutRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			'hero-background': HeroBackgroundLayoutConfig;
		}
	}
}

export const HeroBackgroundLayoutRegistration: LayoutRegistration<
	'hero-background',
	HeroBackgroundLayoutConfig,
	HeroBackgroundLayoutProps
> = {
	$type: 'hero-background',
	render: HeroBackgroundLayout,
	schema: HeroBackgroundLayoutConfigSchema,
	metadata: {
		name: 'Hero Background Layout',
		description: 'Full-screen layout with background image or video',
		icon: 'image-plus',
	},
};
