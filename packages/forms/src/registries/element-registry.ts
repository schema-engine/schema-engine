import type { ElementMetadata } from '@/types';
import type { ComponentRegistration } from '@schema-engine/registry';
import { ComponentRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';

/**
 * Base type for all element registrations.
 * Preserves ElementMetadata type for proper callback typing.
 */
type ElementRegistration = ComponentRegistration<string, unknown, unknown, ElementMetadata>;

/**
 * Element Registry
 *
 * Manages registration and retrieval of form elements (inputs, content, decorations, interactive).
 */
export class ElementRegistry extends ComponentRegistry<string, ElementRegistration> {
	get registryName(): string {
		return ComponentType.Element;
	}

	/**
	 * Accept any Standard Schema registration. Authoring types are tracked on FormComposer.
	 */
	override register(item: {
		$type: string;
		schema: unknown;
		metadata: ElementMetadata;
		render: (props: any) => unknown;
	}): void {
		super.register(item as ElementRegistration);
	}
}
