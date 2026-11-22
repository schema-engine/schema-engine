import type { NativeValidity } from '@schema-engine/forms/state-container';
import { fieldText } from '../field-text';

/** The elements the browser validates and holds a value for. */
export type NativeControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function isNativeControl(element: HTMLElement): element is NativeControl {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	);
}

const isInput = (control: NativeControl, type: string): control is HTMLInputElement =>
	control instanceof HTMLInputElement && control.type === type;

const hasValueAttribute = (control: NativeControl): boolean => control.hasAttribute('value');

const isMultipleSelect = (control: NativeControl): control is HTMLSelectElement =>
	control instanceof HTMLSelectElement && control.multiple;

const asList = (value: unknown): readonly string[] => (Array.isArray(value) ? value.map(String) : []);

/** The number a container value stands for in a number input, or `NaN` when it is empty or not a number. */
function asNumber(value: unknown): number {
	if (typeof value === 'number') return value;
	return typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
}

const isEmptyFiles = (value: unknown): boolean => value === undefined || value === null || asList(value).length === 0;

/**
 * What the control holds, as the container's value for it.
 *
 * @remarks
 * `current` is the container's value for the path, which a choice that does not decide the whole value keeps:
 * a checkbox with a `value` attribute adds or removes its own value in a list, and a radio that is not the
 * checked one leaves the value as it is.
 */
export function readControl(control: NativeControl, current: unknown): unknown {
	if (isInput(control, 'checkbox')) {
		if (!hasValueAttribute(control)) return control.checked;
		const others = asList(current).filter((item) => item !== control.value);
		return control.checked ? [...others, control.value] : others;
	}
	if (isInput(control, 'radio')) return control.checked ? control.value : current;
	if (isInput(control, 'number')) return Number.isNaN(control.valueAsNumber) ? undefined : control.valueAsNumber;
	if (isInput(control, 'file')) return Array.from(control.files ?? []);
	if (isMultipleSelect(control)) return Array.from(control.selectedOptions, (option) => option.value);
	return control.value;
}

/**
 * Whether reading the control would already give `value`.
 *
 * @remarks
 * It compares what the control shows with what the container holds and never rewrites text the user is
 * typing: a number input with `badInput` reports an empty value, so it matches an empty container value and
 * keeps its text, and a control that echoes its own change matches too, so the cursor and an IME
 * composition are left alone. A file input can only be cleared, so a value that is not empty matches.
 */
export function controlMatches(control: NativeControl, value: unknown): boolean {
	if (isInput(control, 'checkbox')) {
		return (
			control.checked === (hasValueAttribute(control) ? asList(value).includes(control.value) : Boolean(value))
		);
	}
	if (isInput(control, 'radio'))
		return control.checked === (fieldText(value) !== '' && control.value === fieldText(value));
	if (isInput(control, 'number')) {
		const expected = asNumber(value);
		return Number.isNaN(expected) ? control.value === '' : control.valueAsNumber === expected;
	}
	if (isInput(control, 'file')) return !isEmptyFiles(value) || (control.files?.length ?? 0) === 0;
	if (isMultipleSelect(control)) {
		const selected = asList(value);
		return Array.from(control.options).every((option) => option.selected === selected.includes(option.value));
	}
	return control.value === fieldText(value);
}

/** Makes the control show `value`: the counterpart of {@link readControl}, written outside React. */
export function writeControl(control: NativeControl, value: unknown): void {
	if (isInput(control, 'checkbox')) {
		control.checked = hasValueAttribute(control) ? asList(value).includes(control.value) : Boolean(value);
	} else if (isInput(control, 'radio')) {
		control.checked = fieldText(value) !== '' && control.value === fieldText(value);
	} else if (isInput(control, 'number')) {
		const expected = asNumber(value);
		control.value = Number.isNaN(expected) ? '' : String(expected);
	} else if (isInput(control, 'file')) {
		control.value = '';
	} else if (isMultipleSelect(control)) {
		const selected = asList(value);
		Array.from(control.options).forEach((option) => {
			option.selected = selected.includes(option.value);
		});
	} else {
		control.value = fieldText(value);
	}
}

/** Whether two values read from a control are the same, an array by its items. */
export function sameValue(left: unknown, right: unknown): boolean {
	if (Array.isArray(left) && Array.isArray(right)) {
		return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
	}
	return Object.is(left, right);
}

/** The `ValidityState` flags a control reports, in the order the first one that is set is the fact. */
const FLAGS = [
	'valueMissing',
	'typeMismatch',
	'patternMismatch',
	'tooShort',
	'tooLong',
	'rangeUnderflow',
	'rangeOverflow',
	'stepMismatch',
	'badInput',
] as const;

type Flag = (typeof FLAGS)[number];

/** The constraint behind a flag that a text needs, from the attributes the control carries. */
function flagParams(flag: Flag, control: NativeControl): Readonly<Record<string, unknown>> | undefined {
	const input = control instanceof HTMLInputElement ? control : undefined;
	switch (flag) {
		case 'typeMismatch':
			return { inputType: control.type };
		case 'patternMismatch':
			return input && { pattern: input.pattern };
		case 'tooShort':
			return !(control instanceof HTMLSelectElement) ? { minLength: control.minLength } : undefined;
		case 'tooLong':
			return !(control instanceof HTMLSelectElement) ? { maxLength: control.maxLength } : undefined;
		case 'rangeUnderflow':
			return input && { min: input.min };
		case 'rangeOverflow':
			return input && { max: input.max };
		case 'stepMismatch':
			return input && { step: input.step };
		default:
			return undefined;
	}
}

/**
 * What the browser says about the control's value, as the container's native fact, or `null` when it is valid.
 *
 * @remarks
 * Reads the same flags and params as `rui-form` of Radiant. A control the browser does not validate
 * (disabled, read-only, hidden) reports valid. The browser's own message travels only as a fallback, since
 * the form's formatter words the issue. A custom validity message is not a fact: rules decide those.
 */
export function readNativeFact(control: NativeControl): NativeValidity | null {
	if (!control.willValidate) return null;
	const { validity, validationMessage } = control;
	const flag = FLAGS.find((name) => validity[name]);
	if (!flag) return null;
	const params = flagParams(flag, control);
	return {
		type: flag,
		...(params && { params }),
		...(validationMessage && { message: validationMessage }),
	};
}
