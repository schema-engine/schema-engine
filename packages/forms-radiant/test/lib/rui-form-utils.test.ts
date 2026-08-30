import { describe, expect, test, vi } from 'vitest';
import {
	findNativeForm,
	findNearestRuiForm,
	getRuiFormStore,
	readRuiFormStore,
	submitNativeForm,
} from '@/lib/rui-form-utils';

describe('submitNativeForm', () => {
	test('uses requestSubmit so RuiForm can validate', () => {
		const requestSubmit = vi.fn();
		const dispatchEvent = vi.fn();

		submitNativeForm({ requestSubmit, dispatchEvent });

		expect(requestSubmit).toHaveBeenCalledOnce();
		expect(dispatchEvent).not.toHaveBeenCalled();
	});

	test('falls back to a submit event when requestSubmit is missing', () => {
		const dispatchEvent = vi.fn();

		submitNativeForm({ dispatchEvent } as { requestSubmit?: () => void; dispatchEvent: (event: Event) => boolean });

		expect(dispatchEvent).toHaveBeenCalledOnce();
		const event = dispatchEvent.mock.calls[0]?.[0] as Event;
		expect(event.type).toBe('submit');
	});
});

describe('findNearestRuiForm', () => {
	test('finds rui-form nested inside the host', () => {
		const host = document.createElement('se-form-instance');
		const ruiForm = document.createElement('rui-form');
		host.append(ruiForm);

		expect(findNearestRuiForm(host)).toBe(ruiForm);
	});
});

describe('findNativeForm', () => {
	test('finds the native form in the rui-form light tree', () => {
		const ruiForm = document.createElement('rui-form');
		const form = document.createElement('form');
		form.className = 'rui-form';
		ruiForm.append(form);

		expect(findNativeForm(ruiForm)).toBe(form);
	});
});

describe('getRuiFormStore', () => {
	test('returns the store when rui-form has one', () => {
		const ruiForm = document.createElement('rui-form');
		const store = {
			isSubmitted: false,
			validateField: async () => true,
			markTouched: () => undefined,
		};
		Reflect.set(ruiForm, 'store', store);

		expect(getRuiFormStore(ruiForm)).toBe(store);
	});
});

describe('readRuiFormStore', () => {
	test('returns a store only when it satisfies the requested contract', () => {
		const ruiForm = document.createElement('rui-form');
		const store = {
			getValues: () => ({ name: 'Ada' }),
			reset: () => undefined,
		};
		Reflect.set(ruiForm, 'store', store);

		expect(readRuiFormStore<typeof store>(ruiForm, ['getValues', 'reset'])).toBe(store);
		expect(readRuiFormStore<typeof store>(ruiForm, ['getValues', 'validateAll'])).toBeNull();
	});
});
