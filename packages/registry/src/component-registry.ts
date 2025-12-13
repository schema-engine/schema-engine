import { BaseRegistry } from './base-registry.js';
import type { ComponentRegistration } from './types.js';

/**
 * Component Registry
 *
 * Specialized registry for visual components (elements, layouts, steppers).
 * Enforces that all registered items implement the ComponentRegistration interface,
 * which guarantees a `render` method.
 *
 * @template TKey - The key type (typically string)
 * @template TValue - The value type (must extend ComponentRegistration)
 */
export abstract class ComponentRegistry<
	TKey extends string,
	TValue extends ComponentRegistration<any, any, any>,
> extends BaseRegistry<TKey, TValue> {
	// Specialized component behavior can be added here in the future.
	// For now, it provides stronger type safety for renderable items.
}
