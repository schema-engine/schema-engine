import * as z from 'zod/mini';
import { escape, hrefSchema, type Component } from './components';

const brandButtonSchema = z.object({
	$type: z.literal('button'),
	label: z.string(),
	href: hrefSchema,
});

/** Replaces the default button: a brand button is always a link and has no variant. */
export const brandButton: Component = {
	$type: 'button',
	schema: brandButtonSchema,
	metadata: { name: 'Brand button', description: 'A link in the brand colours.' },
	render({ label, href }: z.output<typeof brandButtonSchema>) {
		return `<a class="brand-button" href="${escape(href)}">${escape(label)}</a>`;
	},
};
