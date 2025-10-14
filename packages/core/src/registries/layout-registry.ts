import type { LayoutRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Layout Registry
 *
 * Manages registration and retrieval of form layouts.
 *
 * Note: Uses LayoutRegistration<any, any> internally to support registrations with different
 * config types. Type safety is maintained at the registration site via the builder.
 */
export class LayoutRegistry extends BaseRegistry<string, LayoutRegistration<any, any>> {
	get registryName(): string {
		return 'layout';
	}
}
