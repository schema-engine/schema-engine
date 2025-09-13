import { z } from 'zod';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

// Import enhanced schemas - this is the single source of truth
import { InputFieldSchema, type InputFieldConfig } from '../components/form/fields/form-input.types';

import { TextareaFieldSchema, type TextareaFieldConfig } from '../components/form/fields/form-textarea.types';

import { SelectFieldConfigSchema, type SelectFieldConfig } from '../components/form/fields/form-select.types';

import { CheckboxFieldConfigSchema, type CheckboxFieldConfig } from '../components/form/fields/form-checkbox.types';

import { RadioFieldConfigSchema, type RadioFieldConfig } from '../components/form/fields/form-radio.types';

import { NumberFieldConfigSchema, type NumberFieldConfig } from '../components/form/fields/form-number.types';

import { SwitchFieldConfigSchema, type SwitchFieldConfig } from '../components/form/fields/form-switch.types';

import {
	ArrayElementConfigSchema,
	type ArrayElementsConfig,
} from '../components/form/fields/form-array-elements.types';

/**
 * Union type for all field configurations
 * Extended as we add more field types
 */
export type FieldConfig =
	| InputFieldConfig
	| TextareaFieldConfig
	| SelectFieldConfig
	| CheckboxFieldConfig
	| RadioFieldConfig
	| NumberFieldConfig
	| SwitchFieldConfig
	| ArrayElementsConfig;

/**
 * Union schema for all field configurations
 */
export const FieldConfigSchema = z.discriminatedUnion('componentId', [
	InputFieldSchema,
	TextareaFieldSchema,
	SelectFieldConfigSchema,
	CheckboxFieldConfigSchema,
	RadioFieldConfigSchema,
	NumberFieldConfigSchema,
	SwitchFieldConfigSchema,
	ArrayElementConfigSchema,
]);

/**
 * Common props that all field components receive
 */
export interface FieldProps<T extends FieldConfig = FieldConfig> {
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
	config: FieldConfig;
	children: React.ReactNode;
	error?: string;
	showLabel?: boolean;
	showDescription?: boolean;
}
