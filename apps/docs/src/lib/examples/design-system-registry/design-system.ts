import { createRegistry, safeParseStandardSchema, type StandardSchemaIssue } from '@schema-engine/registry';
import { defaults, type Component } from './components';

/**
 * The design system's registry. Registrations after the defaults override a default with the same `$type`:
 * the last one wins and keeps the first one's position.
 */
export function createDesignSystem(overrides: readonly Component[] = []) {
	return createRegistry('Component', [...defaults, ...overrides]);
}

export type DesignSystem = ReturnType<typeof createDesignSystem>;

/** What rendering a document gives: the HTML of every valid node, and an issue for each node that is not. */
export interface Rendered {
	html: string[];
	issues: StandardSchemaIssue[];
}

/**
 * Renders a document, a list of nodes that each name a component by `$type`.
 *
 * @remarks
 * A node that cannot be rendered does not stop the others. Its issues carry a path that starts with its index in
 * the document, so the caller can say which node to fix.
 */
export function renderDocument(system: DesignSystem, document: unknown): Rendered {
	if (!Array.isArray(document)) {
		return { html: [], issues: [{ message: 'A document is a list of nodes.', path: [] }] };
	}
	const html: string[] = [];
	const issues: StandardSchemaIssue[] = [];
	document.forEach((node: unknown, index) => {
		const type = typeof node === 'object' && node !== null && '$type' in node ? node.$type : undefined;
		if (typeof type !== 'string') {
			issues.push({ message: 'A node is an object with a string $type.', path: [index] });
			return;
		}
		const component = system.get(type);
		if (!component) {
			issues.push({ message: `No component is registered for $type '${type}'.`, path: [index, '$type'] });
			return;
		}
		const parsed = safeParseStandardSchema(component.schema, node);
		if (parsed.success) html.push(component.render(parsed.data));
		else issues.push(...parsed.error.issues.map((issue) => ({ ...issue, path: [index, ...(issue.path ?? [])] })));
	});
	return { html, issues };
}
