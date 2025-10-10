import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@json-form-engine/core/layouts/types';

export const CardLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	layoutId: z.literal('card'),
	maxWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Maximum width of the card'),
	padding: z.enum(['sm', 'md', 'lg']).optional().describe('Internal padding of the card'),
	shadowSize: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Shadow size for depth effect'),
});

export type CardLayoutConfig = z.infer<typeof CardLayoutConfigSchema>;

export const cardLayoutExample: CardLayoutConfig = {
	layoutId: 'card',
	maxWidth: 'md',
	padding: 'md',
	shadowSize: 'md',
};
