import { describe, expect, test } from 'vitest';
import { findNearestRuiForm } from '@/lib/rui-form-utils';

describe('findNearestRuiForm', () => {
	test('finds rui-form nested inside the host', () => {
		const host = document.createElement('se-form-instance');
		const ruiForm = document.createElement('rui-form');
		host.append(ruiForm);

		expect(findNearestRuiForm(host)).toBe(ruiForm);
	});

	test('finds an ancestor rui-form', () => {
		const ruiForm = document.createElement('rui-form');
		const host = document.createElement('div');
		ruiForm.append(host);

		expect(findNearestRuiForm(host)).toBe(ruiForm);
	});

	test('does not select an unrelated rui-form in the document', () => {
		const root = document.createElement('div');
		const other = document.createElement('rui-form');
		const host = document.createElement('div');
		root.append(other, host);

		expect(findNearestRuiForm(host)).toBeNull();
	});
});
