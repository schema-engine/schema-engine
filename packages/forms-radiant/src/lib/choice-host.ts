import { prop } from '@ecopages/radiant';
import { choiceKeys, choiceValueOf, type ChoiceOption } from './choice-value.js';
import { ControlHost } from './control-host.js';

/** The value a choice element declares: an option's own value, or a list of them with `multiple`. */
export type ChoiceValue = string | number | Array<string | number>;

/** The attribute channel of `value`, which is a string, a number or a list of them: JSON, and the text itself when it is not JSON. */
const choiceValueTransform = {
	fromAttribute: (text: string | null): ChoiceValue => {
		if (text === null) return '';
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	},
	toAttribute: (value: ChoiceValue) => JSON.stringify(value),
};

/**
 * A {@link ControlHost} around a Radiant UI control that chooses among options.
 *
 * @remarks
 * The control keys its options by the text of their values, so each element maps the declared value to those
 * keys and back to the value its option declares. A single choice that is cleared is `''`, the empty value the
 * form holds for a field nothing was chosen in.
 */
export abstract class ChoiceHost<THeld extends string | string[]> extends ControlHost<ChoiceValue, THeld> {
	@prop({ type: Array }) options: readonly ChoiceOption[] = [];
	@prop({ type: Object, transform: choiceValueTransform }) value: ChoiceValue = '';

	/** The value of each option the control holds the key of: a list when `many`, else the first, or `''` when nothing is chosen. */
	protected chosen(held: unknown, many: boolean): ChoiceValue {
		const values = choiceKeys(held).map((key) => choiceValueOf(this.options, key));
		return many ? values : (values[0] ?? '');
	}
}
