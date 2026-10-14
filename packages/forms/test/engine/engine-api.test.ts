import { describe, expect, test } from 'vitest';
import { ActionDispatcher } from '@schema-engine/actions';
import { ActionDispatcher as EngineActionDispatcher } from '@/engine';

describe('engine action dispatcher export', () => {
	test('re-exports the actions package dispatcher class', () => {
		expect(EngineActionDispatcher).toBe(ActionDispatcher);
	});
});
