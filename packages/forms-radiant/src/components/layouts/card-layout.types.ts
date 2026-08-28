import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@schema-engine/forms/layouts/types';
import type { JsxRenderable } from '@ecopages/jsx';

export const CardLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	$type: z.literal('card'),
	maxWidth: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
	padding: z.enum(['sm', 'md', 'lg']).optional(),
	shadowSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
});

export type CardLayoutConfig = z.infer<typeof CardLayoutConfigSchema>;

export type CardLayoutProps = CardLayoutConfig & {
	children?: JsxRenderable;
	className?: string;
};
