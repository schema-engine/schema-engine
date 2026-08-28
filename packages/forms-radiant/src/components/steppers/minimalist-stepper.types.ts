import { z } from 'zod';
import { BaseStepperConfigSchema } from '@schema-engine/forms/steppers/types';

export const MinimalistStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('minimalist'),
	showProgress: z.boolean().optional(),
});

export type MinimalistStepperConfig = z.infer<typeof MinimalistStepperConfigSchema>;
