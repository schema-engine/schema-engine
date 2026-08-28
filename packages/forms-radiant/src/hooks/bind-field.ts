import { isFieldRequired } from '@schema-engine/forms/schemas';
import { getActiveFormStore } from '@/adapters/store/active-store';
import { getFieldGridStyles } from './grid-styles';

export function combineHandlers<T>(controllerHandler: (value: T) => void, propsHandler?: (value: T) => void) {
	return (value: T) => {
		controllerHandler(value);
		propsHandler?.(value);
	};
}

export function bindControlledFormElement<TFieldValue = unknown>(config: FormEngine.ElementConfig) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const store = getActiveFormStore();
	const isRequired = isFieldRequired(config.rules);
	const name = config.name;
	const value = store.getValue<TFieldValue>(name);
	const error = store.getError(name);

	const onChange = (nextValue: TFieldValue) => {
		store.setValue(name, nextValue);
	};

	const onBlur = () => {
		store.markTouched(name);
		void store.trigger(name);
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
		valueBinding: store.fieldValueSignal<TFieldValue>(name),
		errorBinding: store.fieldErrorSignal(name),
		store,
	};
}

export type BindControlledFormElementReturn = ReturnType<typeof bindControlledFormElement>;
