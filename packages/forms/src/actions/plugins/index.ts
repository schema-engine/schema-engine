/**
 * Action plugin factories and preconfigured registrations for FormEngine.
 * Import a registration for built-in action types or create a configured
 * registration with a plugin factory.
 */

/** Plugin factory functions (require manual type registration). */
export * from './auto-save.plugin';
export * from './gtm.plugin';
export * from './notification.plugin';
export * from './form-reset.plugin';
export * from './form-submit.plugin';

/** Pre-configured registrations for engine action maps. */
export * from './auto-save.registration';
export * from './gtm.registration';
export * from './notification.registration';
export * from './form-reset.registration';
export * from './form-submit.registration';

/** Convenience re-exports. */
export * from './registrations';
