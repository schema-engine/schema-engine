import { useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { selectFieldState, selectValue } from '@schema-engine/forms/state-container';
import { getGridItemVariables } from '@schema-engine/layout';
import { FieldConstraintContext } from '@/contexts/field-constraint-context';
import { isElementRequired } from '@/hooks/is-element-required';
import { useConstraintLogic } from '@/hooks/use-constraint-logic';
import { useOptionalFormEngine } from '@/hooks/use-form-context';
import { logger } from '@/lib/logger';
import { formatIssueText, useContainerSelector, useFormStateContext } from './context';
import type { ControlledFormField, FormField, FormFieldConfig, FormFieldOptions, FormFieldStatus } from './types';

let fallbackValidationRegistry: ValidationRegistry | undefined;

/**
 * The built-in validation registry a field uses when it renders outside a form engine.
 *
 * @remarks
 * Built on first use and shared. A registry is read-only, and building one checks every built-in
 * rule's schema, so a field should not build its own on each mount.
 */
function getFallbackValidationRegistry(): ValidationRegistry {
	fallbackValidationRegistry ??= createDefaultValidationRegistry();
	return fallbackValidationRegistry;
}

/** The state of the field at `path`, with its texts formatted. */
function useFieldStatus(path: string): FormFieldStatus {
	const { formatIssue } = useFormStateContext();
	const { error, warning, invalid, isTouched, isDirty, isValidating } = useContainerSelector((snapshot) =>
		selectFieldState(snapshot, path),
	);
	return {
		error: error && formatIssueText(error, path, formatIssue),
		warning: warning && formatIssueText(warning, path, formatIssue),
		issue: error,
		invalid,
		isTouched,
		isDirty,
		isValidating,
	};
}

const noValue = () => undefined;

/**
 * The value of the field at `path` when the component renders it, and nothing when it does not.
 *
 * @remarks
 * The hook is called in both modes with a selector that always answers `undefined`, so an uncontrolled field
 * subscribes to the container and is never told a value changed: a keystroke renders nothing.
 */
function useControlledValue(path: string, controlled: boolean): unknown {
	return useContainerSelector(controlled ? (snapshot) => selectValue(snapshot, path) : noValue);
}

const subscribeNever = () => () => undefined;

/**
 * The value an uncontrolled control starts with, frozen when the field mounts.
 *
 * @remarks
 * While the form hydrates it reads the container's server snapshot, so the control renders the markup the
 * server sent. It never follows the container afterwards: the control owns its text, and the registry writes
 * the container's changes back into it.
 */
function useDefaultValue(path: string): unknown {
	const { container } = useFormStateContext();
	const first = useSyncExternalStore(
		subscribeNever,
		() => selectValue(container.getSnapshot(), path),
		() => selectValue(container.getServerSnapshot(), path),
	);
	return useState(first)[0];
}

/**
 * Reports what the browser says about the field's native control after each render, and warns in development
 * when an uncontrolled field has none.
 *
 * @remarks
 * A control's verdict changes with its constraint attributes (`required`, `min`, `disabled`) and, in controlled
 * mode, with the value the component renders. Both reach the control through a render of this field, so
 * reading after every render keeps the fact current. The container ignores a fact it already holds, so a
 * render that changed nothing costs a read.
 */
function useNativeBinding(path: string, controlled: boolean, bound: boolean): void {
	const { fields } = useFormStateContext();
	useEffect(() => {
		if (bound) fields.reportNative(path);
	});
	useEffect(() => {
		if (!bound || controlled || process.env.NODE_ENV === 'production') return;
		const { registered, native } = fields.inspect(path);
		if (registered && !native) {
			logger.warn(
				`The field "${path}" is uncontrolled but its ref is not on an input, select or textarea. Use useFormField(config, { controlled: true }) for a component that takes value and onChange.`,
			);
		}
	}, [fields, path, controlled, bound]);
}

/**
 * Whether a field is required.
 *
 * @remarks
 * Under `FormElement` it comes from the constraints that element already evaluated for this field path. A
 * field rendered without one watches only the paths its constraints name, so an unconstrained field does not
 * re-render when another field changes. With no config it watches nothing and is not required.
 */
function useFieldRequired(config: FormFieldConfig | undefined): boolean {
	const engineContext = useOptionalFormEngine();
	const registry = useMemo(
		() => engineContext?.engine.getValidationRegistry() ?? getFallbackValidationRegistry(),
		[engineContext],
	);
	const rendered = useContext(FieldConstraintContext);
	const evaluated = config && rendered?.fieldPath === config.name ? rendered.constraints : undefined;
	const standalone = useConstraintLogic(
		config?.name ?? '',
		evaluated ? undefined : config?.constraints,
		!evaluated && config !== undefined && isElementRequired(config, registry),
	);
	return (evaluated ?? standalone).isRequired;
}

/**
 * Binds a widget to a field of the form.
 *
 * @remarks
 * Given the config of an element it is everything a registry widget needs: the field's state (`error`,
 * `warning`, `issue`, `invalid` and the flags), its `required` evaluated against the element's constraints,
 * and the props of its control, label and error (`fieldProps`, `labelProps`, `errorProps`, `containerStyles`).
 * Given a path (a field, an array, or `FORM_ROOT` for the form itself) it is the state and formatted texts
 * of that path alone; `useWatch` reads values.
 *
 * By default the control keeps its own value (`defaultValue`, `fieldProps.onChange`) and the field
 * re-renders only when its error, warning or flags change, never for a keystroke. A component that takes only
 * `value` and `onChange` props passes `{ controlled: true }` and re-renders with its value. In both modes
 * `fieldProps.ref` also reports what the browser says about a native control (`validity`) as the native
 * facts of the container, and focuses it for `setFocus` and a failed submit.
 */
export function useFormField(path: string): FormFieldStatus;
export function useFormField(config: FormFieldConfig, options: { controlled: true }): ControlledFormField;
export function useFormField(config: FormFieldConfig, options?: { controlled?: false }): FormField;
export function useFormField(
	target: string | FormFieldConfig,
	options?: FormFieldOptions,
): FormFieldStatus | FormField | ControlledFormField {
	const config = typeof target === 'string' ? undefined : target;
	if (config && !config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}
	const path = typeof target === 'string' ? target : target.name;
	const controlled = options?.controlled === true;
	const { container, fields } = useFormStateContext();
	const status = useFieldStatus(path);
	const required = useFieldRequired(config);
	const value = useControlledValue(path, controlled);
	const defaultValue = useDefaultValue(path);
	useNativeBinding(path, controlled, config !== undefined);

	const ref = useCallback(
		(element: HTMLElement | null) =>
			element ? fields.register(path, element, controlled ? 'controlled' : 'uncontrolled') : undefined,
		[fields, path, controlled],
	);
	const onNativeChange = useCallback(
		(event: ChangeEvent<HTMLElement>) => fields.change(path, event.currentTarget),
		[fields, path],
	);
	const onNativeBlur = useCallback(() => fields.blur(path), [fields, path]);
	const onValueChange = useCallback((next: unknown) => container.setValue(path, next), [container, path]);
	if (!config) return status;

	const disabled = Boolean(config.disabled);
	const control = mergeControlProps(
		{
			id: config.id,
			name: path,
			required,
			disabled,
			readOnly: config.readonly,
			ref,
			'aria-invalid': status.invalid,
			'aria-describedby': status.error ? `${config.id}-error` : undefined,
		},
		config.htmlAttributes,
	);
	const element = {
		...status,
		required,
		disabled,
		labelProps: { htmlFor: config.id },
		errorProps: status.error ? { id: `${config.id}-error`, role: 'alert' as const } : null,
		containerStyles: { ...getGridItemVariables(config.grid), ...config.style } satisfies CSSProperties,
	};
	if (controlled) {
		return { ...element, value, onChange: onValueChange, onBlur: onNativeBlur, fieldProps: control };
	}
	return { ...element, defaultValue, fieldProps: { ...control, onChange: onNativeChange, onBlur: onNativeBlur } };
}
