import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@schema-engine/forms/layouts/types';
import type { JsxRenderable } from '@ecopages/jsx';

export const HeroBackgroundLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	$type: z.literal('hero-background'),
	backgroundImage: z.string().optional(),
	backgroundVideo: z.string().optional(),
	contentWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
});

export type HeroBackgroundLayoutConfig = z.infer<typeof HeroBackgroundLayoutConfigSchema>;

export type HeroBackgroundLayoutProps = HeroBackgroundLayoutConfig & {
	children?: JsxRenderable;
	className?: string;
};
