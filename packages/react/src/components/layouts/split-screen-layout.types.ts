import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@json-form-engine/core/layouts/types';

export const SplitScreenLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	layoutId: z.literal('split-screen'),
	sideContent: z.string().optional().describe('HTML content to display in the side panel'),
	sidePlacement: z.enum(['left', 'right']).optional().describe('Which side to place the content panel'),
	sideWidth: z.enum(['narrow', 'normal', 'wide']).optional().describe('Width of the side panel'),
	contentAlignment: z.enum(['top', 'center', 'bottom']).optional().describe('Vertical alignment of content'),
});

export type SplitScreenLayoutConfig = z.infer<typeof SplitScreenLayoutConfigSchema>;

/**
 * Split screen layout component props interface
 * Includes children for React component rendering
 */
export type SplitScreenLayoutProps = SplitScreenLayoutConfig & {
	children: React.ReactNode;
	className?: string;
};

export const splitScreenLayoutExample: SplitScreenLayoutConfig = {
	layoutId: 'split-screen',
	sideContent: '<h3>Welcome!</h3><p>Please fill out this form to continue.</p>',
	sidePlacement: 'left',
	sideWidth: 'normal',
	contentAlignment: 'top',
};
