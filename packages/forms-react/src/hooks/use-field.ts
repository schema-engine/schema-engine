import type React from 'react';
import { isFieldRequired, type ElementConfig, type ElementGridConfig } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { getFieldGridVariables } from '@schema-engine/forms/lib/grid-styles';
import { useFormField } from '@/adapters/context';
import { useGridThemeId } from '@/hooks/use-form-context';

export interface FieldHostProps {
	className: string;
	'data-se-grid-theme': string;
	style: React.CSSProperties;
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

	return {
		className: 'se-form-field',
		'data-se-grid-theme': themeId,
		style: { ...getFieldGridVariables(grid), ...style },
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
 */
export function useControlledFormElement(config: ElementConfig) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const isRequired = isFieldRequired(config.rules);
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
		...getFieldGridVariables(config.grid),
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
