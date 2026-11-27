import { expect, test } from 'vitest';
import { footer, recipes, resolved, undeclared } from '../../../../test-utils/skill-examples/layout/card-recipe';
import { attributes, containerStyle, theme } from '../../../../test-utils/skill-examples/layout/theme';

test('the theme compiles the grid and the axes into one id and one stylesheet', () => {
	expect(Object.keys(theme.axes)).toEqual(['size', 'surface', 'tone']);
	expect(theme.css).toContain(`[data-se-theme="${theme.id}"]`);
});

test('a child pick lays over the inherited one and becomes data attributes', () => {
	expect(attributes).toEqual({ 'data-se-size': 'compact', 'data-se-tone': 'brand' });
});

test('a grid is CSS custom properties', () => {
	expect(Object.keys(containerStyle).every((name) => name.startsWith('--'))).toBe(true);
	expect(containerStyle).toMatchObject({ '--se-grid-template': 'repeat(2, minmax(0, 1fr))' });
});

test('a card recipe outside forms resolves its slots, with the recipe defaults under the view', () => {
	expect(recipes.keys()).toEqual(['card']);
	expect(recipes.get('card')?.render).toEqual({ tag: 'article' });
	expect(resolved.issues).toEqual([]);
	expect(resolved.view).toEqual({
		$type: 'card',
		shell: { appearance: { surface: 'outlined' } },
		header: { level: 3 },
		body: { gap: 'md' },
		footer: { align: 'end' },
	});
	expect(footer).toEqual({ align: 'end' });
});

test('a slot the card does not declare is an issue at that key', () => {
	expect(undeclared.view).toBeUndefined();
	expect(undeclared.schemaIssues).toEqual([
		{
			message: "Recipe 'card' does not accept view key 'aside'. Allowed: shell, header, body, footer.",
			path: ['aside'],
		},
	]);
});
