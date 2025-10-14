import type { FormActionConfig } from '@/actions/types';
import type { GridLayoutConfig } from '@/schemas/base-field';

/**
 * Form step during building phase.
 */
export type BuilderFormStep = {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: FormEngine.ElementConfig[];
	layout?: FormEngine.LayoutConfig;
	actions?: FormActionConfig[];
};

/**
 * Partial form configuration used during building phase.
 */
export type PartialFormConfig = {
	id?: string;
	title?: string;
	description?: string;
	steps: BuilderFormStep[];
	mode?: 'wizard' | 'free';
	stepper?: FormEngine.StepperConfig;
	actions?: FormActionConfig[];
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	grid?: GridLayoutConfig;
	className?: string;
	style?: Record<string, any>;
};
