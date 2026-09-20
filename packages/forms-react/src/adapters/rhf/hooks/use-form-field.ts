import { useController, useFormContext } from 'react-hook-form';
import { isFieldRequired, type ElementConfig } from '@schema-engine/forms/schemas';
import type { FormFieldValue } from '../../types';

export function useFormField<TFieldValue = unknown>(config: ElementConfig): FormFieldValue<TFieldValue> {
	const { formState } = useFormContext();

	const {
		field,
		fieldState: { error },
	} = useController({
		name: config.name,
		defaultValue: config.defaultValue ?? formState.defaultValues?.[config.name],
		disabled: Boolean(config.disabled),
	});

	return {
		value: field.value as TFieldValue,
		error: error?.message,
		onChange: field.onChange,
		onBlur: field.onBlur,
		name: field.name,
		required: isFieldRequired(config.rules),
		disabled: field.disabled,
		ref: field.ref,
	};
}
