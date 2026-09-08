import { useMemo } from 'react';
import { mergePathValues } from '@schema-engine/forms/lib/path-values';

interface FieldWithDefault {
	name: string;
	defaultValue?: unknown;
}

/**
 * Computes the merged default values from field configurations and user-provided defaults.
 * Field defaults are applied first, then user defaults override them.
 */
export function useFormDefaultValues(
	fields: readonly FieldWithDefault[],
	userDefaults: Record<string, unknown> = {},
): Record<string, unknown> {
	return useMemo(() => mergePathValues(fields, userDefaults), [fields, userDefaults]);
}
