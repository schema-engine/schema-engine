import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FormFieldArrayValue } from '../../types';

export function useRhfFieldArray(name: string): FormFieldArrayValue {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name,
	});

	return {
		fields,
		append: (value: unknown) => append(value as never),
		remove,
	};
}
