import { useWatch } from 'react-hook-form';

export function useWatchForm<TFormData = Record<string, unknown>>(): TFormData {
	return useWatch() as TFormData;
}
