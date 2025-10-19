import type { LayoutRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Layout Registry
 *
 * Manages registration and retrieval of form layouts.
 *
 * Note: Uses LayoutRegistration (branded type) to support layout registrations. Type safety is maintained
 * at the registration site via branded types.
 */
export class LayoutRegistry extends BaseRegistry<string, LayoutRegistration<any, any, any>> {
	get registryName(): string {
		return 'layout';
	}
}
