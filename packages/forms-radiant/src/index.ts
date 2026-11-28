/**
 * @schema-engine/forms-radiant
 * Radiant/JSX components and bindings for the form engine
 */

import './styles/hosts.css';

/**
 * Registers the form hosts (`se-form-renderer`, `se-form-instance`, `se-form-step`) when the package root loads.
 *
 * @remarks
 * Only `FormRenderer` reaches these modules. A page rendered on the server binds its engine on the client with
 * `createRadiantFormEngine` and never names `FormRenderer` there, so without these imports a bundler that drops
 * unused re-exports would leave the server-rendered hosts undefined. `package.json` lists these modules in
 * `sideEffects`.
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
