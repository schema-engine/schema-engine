import type React from 'react';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { getDefaultGridTheme, getFieldGridHostProps } from '@schema-engine/forms/lib/grid-styles';
import { useFormField } from '@/adapters/context';
import { useOptionalFormEngine } from '@/hooks/use-form-context';

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

	const engineThemeId = useOptionalFormEngine()?.engine.getGridTheme().id ?? getDefaultGridTheme().id;
	const fieldHost = getFieldGridHostProps(engineThemeId, config.grid);
	const containerStyles: React.CSSProperties = {
		...fieldHost.style,
		...config.style,
	};

	return {
		gridThemeId: fieldHost.themeId,
		value,
		error,
		isRequired,
		onChange,
		onBlur,
		fieldProps,
		labelProps,
		errorProps,
		containerStyles,
		fieldState: {
			error: error ? { message: error } : undefined,
			invalid: Boolean(error),
		},
		config,
		combineHandlers,
	};
}

export type UseControlledFormElementReturn = ReturnType<typeof useControlledFormElement>;
