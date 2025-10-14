import { z } from 'zod';

export type { StepLayoutConfig } from '../schemas/form-config';

/**
 * Base layout configuration schema
 * Note: Using `.strict()` to enforce type safety and prevent excess properties
 */
export const BaseLayoutConfigSchema = z
	.object({
		__id: z.string().describe('Unique identifier for the layout type'),
	})
	.strict();

/**
 * Layout metadata for registries and tooling.
 *
 * Provides rich information for documentation generation, IDE tooling,
 * form builders, and JSON schema generation. All fields are optional
 * but providing comprehensive metadata improves developer experience.
 */
export interface LayoutMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the layout's purpose and behavior */
	description: string;
	/** Category for grouping similar layouts (e.g., "containers", "fullscreen") */
	category?: string;
	/** Whether this layout is deprecated and should not be used in new forms */
	deprecated?: boolean;
	/** Example configuration showing typical usage */
	example?: any;
	/** URL to preview image or screenshot */
	preview?: string;
	/** Tags for filtering and searching */
	tags?: string[];
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
