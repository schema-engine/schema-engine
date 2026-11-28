/**
 * @schema-engine/forms-radiant
 * Radiant/JSX components and bindings for the form engine
 */

import './styles/hosts.css';

/**
 * Registers the form hosts (`se-form-renderer`, `se-form-instance`, `se-form-step`) when the package root loads.
 *
 * @remarks
 * Nothing the root exports reaches `form-instance.script` or `form-step`, and `form-renderer.script` only through
 * `FormRenderer`, so an app that imports the root for the hosts alone would lose them to a bundler that drops
 * unused re-exports. `package.json` lists these modules in `sideEffects`.
 */
import './components/internals/form-renderer.script.js';
import './components/form-instance.script.js';
import './components/form-step.js';

export * from './components/index.js';
export * from './adapters/index.js';
export * from './registries/index.js';
export * from './recipes/index.js';
export { schemaFormRegistrations } from './registrations/index.js';
export { createRadiantPhoneValidationRegistration } from './lib/phone-validation.js';
