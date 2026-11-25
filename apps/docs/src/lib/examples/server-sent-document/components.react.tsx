/** @jsxImportSource react */
import type { ReactNode } from 'react';
import * as z from 'zod/mini';
import { createRegistry, type ComponentRegistration } from '@schema-engine/registry';

z.config(z.locales.en());

/** A registration of the design system: a `ComponentRegistration` whose `render` draws the component in React. */
export interface Component extends ComponentRegistration {
	render(config: unknown): ReactNode;
}

/** A link target the design system accepts: a path on this site or an http(s) URL, never `javascript:`. */
const hrefSchema = z.string().check(z.regex(/^(\/|https?:\/\/)/, 'Use a path or an http(s) URL'));

const buttonSchema = z.object({
	$type: z.literal('button'),
	label: z.string(),
	href: z.optional(hrefSchema),
	variant: z.optional(z.enum(['primary', 'secondary'])),
});

const button: Component = {
	$type: 'button',
	schema: buttonSchema,
	metadata: { name: 'Button', description: 'An action. With an href it is a link.', tags: ['action'] },
	render({ label, href, variant = 'primary' }: z.output<typeof buttonSchema>) {
		const className = `button button-${variant}`;
		return href === undefined ? (
			<button type="button" className={className}>
				{label}
			</button>
		) : (
			<a className={className} href={href}>
				{label}
			</a>
		);
	},
};

const badgeSchema = z.object({
	$type: z.literal('badge'),
	label: z.string(),
	tone: z.optional(z.enum(['info', 'success', 'danger'])),
});

const badge: Component = {
	$type: 'badge',
	schema: badgeSchema,
	metadata: { name: 'Badge', description: 'A short status label.', tags: ['status'] },
	render({ label, tone = 'info' }: z.output<typeof badgeSchema>) {
		return <span className={`badge badge-${tone}`}>{label}</span>;
	},
};

const calloutSchema = z.object({
	$type: z.literal('callout'),
	title: z.string(),
	text: z.optional(z.string()),
	tone: z.optional(z.enum(['info', 'success', 'danger'])),
});

const callout: Component = {
	$type: 'callout',
	schema: calloutSchema,
	metadata: { name: 'Callout', description: 'A message that stands out from the page.', tags: ['status'] },
	render({ title, text, tone = 'info' }: z.output<typeof calloutSchema>) {
		return (
			<aside className={`callout callout-${tone}`}>
				<strong>{title}</strong> {text && <span>{text}</span>}
			</aside>
		);
	},
};

/** The components this client knows. A `$type` outside this registry is an issue, not an error. */
export const components = createRegistry('Component', [button, badge, callout]);
