/**
 * Action plugin factories and preconfigured registrations for FormEngine.
 * Import a registration for built-in action types or create a configured
 * registration with a plugin factory.
 */

/** Plugin factory functions; action config types come from the registrations passed to the engine. */
export * from './auto-save.plugin.js';
export * from './gtm.plugin.js';
export * from './notification.plugin.js';
export * from './form-reset.plugin.js';
export * from './form-submit.plugin.js';

/** Runtime-neutral pre-configured registrations. */
export * from './form-submit.registration.js';
export * from './notification.registration.js';

/** Convenience re-exports. */
export * from './registrations.js';
