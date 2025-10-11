import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const MinimalistStepperConfigSchema = BaseStepperConfigSchema.extend({
	__id: z.literal('minimalist'),
	showProgress: z.boolean().optional().describe('Display progress indicator'),
});

export type MinimalistStepperConfig = z.infer<typeof MinimalistStepperConfigSchema>;

export const minimalistStepperExample: MinimalistStepperConfig = {
	__id: 'minimalist',
	showProgress: true,
};
