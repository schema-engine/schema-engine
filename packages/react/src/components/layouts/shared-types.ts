import type React from 'react';

/**
 * Shared step information interface for layout components
 */
export interface SharedLayoutStepInfo {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
}

/**
 * Shared form information interface for layout components
 */
export interface SharedLayoutFormInfo {
	id: string;
	title?: string;
	description?: string;
}

/**
 * Shared layout component props interface
 */
export interface SharedLayoutComponentProps {
	children: React.ReactNode;
	config: Record<string, unknown>;
	step: SharedLayoutStepInfo;
	form: SharedLayoutFormInfo;
}
