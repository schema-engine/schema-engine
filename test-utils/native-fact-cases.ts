import { userEvent } from 'vitest/browser';

/**
 * One state of a native control and the fact both renderers must report for it.
 *
 * @remarks
 * `value` is typed as a user would, and `attributesAfterValue` are set once it is typed, so a constraint
 * that only applies to a value the user wrote (`tooShort`, `tooLong`) is exercised. The `message` of a fact is the browser's own
 * `validationMessage`, so it is compared against the control and not listed here.
 */
export interface NativeFactCase {
	readonly name: string;
	readonly tag?: 'input' | 'textarea' | 'select';
	readonly attributes?: Readonly<Record<string, string>>;
	readonly value?: string;
	/** Sets `value` from a script, for a control that cannot be typed into with a keyboard (a date). */
	readonly valueByScript?: boolean;
	readonly attributesAfterValue?: Readonly<Record<string, string>>;
	readonly customValidity?: string;
	readonly disabled?: boolean;
	readonly fact: { readonly type: string; readonly params?: Readonly<Record<string, unknown>> } | null;
}

/**
 * The facts `rui-form` of Radiant UI 0.5.0 reports, which React's `readNativeFact` must report too.
 *
 * @remarks
 * Each row is a control state and its fact: the first flag set in the order `valueMissing`, `typeMismatch`,
 * `patternMismatch`, `tooLong`, `tooShort`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`,
 * `customError`; the bounds of a number as numbers and every other param as the control's own property.
 */
export const nativeFactCases: readonly NativeFactCase[] = [
	{ name: 'a text without constraints', fact: null },
	{ name: 'a required text, empty', attributes: { required: '' }, fact: { type: 'valueMissing' } },
	{ name: 'a required text, filled', attributes: { required: '' }, value: 'ada', fact: null },
	{
		name: 'a required textarea, empty',
		tag: 'textarea',
		attributes: { required: '' },
		fact: { type: 'valueMissing' },
	},
	{
		name: 'a required select on its empty option',
		tag: 'select',
		attributes: { required: '' },
		fact: { type: 'valueMissing' },
	},
	{
		name: 'an email that is not one',
		attributes: { type: 'email' },
		value: 'abc',
		fact: { type: 'typeMismatch', params: { inputType: 'email' } },
	},
	{
		name: 'a url that is not one',
		attributes: { type: 'url' },
		value: 'abc',
		fact: { type: 'typeMismatch', params: { inputType: 'url' } },
	},
	{ name: 'an email that is one', attributes: { type: 'email' }, value: 'a@b.co', fact: null },
	{
		name: 'a text that misses its pattern',
		attributes: { pattern: '[0-9]+' },
		value: 'abc',
		fact: { type: 'patternMismatch', params: { pattern: '[0-9]+' } },
	},
	{
		name: 'a text shorter than its minlength',
		attributes: { minlength: '8' },
		value: 'short',
		fact: { type: 'tooShort', params: { minLength: 8 } },
	},
	{
		name: 'a textarea shorter than its minlength',
		tag: 'textarea',
		attributes: { minlength: '8' },
		value: 'short',
		fact: { type: 'tooShort', params: { minLength: 8 } },
	},
	{
		name: 'a text longer than the maxlength set after it was typed',
		value: 'abcdef',
		attributesAfterValue: { maxlength: '3' },
		fact: { type: 'tooLong', params: { maxLength: 3 } },
	},
	{
		name: 'a number under its min, as a number',
		attributes: { type: 'number', min: '5' },
		value: '3',
		fact: { type: 'rangeUnderflow', params: { min: 5 } },
	},
	{
		name: 'a number over its max, as a number',
		attributes: { type: 'number', max: '10' },
		value: '12',
		fact: { type: 'rangeOverflow', params: { max: 10 } },
	},
	{
		name: 'a number with a decimal min',
		attributes: { type: 'number', min: '0.5', step: 'any' },
		value: '0.25',
		fact: { type: 'rangeUnderflow', params: { min: 0.5 } },
	},
	{
		name: 'a date before its min, as the attribute text',
		attributes: { type: 'date', min: '2024-01-01' },
		value: '2023-12-31',
		valueByScript: true,
		fact: { type: 'rangeUnderflow', params: { min: '2024-01-01' } },
	},
	{
		name: 'a date after its max, as the attribute text',
		attributes: { type: 'date', max: '2024-01-31' },
		value: '2024-02-01',
		valueByScript: true,
		fact: { type: 'rangeOverflow', params: { max: '2024-01-31' } },
	},
	{
		name: 'a number off its step, the step as the attribute text',
		attributes: { type: 'number', step: '2' },
		value: '3',
		fact: { type: 'stepMismatch', params: { step: '2' } },
	},
	{
		name: 'a number whose text is not a number',
		attributes: { type: 'number' },
		value: '1e',
		fact: { type: 'badInput' },
	},
	{
		name: 'a text the script marked invalid',
		customValidity: 'Name taken',
		fact: { type: 'customError' },
	},
	{
		name: 'a required text, empty, that the script marked invalid: the flag wins',
		attributes: { required: '' },
		customValidity: 'Name taken',
		fact: { type: 'valueMissing' },
	},
	{
		name: 'an email that is not one and misses its pattern: the first flag wins',
		attributes: { type: 'email', pattern: '.+@example\\.com' },
		value: 'abc',
		fact: { type: 'typeMismatch', params: { inputType: 'email' } },
	},
	{
		name: 'a text that misses its pattern and is too short: the pattern wins',
		attributes: { pattern: '[0-9]+', minlength: '8' },
		value: 'abc',
		fact: { type: 'patternMismatch', params: { pattern: '[0-9]+' } },
	},
	{ name: 'a disabled required text', attributes: { required: '' }, disabled: true, fact: null },
	{ name: 'a read-only required text', attributes: { required: '', readonly: '' }, fact: null },
];

/** The control a case describes, not yet in the document. */
export function createNativeControl(spec: NativeFactCase): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
	const control = document.createElement(spec.tag ?? 'input');
	for (const [name, value] of Object.entries(spec.attributes ?? {})) control.setAttribute(name, value);
	if (control instanceof HTMLSelectElement) control.append(new Option('', ''), new Option('a', 'a'));
	control.disabled = spec.disabled === true;
	return control;
}

/**
 * Brings a control in the document to the state a case describes: the value typed as a user would, then the
 * constraints that follow it and the custom message.
 */
export async function putControlInState(
	control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
	spec: NativeFactCase,
): Promise<void> {
	if (spec.value !== undefined && spec.valueByScript) control.value = spec.value;
	else if (spec.value !== undefined && !(control instanceof HTMLSelectElement))
		await userEvent.type(control, spec.value);
	for (const [name, value] of Object.entries(spec.attributesAfterValue ?? {})) control.setAttribute(name, value);
	if (spec.customValidity !== undefined) control.setCustomValidity(spec.customValidity);
}
