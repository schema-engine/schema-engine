import { z } from 'zod';
import { BaseLayoutConfigSchema } from '@schema-engine/forms/layouts/types';
import type { JsxRenderable } from '@ecopages/jsx';

export const SplitScreenLayoutConfigSchema = BaseLayoutConfigSchema.extend({
	$type: z.literal('split-screen'),
	sideContent: z.string().optional(),
	sidePlacement: z.enum(['left', 'right']).optional(),
	sideWidth: z.enum(['narrow', 'normal', 'wide']).optional(),
	contentAlignment: z.enum(['top', 'center', 'bottom']).optional(),
});

export type SplitScreenLayoutConfig = z.infer<typeof SplitScreenLayoutConfigSchema>;

export type SplitScreenLayoutProps = SplitScreenLayoutConfig & {
	children?: JsxRenderable;
	className?: string;
};
