import type { StepperRegistration } from './types';
import { logger } from '@/lib/logger';

/**
 * Stepper Registry
 *
 * Central registry for all stepper types. Provides registration, validation,
 * and retrieval capabilities for custom stepper components.
 */
class StepperRegistry<TComponent = any> {
	private steppers = new Map<string, StepperRegistration<TComponent>>();

	/**
	 * Register a new stepper type with its component and configuration.
	 *
	 * @param registration - Complete stepper registration
	 */
	register(registration: StepperRegistration<TComponent>): void {
		if (this.steppers.has(registration.stepperId)) {
			logger.warn(`Stepper type '${registration.stepperId}' is already registered. Overriding.`);
		}

		this.steppers.set(registration.stepperId, registration);
		logger.debug(`Registered stepper: ${registration.stepperId}`, {
			name: registration.name,
			hasDefaultConfig: !!registration.defaultConfig,
			hasOptionsSchema: !!registration.optionsSchema,
		});
	}

	/**
	 * Register multiple steppers at once
	 *
	 * @param registrations - Array of stepper registrations
	 */
	registerMultiple(registrations: StepperRegistration<TComponent>[]): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

	/**
	 * Check if a stepper type is registered.
	 *
	 * @param stepperId - Stepper ID to check
	 * @returns True if stepper is registered
	 */
	has(stepperId: string): boolean {
		return this.steppers.has(stepperId);
	}

	/**
	 * Get a registered stepper definition.
	 *
	 * @param stepperId - Stepper ID to retrieve
	 * @returns Stepper registration or undefined if not found
	 */
	get(stepperId: string): StepperRegistration<TComponent> | undefined {
		return this.steppers.get(stepperId);
	}

	/**
	 * Get all registered stepper IDs.
	 *
	 * @returns Array of registered stepper IDs
	 */
	getRegisteredStepperIds(): string[] {
		return Array.from(this.steppers.keys());
	}

	/**
	 * Get all registered steppers.
	 *
	 * @returns Array of all registered steppers
	 */
	getAll(): StepperRegistration<TComponent>[] {
		return Array.from(this.steppers.values());
	}

	/**
	 * Remove a stepper from the registry.
	 *
	 * @param stepperId - Stepper ID to remove
	 * @returns True if stepper was removed, false if it didn't exist
	 */
	remove(stepperId: string): boolean {
		const removed = this.steppers.delete(stepperId);
		if (removed) {
			logger.debug(`Removed stepper: ${stepperId}`);
		}
		return removed;
	}

	/**
	 * Clear all registered steppers.
	 */
	clear(): void {
		this.steppers.clear();
		logger.debug('Cleared all steppers');
	}

	/**
	 * Get stepper component with merged configuration
	 *
	 * @param stepperId - Stepper ID
	 * @param userConfig - User-provided configuration
	 * @returns Object with component and merged config, or null if not found
	 */
	getStepperWithConfig(
		stepperId: string,
		userConfig: Record<string, any> = {},
	): { component: TComponent; config: Record<string, any> } | null {
		const registration = this.get(stepperId);
		if (!registration) {
			logger.warn(`Stepper '${stepperId}' not found in registry`);
			return null;
		}

		const config = {
			...registration.defaultConfig,
			...userConfig,
		};

		return {
			component: registration.component,
			config,
		};
	}
}

/**
 * Global stepper registry instance
 */
export const stepperRegistry = new StepperRegistry();

/**
 * Convenience function for registering steppers
 */
export function registerStepper<TComponent = any>(registration: StepperRegistration<TComponent>): void {
	stepperRegistry.register(registration);
}

export { StepperRegistry };
export type { StepperRegistration };
