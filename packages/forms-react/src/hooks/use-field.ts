import type React from 'react';
import { useContext, useMemo } from 'react';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import {
	GRID_ITEM_CLASS,
	getAppearanceAttributes,
	getGridItemVariables,
	type ElementGridConfig,
} from '@schema-engine/layout';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { useFormField } from '@/adapters/use-form-field';
import { useConstraintLogic } from '@/hooks/use-constraint-logic';
import { FieldHostContext, FieldConstraintContext } from '@/contexts/field-constraint-context';
import { isElementRequired } from '@/hooks/is-element-required';
import { useLayoutThemeId, useOptionalFormEngine } from '@/hooks/use-form-context';

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

export interface FieldHostProps {
	className: string;
	'data-se-theme': string;
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
 * matches on `.se-grid-item` scoped by the owning engine's theme id.
 */
export function useFieldHost(grid?: ElementGridConfig, style?: React.CSSProperties): FieldHostProps {
	const themeId = useLayoutThemeId();
	const appearance = useFieldAppearanceAttributes();
	const className = useFieldClassName();

	return {
		className: ['se-form-field', GRID_ITEM_CLASS, className].filter(Boolean).join(' '),
		'data-se-theme': themeId,
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
 * Binds the field to the form container the enclosing provider created.
 *
 * @remarks
 * The field `value` is `unknown`, as the container holds it: each component narrows it to its own control's
 * type (a string, a number, a list).
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
		() => engineContext?.engine.getValidationRegistry() ?? getFallbackValidationRegistry(),
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
	const { value, error, warning, invalid, onChange, onBlur, name, disabled, ref } = useFormField(config);

	const fieldProps = mergeControlProps(
		{
			id: config.id,
			name,
			required: isRequired,
			disabled,
			readOnly: config.readonly,
			ref,
			'aria-invalid': invalid,
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
		warning,
		invalid,
		isRequired,
		onChange,
		onBlur,
		fieldProps,
		labelProps,
		errorProps,
		containerStyles,
		fieldState: {
			error: error ? { message: error } : undefined,
			invalid,
		},
		config,
		combineHandlers,
	};
}

export type UseControlledFormElementReturn = ReturnType<typeof useControlledFormElement>;
