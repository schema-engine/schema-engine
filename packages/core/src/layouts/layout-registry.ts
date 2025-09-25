import type { LayoutRegistration } from './types';
import { logger } from '@/lib/logger';

/**
 * Layout Registry
 *
 * Central registry for all layout types. Provides registration, validation,
 * and retrieval capabilities for custom layout components.
 */
class LayoutRegistry<TComponent = any> {
	private layouts = new Map<string, LayoutRegistration<TComponent>>();

	/**
	 * Register a new layout type with its component and configuration.
	 *
	 * @param registration - Complete layout registration
	 */
	register(registration: LayoutRegistration<TComponent>): void {
		if (this.layouts.has(registration.layoutId)) {
			logger.warn(`Layout type '${registration.layoutId}' is already registered. Overriding.`);
		}

		this.layouts.set(registration.layoutId, registration);
		logger.debug(`Registered layout: ${registration.layoutId}`, {
			name: registration.name,
			hasDefaultConfig: !!registration.defaultConfig,
			hasOptionsSchema: !!registration.optionsSchema,
		});
	}

	/**
	 * Register multiple layouts at once
	 *
	 * @param registrations - Array of layout registrations
	 */
	registerMultiple(registrations: LayoutRegistration<TComponent>[]): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

	/**
	 * Check if a layout type is registered.
	 *
	 * @param layoutId - Layout ID to check
	 * @returns True if layout is registered
	 */
	has(layoutId: string): boolean {
		return this.layouts.has(layoutId);
	}

	/**
	 * Get a registered layout definition.
	 *
	 * @param layoutId - Layout ID to retrieve
	 * @returns Layout registration or undefined if not found
	 */
	get(layoutId: string): LayoutRegistration<TComponent> | undefined {
		return this.layouts.get(layoutId);
	}

	/**
	 * Get all registered layout IDs.
	 *
	 * @returns Array of registered layout IDs
	 */
	getRegisteredLayoutIds(): string[] {
		return Array.from(this.layouts.keys());
	}

	/**
	 * Get all registered layouts.
	 *
	 * @returns Array of all registered layouts
	 */
	getAll(): LayoutRegistration<TComponent>[] {
		return Array.from(this.layouts.values());
	}

	/**
	 * Remove a layout from the registry.
	 *
	 * @param layoutId - Layout ID to remove
	 * @returns True if layout was removed, false if it didn't exist
	 */
	remove(layoutId: string): boolean {
		const removed = this.layouts.delete(layoutId);
		if (removed) {
			logger.debug(`Removed layout: ${layoutId}`);
		}
		return removed;
	}

	/**
	 * Clear all registered layouts.
	 */
	clear(): void {
		this.layouts.clear();
		logger.debug('Cleared all layouts');
	}

	/**
	 * Get layout component with merged configuration
	 *
	 * @param layoutId - Layout ID
	 * @param userConfig - User-provided configuration
	 * @returns Object with component and merged config, or null if not found
	 */
	getLayoutWithConfig(
		layoutId: string,
		userConfig: Record<string, any> = {},
	): { component: TComponent; config: Record<string, any> } | null {
		const registration = this.get(layoutId);
		if (!registration) {
			logger.warn(`Layout '${layoutId}' not found in registry`);
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
 * Global layout registry instance
 */
export const layoutRegistry = new LayoutRegistry();

/**
 * Convenience function for registering layouts
 */
export function registerLayout<TComponent = any>(registration: LayoutRegistration<TComponent>): void {
	layoutRegistry.register(registration);
}

export { LayoutRegistry };
export type { LayoutRegistration };
