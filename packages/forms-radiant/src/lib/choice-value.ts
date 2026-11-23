export function serializeChoiceValue(value: unknown): string | undefined {
	if (value == null || value === '') {
		return undefined;
	}

	if (Array.isArray(value)) {
		return (
			value
				.map((item) =>
					typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
						? String(item)
						: '',
				)
				.filter(Boolean)
				.join(',') || undefined
		);
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return undefined;
}

/** An option of a choice element: the value it declares is the one the form holds when it is chosen. */
export interface ChoiceOption {
	readonly value: string | number;
	readonly label: string;
	readonly disabled?: boolean;
}

/** The text of each value a choice control holds: Radiant UI keys its options by the text of their values. */
export function choiceKeys(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	return value === undefined || value === null || value === '' ? [] : [String(value)];
}

/**
 * The value the option a key stands for declares, so a number stays a number.
 *
 * @remarks A key no option has stays text.
 */
export function choiceValueOf(options: readonly ChoiceOption[], key: string): string | number {
	return options.find((option) => String(option.value) === key)?.value ?? key;
}

/** The options a Radiant UI listbox, radio group or checkbox group renders, keyed by the text of their values. */
export function choiceControlOptions(options: readonly ChoiceOption[]) {
	return options.map((option) => ({ value: String(option.value), label: option.label, disabled: option.disabled }));
}
