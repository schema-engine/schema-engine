import { useFieldArray as useRHFFieldArray, useFormContext } from 'react-hook-form';
import type { FieldArrayValue } from '../../types';

export function useFieldArray(name: string): FieldArrayValue {
	const { control } = useFormContext();
	const { fields, append, remove } = useRHFFieldArray({
		control,
		name,
	});

	return {
		fields,
		append,
		remove,
	};
}
