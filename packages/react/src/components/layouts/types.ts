import type React from 'react';

/**
 * Step information interface for layout components
 */
export interface LayoutStepData {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
}

/**
 * Form information interface for layout components
 */
export interface LayoutFormData {
	id: string;
	title?: string;
	description?: string;
}

/**
 * Base layout component props interface
 */
export interface BaseLayoutProps {
	children: React.ReactNode;
	config: Record<string, unknown>;
	step: LayoutStepData;
	form: LayoutFormData;
	className?: string;
}

/**
 * Layout component type definition
 */
export type LayoutComponent = React.FC<BaseLayoutProps>;
