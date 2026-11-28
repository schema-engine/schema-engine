import { describe, expect, test } from 'vitest';
import * as entry from '../src';

describe('the actions entry', () => {
	test.each(['ActionRegistry', 'ActionRegistryProvider', 'ActionSchemaLookup'])('exports no %s', (name) => {
		expect(entry).not.toHaveProperty(name);
	});

	test('exports the dispatcher, the parser and the action helper', () => {
		expect(Object.keys(entry).toSorted()).toEqual(['ActionDispatcher', 'defineAction', 'parseActions']);
	});
});
