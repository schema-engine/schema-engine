import { useCallback, useContext, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { selectFieldState, selectValue } from '@schema-engine/forms/state-container';
import { getGridItemVariables } from '@schema-engine/layout';
import { FieldConstraintContext } from '@/contexts/field-constraint-context';
import { isElementRequired } from '@/hooks/is-element-required';
import { useConstraintLogic } from '@/hooks/use-constraint-logic';
import { useOptionalFormEngine } from '@/hooks/use-form-context';
import { formatIssueText, useContainerSelector, useFormStateContext } from './context';
import type { FormElementFieldValue, FormFieldValue } from './types';

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

/** The state of the field at `path`, with the commands that change it. */
function usePathField(path: string): FormFieldValue {
	const { container, formatIssue, fields } = useFormStateContext();
	const value = useContainerSelector((snapshot) => selectValue(snapshot, path));
	const { error, warning, invalid, isTouched, isDirty, isValidating } = useContainerSelector((snapshot) =>
		selectFieldState(snapshot, path),
	);

	const onChange = useCallback((next: unknown) => container.setValue(path, next), [container, path]);
	const onBlur = useCallback(() => container.blur(path), [container, path]);
	const ref = useCallback(
		(element: HTMLElement | null) => (element ? fields.register(path, element) : undefined),
		[fields, path],
	);

	return {
		value,
		error: error && formatIssueText(error, path, formatIssue),
		warning: warning && formatIssueText(warning, path, formatIssue),
		issue: error,
		invalid,
		isTouched,
		isDirty,
		isValidating,
		onChange,
		onBlur,
		name: path,
		ref,
	};
}

/**
 * Whether a field is required.
 *
 * @remarks
 * Under `FormElement` it comes from the constraints that element already evaluated for this field path. A
 * field rendered without one watches only the paths its constraints name, so an unconstrained field does not
 * re-render when another field changes. With no config it watches nothing and is not required.
 */
function useFieldRequired(config: ElementConfig | undefined): boolean {
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
 * Given the config of an element, it is everything a registry widget needs: the field's value and state, its
 * `onChange` and `onBlur`, and the props of its control, label and error (`fieldProps`, `labelProps`,
 * `errorProps`, `containerStyles`), with `required` evaluated against the element's constraints. Given a path
 * (a field, an array, or `FORM_ROOT` for the form itself) it is the value, state and formatted text of that
 * path alone, for a widget with no element config of its own.
 *
 * The widget re-renders when this field's value, error or flags change and not for another field. The value
 * is `unknown`, as the container holds it: the widget knows its own control's type and narrows it. A field
 * can be `invalid` with no `error` to show, so a widget marks itself invalid from `invalid` and not from the
 * text.
 */
export function useFormField(path: string): FormFieldValue;
export function useFormField(config: ElementConfig): FormElementFieldValue;
export function useFormField(target: string | ElementConfig): FormFieldValue | FormElementFieldValue {
	const config = typeof target === 'string' ? undefined : target;
	if (config && !config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}
	const field = usePathField(typeof target === 'string' ? target : target.name);
	const required = useFieldRequired(config);
	if (!config) return field;

	const disabled = Boolean(config.disabled);
	const fieldProps = mergeControlProps(
		{
			id: config.id,
			name: field.name,
			required,
			disabled,
			readOnly: config.readonly,
			ref: field.ref,
			'aria-invalid': field.invalid,
			'aria-describedby': field.error ? `${config.id}-error` : undefined,
		},
		config.htmlAttributes,
	);
	const containerStyles: CSSProperties = { ...getGridItemVariables(config.grid), ...config.style };

	return {
		...field,
		required,
		disabled,
		fieldProps,
		labelProps: { htmlFor: config.id },
		errorProps: field.error ? { id: `${config.id}-error`, role: 'alert' } : null,
		containerStyles,
	};
}
