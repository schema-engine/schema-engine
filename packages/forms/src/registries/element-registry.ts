import type { InputRegistration, StaticRegistration, ElementMetadata } from '@/types';
import type { ComponentRegistration } from '@schema-engine/registry';
import { ComponentRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine';

/**
 * Base type for all element registrations.
 * Preserves ElementMetadata type for proper callback typing.
 */
type ElementRegistration = ComponentRegistration<string, unknown, unknown, ElementMetadata>;

/**
 * Element Registry
 *
 * Manages registration and retrieval of form elements (inputs, content, decorations, interactive).
 *
 * Note: Uses union of InputRegistration and StaticRegistration to support both input elements
 * with handlers and static elements. Type safety is maintained at the registration site via branded types.
 */
export class ElementRegistry extends ComponentRegistry<string, ElementRegistration> {
	get registryName(): string {
		return ComponentType.Element;
	}

	/**
	 * Register an input or static element.
	 * Accepts the branded registration types while storing as the base ElementRegistration.
	 */
	override register(item: InputRegistration<any, any, any> | StaticRegistration<any, any, any>): void {
		super.register(item as ElementRegistration);
	}
}
