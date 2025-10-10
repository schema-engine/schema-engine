import type { ElementCategory } from './categories';

/**
 * Universal metadata for all components (elements, layouts, steppers).
 *
 * This metadata is used for:
 * - Documentation generation
 * - Form builder UI
 * - IDE tooltips and autocomplete
 * - JSON schema generation
 */
export interface ComponentMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the component's purpose */
	description?: string;
	/** Icon identifier for UI display */
	icon?: string;
	/** Tags for filtering and searching */
	tags?: string[];
	/** Version of the component */
	version?: string;
}

/**
 * Element-specific metadata extends the base metadata with category.
 *
 * Category is required for elements to enable:
 * - Semantic filtering (show only inputs, content, etc.)
 * - Category-specific validation (inputs require 'name')
 * - UI organization in form builders
 */
export interface ElementMetadata extends ComponentMetadata {
	/** Element category for semantic grouping and validation */
	category: ElementCategory;
}

/**
 * Action metadata for action registrations.
 *
 * Actions are separate from components and have their own metadata structure.
 */
export interface ActionMetadata {
	/** Human-readable display name */
	name: string;
	/** Detailed description of the action's purpose */
	description?: string;
	/** Icon identifier for UI display */
	icon?: string;
	/** Tags for filtering and searching */
	tags?: string[];
	/** Version of the action */
	version?: string;
}
