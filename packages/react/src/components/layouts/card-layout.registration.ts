/**
 * Card Layout Registration with Type Augmentation
 */

import { CardLayoutRegistration } from './card-layout';
import type { CardLayoutConfig } from './card-layout.types';

declare global {
	namespace FormEngine {
		interface LayoutRegistry {
			card: CardLayoutConfig;
		}
	}
}

export const CardLayoutRegistrationWithTypes = CardLayoutRegistration;
export { CardLayoutRegistration };
