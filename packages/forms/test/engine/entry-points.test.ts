import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import * as actions from '@/actions';
import * as engine from '@/engine';
import * as root from '@/index';

const FORM_ACTION_EXPORTS = [
	'formSubmitPlugin',
	'formResetPlugin',
	'notificationPlugin',
	'autoSavePlugin',
	'gtmPlugin',
	'FormActionTriggerSchema',
	'SubmitActionRegistration',
	'NotificationActionRegistration',
] as const;

describe('one import path per symbol', () => {
	test('the forms actions come from the package root', () => {
		for (const name of FORM_ACTION_EXPORTS) {
			expect(root, name).toHaveProperty(name);
			expect(actions, name).toHaveProperty(name);
		}
	});

	test('the package has no entry of its own for the forms actions', () => {
		const { exports } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
			exports: Record<string, unknown>;
		};
		expect(Object.keys(exports).filter((key) => key.startsWith('./actions'))).toEqual([]);
	});

	test('the dispatcher comes from @schema-engine/actions only', () => {
		expect(root).not.toHaveProperty('ActionDispatcher');
		expect(engine).not.toHaveProperty('ActionDispatcher');
		expect(actions).not.toHaveProperty('ActionDispatcher');
	});
});
