import { useController, useFormContext } from 'react-hook-form';
import type { FormFieldValue } from '../../types';

export function useFormField<TFieldValue = unknown>(config: FormEngine.FieldConfig): FormFieldValue<TFieldValue> {
	const { formState } = useFormContext();

	const {
		field,
		fieldState: { error },
	} = useController({
		name: config.name,
		defaultValue: config.defaultValue ?? formState.defaultValues?.[config.name],
	});

	const isRequired =
		config.rules?.some((rule: any) => rule?.type === 'required' || rule?.rule === 'required') || false;

	return {
		value: field.value as TFieldValue,
		error: error?.message,
		onChange: field.onChange,
		onBlur: field.onBlur,
		name: field.name,
		required: isRequired,
	};
}
