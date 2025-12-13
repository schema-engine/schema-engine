import type { InputRegistration, StaticRegistration } from '@/types';
import { ComponentRegistry } from '@schema-engine/registry';
import { ComponentType } from '@/engine';

/**
 * Element Registry
 *
 * Manages registration and retrieval of form elements (inputs, content, decorations, interactive).
 *
 * Note: Uses union of InputRegistration and StaticRegistration to support both input elements
 * with handlers and static elements. Type safety is maintained at the registration site via branded types.
 */
export class ElementRegistry extends ComponentRegistry<
	string,
	InputRegistration<any, any, any> | StaticRegistration<any, any, any>
> {
	get registryName(): string {
		return ComponentType.Element;
	}
}
