import { z } from 'zod';
import { BaseStepperConfigSchema } from '@schema-engine/forms/steppers/types';

export const DefaultStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('default'),
	orientation: z.enum(['horizontal', 'sidebar']).optional(),
	showStepNumbers: z.boolean().optional(),
	showStepTitles: z.boolean().optional(),
	showStepDescriptions: z.boolean().optional(),
});

export type DefaultStepperConfig = z.infer<typeof DefaultStepperConfigSchema>;
