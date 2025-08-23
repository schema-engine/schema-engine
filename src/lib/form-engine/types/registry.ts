import type { ComponentType } from "react";

/**
 * Form component definition for the registry
 */
export interface FormComponentDefinition {
	name: string;
	component: ComponentType<any>;
	category: "input" | "select" | "layout" | "custom";
	description?: string;
	example?: any;
}

/**
 * Registry for managing form components
 */
export interface FormComponentRegistry {
	register: (definition: FormComponentDefinition) => void;
	unregister: (name: string) => void;
	get: (name: string) => FormComponentDefinition | undefined;
	getComponent: (name: string) => ComponentType<any> | undefined;
	getAll: () => Map<string, FormComponentDefinition>;
	getByCategory: (category: FormComponentDefinition["category"]) => FormComponentDefinition[];
	has: (name: string) => boolean;
	getComponentNames: () => string[];
	clear: () => void;
}
