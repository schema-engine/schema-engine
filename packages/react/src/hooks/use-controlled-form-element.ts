import { useMemo } from 'react';
import { useFormField } from '@/adapters/context';
import { useFieldGridStyles } from './grid-hooks';

/**
 * Helper function to check if a field is required based on validation rules
 */
function isFieldRequired(rules?: any[]): boolean {
	return (
		rules?.some((rule: any) => {
			if (typeof rule === 'object' && rule !== null) {
				return rule.type === 'required' || rule.rule === 'required';
			}
			return false;
		}) || false
	);
}

/**
 * Helper function to combine event handlers
 */
function combineHandlers<T = any>(adapterHandler?: (value: T) => void, propsHandler?: (value: T) => void) {
	return (value: T) => {
		adapterHandler?.(value);
		propsHandler?.(value);
	};
}

/**
 * Adapter-aware hook that provides all the field functionality for form fields
 * This replaces the RHF-specific useControlledFormElement and works with any adapter
 */
export function useAdapterControlledFormElement(config: FormEngine.ElementConfig) {
	const isRequired = isFieldRequired(config.rules);
	const { value, error, onChange, onBlur, name } = useFormField(config);
	const gridStyles = useFieldGridStyles(config.grid);

	const fieldProps = useMemo(
		() => ({
			id: config.id,
			name,
			required: isRequired,
			disabled: config.disabled,
			readOnly: config.readonly,
			'aria-invalid': !!error,
			'aria-describedby': error ? `${config.id}-error` : undefined,
		}),
		[config.id, name, isRequired, config.disabled, config.readonly, error],
	);

	const labelProps = useMemo(
		() => ({
			htmlFor: config.id,
			className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
				isRequired ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
			}`,
		}),
		[config.id, isRequired],
	);

	const errorProps = useMemo(
		() =>
			error
				? {
						id: `${config.id}-error`,
						role: 'alert' as const,
						className: 'text-sm text-destructive',
					}
				: null,
		[config.id, error],
	);

	const containerStyles = useMemo(
		() => ({
			...gridStyles,
			...config.style,
		}),
		[gridStyles, config.style],
	);

	return {
		value,
		error,
		isRequired,
		onChange,
		onBlur,
		fieldProps,
		labelProps,
		errorProps,
		containerStyles,
		gridStyles,
		config,
		combineHandlers,
	};
}

/**
 * Type for the return value of useAdapterControlledFormElement hook
 */
export type UseAdapterControlledFormElementReturn = ReturnType<typeof useAdapterControlledFormElement>;
