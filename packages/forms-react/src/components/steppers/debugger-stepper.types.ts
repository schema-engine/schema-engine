import { z } from 'zod';
import { BaseStepperConfigSchema } from '@schema-engine/forms/steppers/types';

export const DebuggerStepperConfigSchema = BaseStepperConfigSchema.extend({
	$type: z.literal('debugger'),
	showStepDetails: z.boolean().optional().describe('Display detailed step information'),
	defaultExpanded: z.boolean().optional().describe('Start with widget expanded'),
	showFormState: z.boolean().optional().describe('Display form state information'),
});

export type DebuggerStepperConfig = z.infer<typeof DebuggerStepperConfigSchema>;

export const debuggerStepperExample: DebuggerStepperConfig = {
	$type: 'debugger',
	showStepDetails: true,
	defaultExpanded: false,
	showFormState: true,
};
