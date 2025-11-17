import type { StepperRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Stepper Registry
 *
 * Manages registration and retrieval of form steppers.
 *
 * Note: Uses StepperRegistration (branded type) to support stepper registrations. Type safety is maintained
 * at the registration site via branded types.
 */
export class StepperRegistry extends BaseRegistry<string, StepperRegistration<any, any, any>> {
	get registryName(): string {
		return 'stepper';
	}
}
