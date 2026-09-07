/**
 * Raw tagged config accumulated by {@link FormConfigBuilder} before the engine
 * validation pipeline runs.
 */
export type TaggedAuthoringConfig = { $type: string } & Record<string, unknown>;

/**
 * Partial form configuration used during building phase.
 */
export type PartialFormConfig = {
	id?: string;
	title?: string;
	description?: string;
	steps: BuilderFormStep[];
	view?: TaggedAuthoringConfig;
	actions?: TaggedAuthoringConfig[];
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	grid?: import('@/schemas/base-field').GridLayoutConfig;
	className?: string;
	style?: Record<string, unknown>;
};

/**
 * Form step during building phase.
 */
export type BuilderFormStep = {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: TaggedAuthoringConfig[];
	actions?: TaggedAuthoringConfig[];
};
