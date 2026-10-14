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

/** Runtime-neutral pre-configured registrations. */
export * from './form-submit.registration';
export * from './notification.registration';

/** Convenience re-exports. */
export * from './registrations';
