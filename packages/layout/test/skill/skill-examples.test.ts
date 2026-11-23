import { expect, test } from 'vitest';
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
