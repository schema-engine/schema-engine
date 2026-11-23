import { describe, expect, test } from 'vitest';
import {
	controlMatches,
	readControl,
	readNativeFact,
	writeControl,
	type NativeControl,
} from '@/hooks/form-state/native-control';
import { createNativeControl, nativeFactCases, putControlInState } from '../../../../test-utils/native-fact-cases';

function input(type: string, attributes: Record<string, string> = {}): HTMLInputElement {
	const element = document.createElement('input');
	element.type = type;
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
	return element;
}

function select(multiple: boolean): HTMLSelectElement {
	const element = document.createElement('select');
	element.multiple = multiple;
	for (const value of ['a', 'b', 'c']) element.append(new Option(value, value));
	return element;
}

const cases: Array<[string, NativeControl, unknown]> = [
	['text', input('text'), 'hello'],
	['textarea', document.createElement('textarea'), 'two\nlines'],
	['a checkbox', input('checkbox'), true],
	['a checkbox list item', input('checkbox', { value: 'b' }), ['a', 'b']],
	['a radio', input('radio', { value: 'b' }), 'b'],
	['a number', input('number'), 3.5],
	['an empty number', input('number'), undefined],
	['a single select', select(false), 'b'],
	['a multiple select', select(true), ['a', 'c']],
	['a file input', input('file'), []],
];

describe('writing a value into a control', () => {
	test.each(cases)('leaves %s matching the value it was given, so a write never repeats', (_name, control, value) => {
		writeControl(control, value);

		expect(controlMatches(control, value)).toBe(true);
	});

	test('reads back what was written, for the values a control can hold', () => {
		const text = input('text');
		writeControl(text, 'abc');
		expect(readControl(text, undefined)).toBe('abc');

		const checks = input('checkbox', { value: 'b' });
		writeControl(checks, ['a', 'b']);
		expect(readControl(checks, ['a', 'b'])).toEqual(['a', 'b']);

		const many = select(true);
		writeControl(many, ['a', 'c']);
		expect(readControl(many, [])).toEqual(['a', 'c']);
	});
});

describe('the fact of a control', () => {
	test('reports a flag, and nothing for a control the browser does not validate', () => {
		expect(readNativeFact(input('email'))).toBeNull();
		const required = input('text', { required: '' });
		expect(readNativeFact(required)).toMatchObject({ type: 'valueMissing' });
		required.disabled = true;
		expect(readNativeFact(required)).toBeNull();
	});
});

describe('the fact of a control matches the fact rui-form reports', () => {
	test.each(nativeFactCases.map((spec) => [spec.name, spec] as const))('%s', async (_name, spec) => {
		const control = createNativeControl(spec);
		document.body.append(control);
		try {
			await putControlInState(control, spec);

			const fact = readNativeFact(control);

			if (spec.fact === null) {
				expect(fact).toBeNull();
				return;
			}
			expect(fact).toEqual({
				...spec.fact,
				...(control.validationMessage && { message: control.validationMessage }),
			});
			expect(fact?.message).toBe(control.validationMessage || undefined);
		} finally {
			control.remove();
		}
	});
});
