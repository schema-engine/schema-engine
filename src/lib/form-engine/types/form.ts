import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

// Re-export the modern namespace-based field configuration
export type FieldConfig = FormEngine.FieldConfig;
export type ComponentId = FormEngine.ComponentId;

// Re-export form configuration types from schemas
export type { FormConfig, FormStep } from '../schemas/form-config';

// Re-export grid-related types from base-field schemas
export type { GridLayoutConfig, ElementGridConfig as FieldGridConfig } from '../schemas/base-field';

/**
 * Common props that all field components receive
 */
export interface FieldProps<T extends FormEngine.FieldConfig = FormEngine.FieldConfig> {
	config: T;
	form: UseFormReturn<FieldValues>;
	value?: any;
	onChange?: (value: any) => void;
	onBlur?: () => void;
	error?: string;
	fieldPath: FieldPath<FieldValues>;
}

/**
 * Props for field wrapper component
 */
export interface FieldWrapperConfig {
	config: FormEngine.FieldConfig;
	children: React.ReactNode;
	error?: string;
	showLabel?: boolean;
	showDescription?: boolean;
}
