import type { ElementMetadata } from '@/types';
import type { ComponentRegistration } from '@schema-engine/registry';
import { ComponentRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine/component-type';
import { assertStandardSchema } from '@/lib/standard-schema';

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
	 * Accept any Standard Schema registration. Authoring types are tracked on FormEngine.
	 */
	override register(item: {
		$type: string;
		schema: unknown;
		metadata: ElementMetadata;
		render: (props: never) => unknown;
		containerKind?: import('@/types/registration').ContainerKind;
	}): void {
		assertStandardSchema(item.schema, `Element '${item.$type}' schema`);
		super.register(item as ElementRegistration);
	}
}
