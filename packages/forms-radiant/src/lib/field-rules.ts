import type { ValidationRule } from '@schema-engine/forms/schemas';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';

/**
 * Whether the render overlay marks an element required.
 *
 * @remarks
 * `renderRegisteredElement` overlays `required` on the config it renders: the
 * element's own required rule, a matching `require` constraint, or one passed
 * down by a fieldset. Element schemas do not declare it. Inputs show it as the
 * required marker only; it never enters the serialized rules, so constraint
 * sync, which owns the live `required` rule, can lift it again.
 */
export function isRenderedRequired(config: object): boolean {
	return 'required' in config && config.required === true;
}

/**
 * A container's child elements with the container's `disabled` and `required` passed down.
 *
 * @remarks
 * `required` passes when the render overlay marks the container required and
 * either the container declares constraints or its own required rule is not the
 * source; `se-field` then applies the live rule from the constraint context.
 */
export function withContainerState<T extends object>(
	config: { disabled?: boolean; constraints?: readonly unknown[]; rules?: ReadonlyArray<ValidationRule> },
	elements: readonly T[],
): readonly T[] {
	const disabled = config.disabled === true;
	const required =
		isRenderedRequired(config) && (Boolean(config.constraints?.length) || !isFieldRequired(config.rules));
	if (!disabled && !required) return elements;
	return elements.map((element) => ({
		...element,
		...(disabled ? { disabled: true } : {}),
		...(required ? { required: true } : {}),
	}));
}
