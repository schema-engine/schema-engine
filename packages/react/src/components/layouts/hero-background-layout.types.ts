import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@json-form-engine/core/layouts/types';

export const HeroBackgroundLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	layoutId: z.literal('hero-background'),
	backgroundImage: z.string().optional().describe('URL of the background image'),
	backgroundVideo: z.string().optional().describe('URL of the background video'),
	contentWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional().describe('Maximum width of the content area'),
});

export type HeroBackgroundLayoutConfig = z.infer<typeof HeroBackgroundLayoutConfigSchema>;

/**
 * Hero background layout component props interface
 * Includes children for React component rendering
 */
export type HeroBackgroundLayoutProps = HeroBackgroundLayoutConfig & {
	children: React.ReactNode;
	className?: string;
};

export const heroBackgroundLayoutExample: HeroBackgroundLayoutConfig = {
	layoutId: 'hero-background',
	backgroundImage: '/images/hero.jpg',
	contentWidth: 'md',
};
