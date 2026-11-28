import type { ComponentMetadata } from '@schema-engine/registry';
import type { ElementCategory } from './categories.js';

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
