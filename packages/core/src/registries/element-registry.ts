import type { ElementRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Element Registry
 *
 * Manages registration and retrieval of form elements (inputs, content, decorations, interactive).
 *
 * Note: Uses ElementRegistration<any, any> internally to support registrations with different
 * config types. Type safety is maintained at the registration site via the builder.
 */
export class ElementRegistry extends BaseRegistry<string, ElementRegistration<any, any>> {
	get registryName(): string {
		return 'element';
	}
}
