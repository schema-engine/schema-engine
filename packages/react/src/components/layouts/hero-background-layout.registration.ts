/**
 * Hero Background Layout Registration with Type Augmentation
 */

import { HeroBackgroundLayoutRegistration } from './hero-background-layout';
import type { HeroBackgroundLayoutConfig } from './hero-background-layout.types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			'hero-background': HeroBackgroundLayoutConfig;
		}
	}
}

export const HeroBackgroundLayoutRegistrationWithTypes = HeroBackgroundLayoutRegistration;
export { HeroBackgroundLayoutRegistration };
