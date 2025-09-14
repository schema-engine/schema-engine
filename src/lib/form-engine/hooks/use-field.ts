import { useController } from 'react-hook-form';
import { isFieldRequired } from '../schemas/validation';
import { useFieldGridStyles } from './grid-hooks';
import type { FieldConfig } from '@/lib/form-engine/schemas';

/**
 * Creates a default value for a field configuration
 */
export function createFieldDefaultValue(config: FormEngine.FieldConfig): any {
	if ('defaultValue' in config && config.defaultValue !== undefined) {
		return config.defaultValue;
	}

	switch (config.componentId) {
		case 'input':
			return '';
		case 'number':
			return 0;
		case 'textarea':
			return '';
		case 'select':
			return '';
		case 'checkbox':
			return false;
		case 'radio':
			return '';
		case 'arrayElements':
			return [];
		default:
			return '';
	}
}

/**
 * Combines handlers from props with controller handlers
 */
export function combineHandlers<T>(controllerHandler: (value: T) => void, propsHandler?: (value: T) => void) {
	return (value: T) => {
		controllerHandler(value);
		propsHandler?.(value);
	};
}

/**
 * Hook that provides all the field functionality for form fields using useController
 * This replaces the FieldGroup wrapper and gives fields full control
 * over their rendering, errors, and semantic HTML
 */
export function useControlledFormElement(config: FieldConfig) {
	const isRequired = isFieldRequired(config.rules);

	const { field, fieldState, formState } = useController({
		name: config.name,
		disabled: config.disabled,
		defaultValue: createFieldDefaultValue(config),
		rules: {
			required: isRequired ? `${config.label || config.name} is required` : false,
		},
	});

	const gridStyles = useFieldGridStyles(config.grid);

	const fieldProps = {
		id: config.id,
		name: field.name,
		required: isRequired,
		disabled: config.disabled,
		readOnly: config.readonly,
		'aria-invalid': fieldState.invalid,
		'aria-describedby': fieldState.error ? `${config.id}-error` : undefined,
		ref: field.ref,
	};

	const labelProps = {
		htmlFor: config.id,
		className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
			isRequired ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
		}`,
	};

	const errorProps = fieldState.error
		? {
				id: `${config.id}-error`,
				role: 'alert' as const,
				className: 'text-sm text-destructive',
			}
		: null;

	const containerStyles = {
		...gridStyles,
		...config.style,
	};

	return {
		field,
		fieldState,
		formState,
		value: field.value,
		error: fieldState.error?.message,
		isDirty: fieldState.isDirty,
		isTouched: fieldState.isTouched,
		isRequired,
		onChange: field.onChange,
		onBlur: field.onBlur,
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
 * Type for the return value of useControlledFormElement hook
 */
export type UseControlledFormElementReturn = ReturnType<typeof useControlledFormElement>;
