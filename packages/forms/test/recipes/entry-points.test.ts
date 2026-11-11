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
		expect(protocol).not.toHaveProperty('formatStepCounter');
	});

	test('the built-in entry exports the specs, slot schemas and formatStepCounter', () => {
		expect(Object.keys(builtIn.builtInRecipeSpecs)).toHaveLength(9);
		expect(builtIn).toHaveProperty('cardSpec');
		expect(builtIn).toHaveProperty('CardShellConfigSchema');
		expect(builtIn).toHaveProperty('formatStepCounter');
		expect(builtIn).not.toHaveProperty('defineRecipeSpec');
	});
});
