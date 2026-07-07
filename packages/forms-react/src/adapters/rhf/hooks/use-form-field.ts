import { useController, useFormContext } from 'react-hook-form';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import type { FormFieldValue } from '../../types';

export function useFormField<TFieldValue = unknown>(config: FormEngine.ElementConfig): FormFieldValue<TFieldValue> {
	const { formState } = useFormContext();

	const {
		field,
		fieldState: { error },
	} = useController({
		name: config.name,
		defaultValue: config.defaultValue ?? formState.defaultValues?.[config.name],
	});

	const required = isFieldRequired(config.rules);

	return {
		value: field.value as TFieldValue,
		error: error?.message,
		onChange: field.onChange,
		onBlur: field.onBlur,
		name: field.name,
		required,
	};
}
