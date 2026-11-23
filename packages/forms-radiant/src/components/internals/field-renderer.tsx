import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import {
	type NormalizedElementConfig,
	type FormEngineRuntime as FormEngine,
	isFieldRequired,
} from '@schema-engine/forms';
import { renderRegisteredElement } from './render-registered-element';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { peekOwningParticipation } from '@/contexts/form-engine-owner';
import { constraintsFromParticipation, standaloneConstraints } from '@/lib/participation-snapshot';
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
		rowIds: constraintContext?.rowIds,
		participation: constraintContext?.participation,
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
	const ownName = 'name' in config && config.name ? config.name : undefined;
	const ownId = 'id' in config ? config.id : undefined;
	const enclosing = fieldConstraintContext.fieldPath ?? scopePath;
	const fieldPath = name ?? ownName ?? (ownId ? (enclosing ? `${enclosing}.${ownId}` : ownId) : (enclosing ?? ''));
	const participation = constraintContext?.participation ?? peekOwningParticipation();
	const snapshot = participation
		? constraintsFromParticipation(participation, fieldPath, baseRequired)
		: standaloneConstraints(config, fieldPath, constraintValues, baseRequired);
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
