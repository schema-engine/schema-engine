import { useWatch, useFormContext } from 'react-hook-form';

export function useWatchField<TWatchValue = unknown>(name: string | string[]): TWatchValue {
	const { control } = useFormContext();

	return useWatch({
		control,
		name: name as any,
	}) as TWatchValue;
}
