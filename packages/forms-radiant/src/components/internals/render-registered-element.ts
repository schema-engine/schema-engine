import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { applyFieldOverlay } from '@schema-engine/forms';
import type { NormalizedElementConfig, FieldOverlay } from '@schema-engine/forms';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import { renderWithOwningFormEngine, renderWithConstraintValues } from '@/contexts/form-engine-owner';
import { ElementError } from './element-error';

/** Live values the constraint snapshot is evaluated against. */
export interface ConstraintEvaluationContext {
	values?: Record<string, unknown>;
	fieldPath?: string;
}

/**
 * Renders a registered element. Config must already be normalized
 * (from a form or `engine.validateElement`). Field path overlays are
 * render-time only — the frozen config is not cloned.
 *
 */
export function renderRegisteredElement(
	config: NormalizedElementConfig,
	engine: CoreFormEngine,
	overlays?: FieldOverlay,
	constraintContext?: ConstraintEvaluationContext,
	renderWhenHidden = false,
	snapshot?: ReturnType<typeof evaluateConstraints>,
): JsxRenderable {
	const { shouldShow, shouldDisable, isRequired } =
		snapshot ??
		evaluateConstraints({
			constraints: 'constraints' in config ? config.constraints : undefined,
			baseRequired: isFieldRequired('rules' in config ? config.rules : undefined),
			fieldPath: constraintContext?.fieldPath ?? ('name' in config ? config.name : undefined),
			values: constraintContext?.values ?? {},
		});

	if (!shouldShow && !renderWhenHidden) {
		return null;
	}

	const { $type } = config;
	const elementRegistration = engine.getElement($type);

	if (!elementRegistration) {
		return jsx(ElementError, {
			title: 'Component not found',
			message: `The component type "${$type}" is not registered in the form engine.`,
			componentType: $type,
		});
	}

	const enhancedConfig = applyFieldOverlay(
		{
			...config,
			disabled: ('disabled' in config ? config.disabled : false) || shouldDisable,
			required: isRequired,
		},
		overlays,
	);

	return renderWithConstraintValues(constraintContext?.values, () =>
		renderWithOwningFormEngine(engine, () => elementRegistration.render(enhancedConfig) as JsxRenderable),
	);
}
