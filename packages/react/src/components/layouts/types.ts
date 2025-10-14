import type React from 'react';

/**
 * Step information interface for layout components
 * Used when the layout is part of a multi-step form
 */
export interface LayoutStepData {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive?: boolean;
	isCompleted?: boolean;
	isValid?: boolean;
}

/**
 * Form information interface for layout components
 * Contains the core form context
 */
export interface LayoutFormData {
	id: string;
	title?: string;
	description?: string;
	isSubmitting?: boolean;
}

/**
 * Base layout component props interface
 * The fundamental contract that ALL layout components must implement
 */
export interface BaseLayoutProps {
	children: React.ReactNode;
	config?: Record<string, unknown>;
	step?: LayoutStepData;
	form: LayoutFormData;
	className?: string;
}

/**
 * Layout component type definition with generics for type-safe config
 * The signature that all layout components must follow
 */
export type LayoutComponent<T = Record<string, unknown>> = React.FC<BaseLayoutProps & { config?: T }>;

/**
 * Extract config type from a LayoutComponent
 * Useful for type-safe registration
 */
export type ExtractLayoutConfig<T> = T extends LayoutComponent<infer C> ? C : never;

/**
 * Base layout configuration that will be stored in the form configuration
 */
export interface BaseLayoutConfig {
	id: string;
}
