import { isFieldRequired } from '@schema-engine/forms/schemas';
import { useFormField } from '@/adapters/context';
import { useFieldGridStyles } from './grid-hooks';

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
 * Field chrome and value binding for consumer-owned registry components.
 * Goes through the active FormAdapter — not a specific form library.
 */
export function useControlledFormElement(config: FormEngine.ElementConfig) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const isRequired = isFieldRequired(config.rules);
	const { value, error, onChange, onBlur, name, disabled, ref } = useFormField<any>(config);
	const gridStyles = useFieldGridStyles(config.grid);

	const fieldProps = {
		id: config.id,
		name,
		required: isRequired,
		disabled,
		readOnly: config.readonly,
		ref,
		'aria-invalid': Boolean(error),
		'aria-describedby': error ? `${config.id}-error` : undefined,
	};

	const labelProps = {
		htmlFor: config.id,
		className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
			isRequired ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
		}`,
	};

	const errorProps = error
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
		fieldState: {
			error: error ? { message: error } : undefined,
			invalid: Boolean(error),
		},
		config,
		combineHandlers,
	};
}

export type UseControlledFormElementReturn = ReturnType<typeof useControlledFormElement>;
