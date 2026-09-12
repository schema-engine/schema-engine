import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { NormalizedElementConfig } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { renderRegisteredElement } from './render-registered-element';
import { getActiveFormEngine } from '@/registries/active-engine';
import { evaluateConstraintLogic } from '@/hooks/constraint-logic';
import { getFieldGridStyles } from '@/hooks/grid-styles';

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
	className,
	style,
}: FormElementProps): JsxRenderable {
	const resolvedEngine = engine ?? getActiveFormEngine();
	if (!resolvedEngine) {
		throw new Error(`Cannot render form element '${config.$type}' without a FormEngine.`);
	}

	const constraints = 'constraints' in config ? config.constraints : undefined;
	if (!constraints?.length) {
		return renderRegisteredElement(config, resolvedEngine, {
			name,
			id,
			instanceId,
		});
	}

	const { shouldShow } = evaluateConstraintLogic(
		constraints,
		isFieldRequired('rules' in config ? config.rules : undefined),
		name ?? ('name' in config ? config.name : undefined),
	);
	const fieldName =
		name ?? ('name' in config ? config.name : undefined) ?? id ?? ('id' in config ? config.id : undefined) ?? '';
	const fieldGridStyles = getFieldGridStyles('grid' in config ? config.grid : undefined);

	return (
		<div
			class={`se-form-constraint ${className ?? ''}`.trim()}
			data-se-constraint-field={fieldName}
			style={{ ...fieldGridStyles, ...style }}
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
				undefined,
				true,
			)}
		</div>
	);
}
