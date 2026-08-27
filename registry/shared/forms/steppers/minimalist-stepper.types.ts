import { z } from 'zod';
import { BaseStepperConfigSchema } from '@schema-engine/forms/steppers/types';

export const MinimalistStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('minimalist'),
	showProgress: z.boolean().optional().describe('Display progress bar'),
});

export type MinimalistStepperConfig = z.infer<typeof MinimalistStepperConfigSchema>;

export type MinimalistStepperProps = MinimalistStepperConfig;

export const minimalistStepperExample: MinimalistStepperConfig = {
	$type: 'minimalist',
	showProgress: true,
};
