import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const MinimalistStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('minimalist'),
	showProgress: z.boolean().optional().describe('Display progress indicator'),
});

export type MinimalistStepperConfig = z.infer<typeof MinimalistStepperConfigSchema>;

export const minimalistStepperExample: MinimalistStepperConfig = {
	$type: 'minimalist',
	showProgress: true,
};
