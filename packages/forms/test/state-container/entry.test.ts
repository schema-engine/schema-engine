import { describe, expect, test } from 'vitest';
import * as entry from '@/state-container';

describe('the state container entry point', () => {
	test('exports the factory, the reads and the constants, and not the conformance suite', () => {
		expect(Object.keys(entry).toSorted()).toEqual([
			'FORM_ROOT',
			'FormValidationFailure',
			'createFormStateContainer',
			'selectError',
			'selectFieldState',
			'selectValue',
			'selectWarning',
			'toFieldArrayValue',
		]);
		expect(entry.FORM_ROOT).toBe('__root__');
	});
});
