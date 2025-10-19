/**
 * Card Layout Registration with Type Augmentation
 */

import { CardLayout } from './card-layout';
import type { CardLayoutConfig, CardLayoutProps } from './card-layout.types';
import { CardLayoutConfigSchema } from './card-layout.types';
import type { LayoutRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			card: CardLayoutConfig;
		}
	}
}

export const CardLayoutRegistration: LayoutRegistration<'card', CardLayoutConfig, CardLayoutProps> = {
	$type: 'card',
	render: CardLayout,
	schema: CardLayoutConfigSchema,
	metadata: {
		name: 'Card Layout',
		description: 'Centered card layout with shadow and customizable padding',
		icon: 'card',
	},
};
