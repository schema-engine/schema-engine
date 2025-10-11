import { z } from 'zod';
import { BaseStepperConfigSchema } from '@json-form-engine/core/steppers/types';

export const VerticalStepperConfigSchema = BaseStepperConfigSchema.extend({
	__id: z.literal('vertical'),
	showConnectors: z.boolean().optional().describe('Display connecting lines between steps'),
});

export type VerticalStepsStepperConfig = z.infer<typeof VerticalStepperConfigSchema>;

export const verticalStepperExample: VerticalStepsStepperConfig = {
	__id: 'vertical',
	showConnectors: true,
};
