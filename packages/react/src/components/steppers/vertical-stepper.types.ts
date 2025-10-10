import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const VerticalStepperConfigSchema = BaseStepperConfigSchema.extend({
	stepperId: z.literal('vertical'),
	showConnectors: z.boolean().optional().describe('Display connecting lines between steps'),
});

export type VerticalStepsStepperConfig = z.infer<typeof VerticalStepperConfigSchema>;

export const verticalStepperExample: VerticalStepsStepperConfig = {
	stepperId: 'vertical',
	showConnectors: true,
};
