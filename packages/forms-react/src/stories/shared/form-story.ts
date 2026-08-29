import type { FormConfig } from '@schema-engine/forms/schemas';

export const minimalistStepper = {
	$type: 'minimalist' as const,
	showProgress: true,
};

export function withStepLayout(
	config: FormConfig,
	layout: NonNullable<FormConfig['steps'][number]['layout']>,
): FormConfig {
	return {
		...config,
		steps: config.steps.map((step) => ({
			...step,
			layout,
		})),
	};
}
