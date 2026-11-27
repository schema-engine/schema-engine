import * as z from 'zod/mini';
import { defineRecipeProtocol } from '@/recipes/protocol';

/** A non-form domain: page sections with a `media` slot, one kind, and a rule that a section needs `content`. */
export const sectionProtocol = defineRecipeProtocol({
	slots: ['shell', 'media', 'content'],
	kinds: ['section'],
	rules: [
		{
			name: 'section-needs-content',
			check: (recipe) =>
				recipe.kind === 'section' && !recipe.slots.includes('content')
					? `kind 'section' must declare a content slot`
					: undefined,
		},
	],
});

export const ContentConfigSchema = z.object({
	columns: z.optional(z.number()),
	appearance: z.optional(z.object({})),
});
export const MediaConfigSchema = z.object({ ratio: z.optional(z.string()), appearance: z.optional(z.object({})) });
export const ShellConfigSchema = z.object({ maxWidth: z.optional(z.string()), appearance: z.optional(z.object({})) });
