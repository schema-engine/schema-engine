import type { StepperRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Stepper Registry
 *
 * Manages registration and retrieval of form steppers.
 *
 * Note: Uses StepperRegistration<any, any> internally to support registrations with different
 * config types. Type safety is maintained at the registration site via the builder.
 */
export class StepperRegistry extends BaseRegistry<string, StepperRegistration<any, any>> {
	get registryName(): string {
		return 'stepper';
	}
}
