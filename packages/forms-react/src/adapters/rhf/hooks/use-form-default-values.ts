import { useMemo } from 'react';
import { mergePathValues } from '@/lib/path-utils';

interface FieldWithDefault {
	name: string;
	defaultValue?: any;
}

/**
 * Computes the merged default values from field configurations and user-provided defaults.
 * Field defaults are applied first, then user defaults override them.
 */
export function useFormDefaultValues(
	fields: FieldWithDefault[],
	userDefaults: Record<string, any> = {},
): Record<string, any> {
	return useMemo(() => mergePathValues(fields, userDefaults), [fields, userDefaults]);
}
