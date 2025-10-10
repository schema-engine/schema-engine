// Re-export types from form-config to avoid circular imports
export type { StepLayoutConfig } from '../schemas/form-config';

/**
 * Layout registration definition
 */
export interface LayoutRegistration<TComponent = any> {
	/**
	 * Unique identifier for the layout
	 */
	layoutId: string;

	/**
	 * Display name for the layout
	 */
	name: string;

	/**
	 * Description of what this layout does
	 */
	description?: string;

	/**
	 * The layout component
	 */
	component: TComponent;

	/**
	 * Default configuration for this layout
	 */
	defaultConfig?: Record<string, any>;

	/**
	 * Schema for validating layout-specific options
	 */
	optionsSchema?: any; // Can be Zod schema or similar
}

/**
 * Props passed to layout components
 */
export interface LayoutComponentProps {
	/**
	 * The form content to be wrapped by this layout
	 */
	children: React.ReactNode;

	/**
	 * Layout-specific configuration options
	 */
	config: Record<string, any>;

	/**
	 * Current step information
	 */
	step: {
		id: string;
		title?: string;
		description?: string;
		index: number;
		total: number;
	};

	/**
	 * Form-level context
	 */
	form: {
		id: string;
		title?: string;
		description?: string;
	};
}

/**
 * Layout component type definition
 */
export type LayoutComponent = React.ComponentType<LayoutComponentProps>;
