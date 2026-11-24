import * as z from 'zod/mini';
import type { ComponentRegistration } from '@schema-engine/registry';

z.config(z.locales.en());

/** A registration of the design system: a `ComponentRegistration` whose `render` draws the component as HTML. */
export interface Component extends ComponentRegistration {
	render(config: unknown): string;
}

/** Escapes the characters that end a text or an attribute value in HTML. */
export const escape = (text: string) => text.replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);

/** A link target the design system accepts: a path on this site or an http(s) URL, never `javascript:`. */
export const hrefSchema = z.string().check(z.regex(/^(\/|https?:\/\/)/, 'Use a path or an http(s) URL'));

const buttonSchema = z.object({
	$type: z.literal('button'),
	label: z.string(),
	href: z.optional(hrefSchema),
	variant: z.optional(z.enum(['primary', 'secondary'])),
});

export const button: Component = {
	$type: 'button',
	schema: buttonSchema,
	metadata: { name: 'Button', description: 'An action. With an href it is a link.', tags: ['action'] },
	render({ label, href, variant = 'primary' }: z.output<typeof buttonSchema>) {
		return href === undefined
			? `<button type="button" class="button button-${variant}">${escape(label)}</button>`
			: `<a class="button button-${variant}" href="${escape(href)}">${escape(label)}</a>`;
	},
};

const badgeSchema = z.object({
	$type: z.literal('badge'),
	label: z.string(),
	tone: z.optional(z.enum(['info', 'success', 'danger'])),
});

export const badge: Component = {
	$type: 'badge',
	schema: badgeSchema,
	metadata: { name: 'Badge', description: 'A short status label.', tags: ['status'] },
	render({ label, tone = 'info' }: z.output<typeof badgeSchema>) {
		return `<span class="badge badge-${tone}">${escape(label)}</span>`;
	},
};

const calloutSchema = z.object({
	$type: z.literal('callout'),
	title: z.string(),
	text: z.optional(z.string()),
	tone: z.optional(z.enum(['info', 'success', 'danger'])),
});

export const callout: Component = {
	$type: 'callout',
	schema: calloutSchema,
	metadata: { name: 'Callout', description: 'A message that stands out from the page.', tags: ['status'] },
	render({ title, text, tone = 'info' }: z.output<typeof calloutSchema>) {
		const body = text === undefined ? '' : ` <span>${escape(text)}</span>`;
		return `<aside class="callout callout-${tone}"><strong>${escape(title)}</strong>${body}</aside>`;
	},
};

/** The components the design system ships. */
export const defaults: readonly Component[] = [button, badge, callout];
