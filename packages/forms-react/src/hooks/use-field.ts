import type React from 'react';
import { useContext } from 'react';
import {
	GRID_ITEM_CLASS,
	getAppearanceAttributes,
	getGridItemVariables,
	type ElementGridConfig,
} from '@schema-engine/layout';
import { FieldHostContext } from '@/contexts/field-constraint-context';
import { useLayoutThemeId } from '@/hooks/use-form-context';

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
 * Any element can sit on the grid, not only inputs. `useFormField`
 * returns the grid variables as `containerStyles` for fields bound to a config; a content or decoration element that
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
