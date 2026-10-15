import type { ElementMetadata } from '@/types';
import type { ComponentRegistration } from '@schema-engine/registry';
import { BaseRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';

/**
 * Base type for all element registrations.
 * Preserves ElementMetadata type for proper callback typing.
 */
type ElementRegistration = ComponentRegistration<string, unknown, never, ElementMetadata>;

/**
 * Element Registry
 *
 * Manages registration and retrieval of form elements (inputs, content, decorations, interactive).
 */
export class ElementRegistry extends BaseRegistry<string, ElementRegistration> {
	get registryName(): string {
		return ComponentType.Element;
	}
}
