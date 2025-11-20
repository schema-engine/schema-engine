import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@schema-engine/forms/layouts/types';
import type { ReactNode } from 'react';

export const CardLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	$type: z.literal('card'),
	maxWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Maximum width of the card'),
	padding: z.enum(['sm', 'md', 'lg']).optional().describe('Internal padding of the card'),
	shadowSize: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Shadow size for depth effect'),
});

export type CardLayoutConfig = z.infer<typeof CardLayoutConfigSchema>;

/**
 * Card layout component props interface
 * Includes children for React component rendering
 */
export type CardLayoutProps = CardLayoutConfig & {
	children: ReactNode;
	className?: string;
};

export const cardLayoutExample: CardLayoutConfig = {
	$type: 'card',
	maxWidth: 'md',
	padding: 'md',
	shadowSize: 'md',
};
