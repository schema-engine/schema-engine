import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import { applyFieldOverlay, getElementChildren, seedArrayRows, usesScalarArrayItem } from '@schema-engine/forms';
import { getElementContainerKind } from '@schema-engine/forms/lib/normalized-form-config';
import type { NormalizedElementConfig, FieldOverlay } from '@schema-engine/forms';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import { renderWithOwningFormEngine, renderWithConstraintValues } from '@/contexts/form-engine-owner';
import { ElementError } from './element-error';
import { isRenderedRequired } from '@/lib/field-rules';
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
): NormalizedElementConfig & {
	ssrInitialRows: readonly unknown[];
	initialFormValues: Record<string, unknown>;
} {
	const path = 'name' in config ? config.name : '';
	const formValues = values ?? initialValues ?? {};
	const configuredValues = getValueAtPath(formValues, path);
	const defaultValues = 'defaultValue' in config ? config.defaultValue : undefined;
	const rows = [configuredValues, defaultValues].find(Array.isArray);
	const children = (getElementChildren(config) ?? []) as object[];
	return {
		...config,
		ssrInitialRows: seedArrayRows(config, rows, usesScalarArrayItem(config, path, children, formValues)),
		initialFormValues: initialValues ?? {},
	};
}

function addFieldInitialValue(
	config: NormalizedElementConfig,
	initialValues: Record<string, unknown> | undefined,
	fieldPath: string | undefined,
): NormalizedElementConfig {
	if (!initialValues || !fieldPath) return config;
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
 * `disabled` and `required` compose with the values a container passed down,
 * so a fieldset's or array's own and constraint-driven state reaches the fields
 * inside it at render the way the constraint hosts compose it afterwards.
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
			required: isRenderedRequired(config) || isRequired,
		},
		overlays,
	);
	const renderConfig =
		getElementContainerKind(config) === 'array'
			? addArrayInitialValues(enhancedConfig, constraintContext?.values, constraintContext?.initialValues)
			: addFieldInitialValue(
					enhancedConfig,
					constraintContext?.initialValues,
					constraintContext?.fieldPath ?? ('name' in config ? config.name : undefined),
				);

	return renderWithConstraintValues(constraintContext?.values, () =>
		renderWithOwningFormEngine(engine, () => elementRegistration.render(renderConfig) as JsxRenderable),
	);
}
