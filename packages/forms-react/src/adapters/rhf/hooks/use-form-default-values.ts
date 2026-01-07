import { useMemo } from 'react';

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
	return useMemo(() => {
		const fieldDefaults = fields.reduce(
			(acc, field) => {
				if (field.defaultValue !== undefined) {
					acc[field.name] = field.defaultValue;
				}
				return acc;
			},
			{} as Record<string, any>,
		);

		return { ...fieldDefaults, ...userDefaults };
	}, [fields, userDefaults]);
}
