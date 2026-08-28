import { SplitScreenLayout } from './split-screen-layout';
import type { SplitScreenLayoutConfig, SplitScreenLayoutProps } from './split-screen-layout.types';
import { SplitScreenLayoutConfigSchema } from './split-screen-layout.types';
import type { LayoutRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			'split-screen': SplitScreenLayoutConfig;
		}
	}
}

export const SplitScreenLayoutRegistration: LayoutRegistration<
	'split-screen',
	SplitScreenLayoutConfig,
	SplitScreenLayoutProps
> = {
	$type: 'split-screen',
	render: SplitScreenLayout,
	schema: SplitScreenLayoutConfigSchema,
	metadata: {
		name: 'Split Screen Layout',
		description: 'Two-column layout with informational side panel',
		icon: 'columns',
	},
};
