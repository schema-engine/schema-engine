import type React from 'react';
import { useContext, useMemo } from 'react';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { getGridItemVariables, type ElementGridConfig, getAppearanceAttributes } from '@schema-engine/layout';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { useFormField } from '@/adapters/context';
import { useConstraintLogic } from '@/hooks/use-constraint-logic';
import { FieldHostContext, FieldConstraintContext } from '@/contexts/field-constraint-context';
import { isElementRequired } from '@/hooks/is-element-required';
import { useGridThemeId, useOptionalFormEngine } from '@/hooks/use-form-context';

export interface FieldHostProps {
	className: string;
	'data-se-grid-theme': string;
	style: React.CSSProperties;
	[appearanceAttribute: `data-se-${string}`]: string;
}

/**
 * `data-se-<axis>` attributes for the element `FormElement` is rendering.
 *
 * @remarks
 * Spread onto the field's host element. `FieldGroupRoot` and {@link useFieldHost} already do; call it
 * for a host built by hand. Empty outside a `FormElement` or for an element with no appearance.
 */
export function useFieldAppearanceAttributes(): Record<string, string> {
	return getAppearanceAttributes(useContext(FieldHostContext)?.appearance);
}

/**
 * The authored `className` of the element `FormElement` is rendering, for its field host.
 *
 * @remarks `FieldGroupRoot` and {@link useFieldHost} already apply it. The host is the element that
 * carries the field's `style` and `data-se-*` attributes, in both renderers.
 */
export function useFieldClassName(): string | undefined {
	return useContext(FieldHostContext)?.className;
}

/**
 * Host attributes that put an element on the form grid.
 *
 * @remarks
 * Any element can sit on the grid, not only inputs. `useControlledFormElement`
 * folds this in for controlled fields; a content or decoration element that
 * renders its own container calls this directly and spreads the result:
 *
 * ```tsx
 * <div {...useFieldHost(config.grid, config.style)}>…</div>
 * ```
 *
 * Without it an element ignores its `grid` config entirely — placement and
 * `marginBlockStart`/`marginBlockEnd` alike — because the generated stylesheet
 * matches on `.se-form-field` scoped by the owning engine's theme id.
 */
export function useFieldHost(grid?: ElementGridConfig, style?: React.CSSProperties): FieldHostProps {
	const themeId = useGridThemeId();
	const appearance = useFieldAppearanceAttributes();
	const className = useFieldClassName();

	return {
		className: className ? `se-form-field ${className}` : 'se-form-field',
		'data-se-grid-theme': themeId,
		style: { ...getGridItemVariables(grid), ...style },
		...appearance,
	};
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
 * Field chrome and value binding for consumer-owned registry components.
 * Goes through the active FormAdapter — not a specific form library.
 *
 * @remarks
 * The field value is `any` because one hook serves every registry input: each
 * component binds `value` to its own control type (string, number, array), and
 * `unknown` would force a cast in every consumer.
 *
 * Under `FormElement`, `isRequired` comes from the constraints that element
 * already evaluated for this field path. A field rendered without one watches
 * only the paths its constraints name, so an unconstrained field does not
 * re-render when another field changes.
 */
export function useControlledFormElement(config: ElementConfig) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const engineContext = useOptionalFormEngine();
	const registry = useMemo(
		() => engineContext?.engine.getValidationRegistry() ?? createDefaultValidationRegistry(),
		[engineContext],
	);
	const rendered = useContext(FieldConstraintContext);
	const evaluated = rendered?.fieldPath === config.name ? rendered.constraints : undefined;
	const standalone = useConstraintLogic(
		config.name,
		evaluated ? undefined : config.constraints,
		!evaluated && isElementRequired(config, registry),
	);
	const { isRequired } = evaluated ?? standalone;
	const { value, error, onChange, onBlur, name, disabled, ref } = useFormField<any>(config);

	const fieldProps = mergeControlProps(
		{
			id: config.id,
			name,
			required: isRequired,
			disabled,
			readOnly: config.readonly,
			ref,
			'aria-invalid': Boolean(error),
			'aria-describedby': error ? `${config.id}-error` : undefined,
		},
		config.htmlAttributes,
	);

	const labelProps = {
		htmlFor: config.id,
	};

	const errorProps = error
		? {
				id: `${config.id}-error`,
				role: 'alert' as const,
			}
		: null;

	const containerStyles: React.CSSProperties = {
		...getGridItemVariables(config.grid),
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
		fieldState: {
			error: error ? { message: error } : undefined,
			invalid: Boolean(error),
		},
		config,
		combineHandlers,
	};
}

export type UseControlledFormElementReturn = ReturnType<typeof useControlledFormElement>;
