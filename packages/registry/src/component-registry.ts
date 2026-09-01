import { BaseRegistry } from './base-registry.js';
import type { ComponentRegistration } from './types.js';

/**
 * Component Registry
 *
 * Specialized registry for visual components (elements and recipes).
 * Enforces that all registered items implement the ComponentRegistration interface,
 * which guarantees a `render` method.
 *
 * This class currently adds no runtime behavior beyond BaseRegistry. Its role is
 * to preserve a narrower type contract for registries that only accept renderable
 * component registrations.
 *
 * @template TKey - The key type (typically string)
 * @template TValue - The value type (must extend ComponentRegistration)
 */
export abstract class ComponentRegistry<
	TKey extends string,
	TValue extends ComponentRegistration<any, any, any>,
> extends BaseRegistry<TKey, TValue> {}
