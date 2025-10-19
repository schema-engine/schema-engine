import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const DefaultStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('default'),
	orientation: z
		.enum(['horizontal', 'sidebar'])
		.optional()
		.default('horizontal')
		.describe('Stepper layout orientation'),
	showStepNumbers: z.boolean().optional().describe('Display step numbers in the indicator'),
	showStepTitles: z.boolean().optional().describe('Display step titles below indicators'),
	showStepDescriptions: z.boolean().optional().describe('Display step descriptions below titles'),
});

export type DefaultStepperConfig = z.infer<typeof DefaultStepperConfigSchema>;

/**
 * Default stepper component props interface
 * Matches StepperRegistration render signature
 */
export type DefaultStepperProps = DefaultStepperConfig;

export const defaultStepperExample: DefaultStepperConfig = {
	$type: 'default',
	orientation: 'horizontal',
	showStepNumbers: true,
	showStepTitles: true,
	showStepDescriptions: false,
};
