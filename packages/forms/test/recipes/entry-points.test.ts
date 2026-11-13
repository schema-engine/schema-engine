import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import * as builtIn from '@/recipes/built-in';
import * as protocol from '@/recipes';

describe('recipe entry points', () => {
	test('the protocol entry exports no built-in specs or slot schemas', () => {
		expect(protocol).toHaveProperty('defineRecipeSpec');
		expect(protocol).toHaveProperty('defineFormRecipe');
		expect(protocol).not.toHaveProperty('cardSpec');
		expect(protocol).not.toHaveProperty('builtInRecipeSpecs');
		expect(protocol).not.toHaveProperty('CardShellConfigSchema');
		expect(protocol).not.toHaveProperty('formatStepLabel');
	});

	test('the built-in entry exports the specs, slot schemas and formatStepLabel', () => {
		expect(Object.keys(builtIn.builtInRecipeSpecs)).toHaveLength(9);
		expect(builtIn).toHaveProperty('cardSpec');
		expect(builtIn).toHaveProperty('CardShellConfigSchema');
		expect(builtIn).toHaveProperty('formatStepLabel');
		expect(builtIn).not.toHaveProperty('defineRecipeSpec');
	});

	test('package exports expose only the protocol and built-in subpaths', () => {
		const { exports } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
			exports: Record<string, unknown>;
		};
		const recipeSubpaths = Object.keys(exports).filter((key) => key.startsWith('./recipes'));
		expect(recipeSubpaths.sort()).toEqual(['./recipes', './recipes/built-in']);
	});
});
