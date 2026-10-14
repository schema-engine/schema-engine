import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedElementConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { renderRegisteredElement } from './render-registered-element';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { mergeFieldGridHost } from '@/hooks/grid-styles';

export interface FormElementProps {
	/**
	 * Element from a normalized form or `engine.validateElement`.
	 * This host does not re-parse registration schemas.
	 */
	config: NormalizedElementConfig;
	engine?: FormEngine;
	name?: string;
	id?: string;
	instanceId?: string;
	initialValues?: Record<string, unknown>;
	values?: Record<string, unknown>;
	className?: string;
	style?: Record<string, string | number | undefined>;
}

export { renderRegisteredElement } from './render-registered-element';

export function FormElement({
	config,
	engine,
	name,
	id,
	instanceId,
	initialValues,
	values,
	className,
	style,
}: FormElementProps): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	if (!resolvedEngine) {
		throw new Error(`Cannot render form element '${config.$type}' without a FormEngine.`);
	}

	const constraints = 'constraints' in config ? config.constraints : undefined;
	if (!constraints?.length) {
		return renderRegisteredElement(
			config,
			resolvedEngine,
			{
				name,
				id,
				instanceId,
			},
			{ values: values ?? initialValues, initialValues, fieldPath: name },
		);
	}

	const { shouldShow } = evaluateConstraintLogic(
		constraints,
		isFieldRequired('rules' in config ? config.rules : undefined),
		name ?? ('name' in config ? config.name : undefined),
		values ?? initialValues ?? {},
	);
	const fieldName =
		name ?? ('name' in config ? config.name : undefined) ?? id ?? ('id' in config ? config.id : undefined) ?? '';
	const fieldHost = mergeFieldGridHost(
		'grid' in config ? config.grid : undefined,
		style,
		resolvedEngine.getGridTheme().id,
	);

	return (
		<div
			classes={['se-form-field', 'se-form-constraint', className]}
			data-se-constraint-field={fieldName}
			data-se-grid-theme={fieldHost.themeId}
			style={fieldHost.style}
			hidden={!shouldShow}
		>
			{renderRegisteredElement(
				config,
				resolvedEngine,
				{
					name,
					id,
					instanceId,
				},
				{ values: values ?? initialValues, initialValues, fieldPath: name },
				true,
			)}
		</div>
	);
}
