import { brandButton } from './brand-button';
import { createDesignSystem, renderDocument } from './design-system';

const where = (path: ReadonlyArray<PropertyKey | { key: PropertyKey }> = []) =>
	path.map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment))).join('.');

const document = [
	{ $type: 'callout', tone: 'success', title: 'Order 1042 confirmed', text: 'Thanks for shopping with us.' },
	{ $type: 'badge', label: 'Paid', tone: 'success' },
	{ $type: 'button', label: 'View order', href: '/orders/1042' },
	{ $type: 'button', label: 'Cancel order', href: 'javascript:alert(1)' },
	{ $type: 'chip', label: 'Shipping soon' },
];

const defaultSystem = createDesignSystem();
const brandSystem = createDesignSystem([brandButton]);

for (const [name, system] of [
	['default', defaultSystem],
	['brand', brandSystem],
] as const) {
	const { html, issues } = renderDocument(system, document);
	for (const line of html) console.log(`${name} ${line}`);
	for (const issue of issues) console.log(`${name} issue ${where(issue.path)}: ${issue.message}`);
}
