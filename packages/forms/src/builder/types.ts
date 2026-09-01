/**
 * Partial form configuration used during building phase.
 */
export type PartialFormConfig = {
	id?: string;
	title?: string;
	description?: string;
	steps: BuilderFormStep[];
	view?: FormEngine.ViewConfig;
	actions?: import('@/actions/types').FormActionConfig[];
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	grid?: import('@/schemas/base-field').GridLayoutConfig;
	className?: string;
	style?: Record<string, any>;
};

/**
 * Form step during building phase.
 */
export type BuilderFormStep = {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: FormEngine.ElementConfig[];
	actions?: import('@/actions/types').FormActionConfig[];
};
