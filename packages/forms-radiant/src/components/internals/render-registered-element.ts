import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { applyFieldOverlay } from '@schema-engine/forms';
import type { NormalizedElementConfig, FieldOverlay } from '@schema-engine/forms';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';
import { ElementError } from './element-error';
import { getValueAtPath } from '@schema-engine/forms/lib/path-values';

/** Live values the constraint snapshot is evaluated against. */
export interface ConstraintEvaluationContext {
	values?: Record<string, unknown>;
	initialValues?: Record<string, unknown>;
	fieldPath?: string;
}

function addArrayInitialValues(
	config: NormalizedElementConfig,
	values: Record<string, unknown> | undefined,
	initialValues: Record<string, unknown> | undefined,
):
	| NormalizedElementConfig
	| (NormalizedElementConfig & {
			ssrInitialRows: readonly unknown[];
			initialFormValues: Record<string, unknown>;
	  }) {
	if (config.$type !== 'arrayElements') return config;
	const path = 'name' in config ? config.name : '';
	const configuredValues = getValueAtPath(values ?? initialValues ?? {}, path);
	const defaultValues = 'defaultValue' in config ? config.defaultValue : undefined;
	const rows = Array.isArray(configuredValues) ? configuredValues : Array.isArray(defaultValues) ? defaultValues : [];
	const minItems = 'minItems' in config && typeof config.minItems === 'number' ? config.minItems : 0;
	const count = Math.max(rows.length, minItems);
	return {
		...config,
		ssrInitialRows: Array.from({ length: count }, (_, index) => rows[index]),
		initialFormValues: initialValues ?? {},
	};
}

function addFieldInitialValue(
	config: NormalizedElementConfig,
	initialValues: Record<string, unknown> | undefined,
	fieldPath: string | undefined,
): NormalizedElementConfig {
	if (config.$type === 'arrayElements' || !initialValues || !fieldPath) return config;
	const value = getValueAtPath(initialValues, fieldPath);
	if (value === undefined) return config;
	return { ...config, defaultValue: value } as NormalizedElementConfig;
}

/**
 * Renders a registered element. Config must already be normalized
 * (from a form or `engine.validateElement`). Field path overlays are
 * render-time only — the frozen config is not cloned.
 *
 * @remarks
 * Constraints evaluate against the `values` in `constraintContext` when the
 * caller has a live form store; without one (plain SSR authoring) they fall
 * back to an empty snapshot, which is the correct initial state for `show`
 * constraints.
 */
export function renderRegisteredElement(
	config: NormalizedElementConfig,
	engine: CoreFormEngine,
	overlays?: FieldOverlay,
	constraintContext?: ConstraintEvaluationContext,
	renderWhenHidden = false,
): JsxRenderable {
	const { shouldShow, shouldDisable, isRequired } = evaluateConstraintLogic(
		'constraints' in config ? config.constraints : undefined,
		isFieldRequired('rules' in config ? config.rules : undefined),
		constraintContext?.fieldPath ?? ('name' in config ? config.name : undefined),
		constraintContext?.values ?? {},
	);

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
	const withInitialValue = addFieldInitialValue(
		enhancedConfig,
		constraintContext?.initialValues,
		constraintContext?.fieldPath ?? ('name' in config ? config.name : undefined),
	);
	const renderConfig = addArrayInitialValues(
		withInitialValue,
		constraintContext?.values,
		constraintContext?.initialValues,
	);

	return renderWithOwningFormEngine(engine, () => elementRegistration.render(renderConfig) as JsxRenderable);
}
