import { isFieldRequired } from '@schema-engine/forms/schemas';
import type { FormController } from '@/adapters/radiant/controller';
import { getFieldGridStyles } from './grid-styles';

export function combineHandlers<T>(controllerHandler: (value: T) => void, propsHandler?: (value: T) => void) {
	return (value: T) => {
		controllerHandler(value);
		propsHandler?.(value);
	};
}

export function bindControlledFormElement<TFieldValue = unknown>(
	config: FormEngine.ElementConfig,
	form: FormController,
) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const field = form.field(config.name);
	const isRequired = isFieldRequired(config.rules);
	const name = config.name;
	const value = field.value;
	const error = field.error;

	const onChange = (nextValue: TFieldValue) => {
		field.onChange(nextValue);
	};

	const onBlur = () => {
		field.onBlur();
	};

	const fieldProps = {
		id: config.id,
		name,
		required: isRequired,
		disabled: Boolean(config.disabled),
		readOnly: config.readonly,
		'aria-invalid': Boolean(error),
		'aria-describedby': error ? `${config.id}-error` : undefined,
	};

	const containerStyles = {
		...getFieldGridStyles(config.grid),
		...config.style,
	};

	return {
		value: (value ?? '') as TFieldValue,
		error,
		isRequired,
		name,
		required: isRequired,
		onChange,
		onBlur,
		fieldProps,
		labelProps: {
			htmlFor: config.id,
		},
		errorProps: error
			? {
					id: `${config.id}-error`,
					role: 'alert' as const,
				}
			: null,
		containerStyles,
		fieldState: {
			error: error ? { message: error } : undefined,
			invalid: Boolean(error),
		},
		config,
		combineHandlers,
		form,
	};
}

export type BindControlledFormElementReturn = ReturnType<typeof bindControlledFormElement>;
