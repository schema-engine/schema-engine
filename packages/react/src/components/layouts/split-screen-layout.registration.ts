/**
 * Split Screen Layout Registration with Type Augmentation
 */

import { SplitScreenLayoutRegistration } from './split-screen-layout';
import type { SplitScreenLayoutConfig } from './split-screen-layout.types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			'split-screen': SplitScreenLayoutConfig;
		}
	}
}

export const SplitScreenLayoutRegistrationWithTypes = SplitScreenLayoutRegistration;
export { SplitScreenLayoutRegistration };
