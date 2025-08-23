import type { ComponentType } from "react";
import type { FormComponentDefinition, FormComponentRegistry } from "./types/registry";

/**
 * Simplified form component registry without lazy loading
 */
export class FormComponentRegistryImpl implements FormComponentRegistry {
	private components = new Map<string, FormComponentDefinition>();

	register(definition: FormComponentDefinition): void {
		if (this.components.has(definition.name)) {
			console.warn(`Component "${definition.name}" is already registered. Overwriting.`);
		}
		this.components.set(definition.name, definition);
	}

	unregister(name: string): void {
		this.components.delete(name);
	}

	get(name: string): FormComponentDefinition | undefined {
		return this.components.get(name);
	}

	getComponent(name: string): ComponentType<any> | undefined {
		const component = this.components.get(name);
		return component?.component;
	}

	getAll(): Map<string, FormComponentDefinition> {
		return new Map(this.components);
	}

	getByCategory(category: string): FormComponentDefinition[] {
		return Array.from(this.components.values()).filter(
			(component) => component.category === category
		);
	}

	has(name: string): boolean {
		return this.components.has(name);
	}

	getComponentNames(): string[] {
		return Array.from(this.components.keys());
	}

	clear(): void {
		this.components.clear();
	}
}

export const defaultFormRegistry = new FormComponentRegistryImpl();
