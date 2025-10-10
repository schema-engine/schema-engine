import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const DefaultStepperConfigSchema = BaseStepperConfigSchema.extend({
	stepperId: z.literal('default'),
	showStepNumbers: z.boolean().optional().describe('Display step numbers in the indicator'),
	showStepTitles: z.boolean().optional().describe('Display step titles below indicators'),
	showStepDescriptions: z.boolean().optional().describe('Display step descriptions below titles'),
});

export type DefaultStepperConfig = z.infer<typeof DefaultStepperConfigSchema>;

export const defaultStepperExample: DefaultStepperConfig = {
	stepperId: 'default',
	showStepNumbers: true,
	showStepTitles: true,
	showStepDescriptions: false,
};
