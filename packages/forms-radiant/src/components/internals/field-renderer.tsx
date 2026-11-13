import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedElementConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { renderRegisteredElement } from './render-registered-element';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import type { ConstraintEvaluationContext } from './render-registered-element';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { ConstraintElement } from './constraint-element';
import { GRID_ITEM_CLASS } from '@schema-engine/layout';

export interface FormElementProps {
	/**
	 * Element from a normalized form or `engine.validateElement`.
	 * This host does not re-parse registration schemas.
	 */
	config: NormalizedElementConfig;
	engine?: FormEngine;
	name?: string;
	/** Path of the enclosing array row or object, which an element without a name resolves its sibling references in. */
	scopePath?: string;
	id?: string;
	instanceId?: string;
	initialValues?: Record<string, unknown>;
	values?: Record<string, unknown>;
	class?: string;
	constraintContext?: ConstraintEvaluationContext;
	style?: Record<string, string | number | undefined>;
}

export { renderRegisteredElement } from './render-registered-element';

export function FormElement({
	config,
	engine,
	name,
	scopePath,
	id,
	instanceId,
	initialValues,
	values,
	class: className,
	style,
	constraintContext,
}: FormElementProps): JsxRenderable {
	const resolvedEngine = resolveFormEngine(undefined, engine);
	if (!resolvedEngine) {
		throw new Error(`Cannot render form element '${config.$type}' without a FormEngine.`);
	}

	const constraints = 'constraints' in config ? config.constraints : undefined;
	const constraintValues = values ?? constraintContext?.values ?? initialValues ?? {};
	const fieldConstraintContext: ConstraintEvaluationContext = {
		values: constraintValues,
		initialValues: initialValues ?? constraintContext?.initialValues,
		fieldPath: name ?? constraintContext?.fieldPath,
	};
	if (!constraints?.length) {
		return renderRegisteredElement(
			config,
			resolvedEngine,
			{
				name,
				id,
				instanceId,
			},
			fieldConstraintContext,
		);
	}

	const baseRequired = isFieldRequired('rules' in config ? config.rules : undefined);
	const fieldPath =
		fieldConstraintContext.fieldPath ??
		('name' in config ? config.name : undefined) ??
		scopePath ??
		id ??
		('id' in config ? config.id : undefined) ??
		'';
	const snapshot = evaluateConstraints({
		constraints,
		baseRequired,
		fieldPath,
		values: constraintValues,
	});
	const { shouldShow } = snapshot;
	const fieldHost = mergeFieldGridHost(
		'grid' in config ? config.grid : undefined,
		style,
		resolvedEngine.getLayout().id,
	);

	return (
		<ConstraintElement
			classes={['se-form-field', GRID_ITEM_CLASS, 'se-form-constraint', className]}
			data-se-constraint-field={fieldPath}
			data-se-constraints={JSON.stringify(constraints)}
			data-se-base-required={baseRequired ? '' : undefined}
			data-se-theme={fieldHost.themeId}
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
				fieldConstraintContext,
				true,
				snapshot,
			)}
		</ConstraintElement>
	);
}
