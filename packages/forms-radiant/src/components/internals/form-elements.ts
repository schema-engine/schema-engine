import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import {
	type FieldScope,
	composeElementKey,
	composeFieldId,
	composeFieldName,
	type NormalizedElementConfig,
} from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormElement } from './field-renderer';
import { peekOwningConstraintValues } from '@/contexts/form-engine-owner';
import type { ConstraintEvaluationContext } from './render-registered-element';

export interface FormElementsProps {
	elements: ReadonlyArray<NormalizedElementConfig>;
	engine?: FormEngine;
	class?: string;
	style?: Record<string, string | number | undefined>;
	initialValues?: Record<string, unknown>;
	values?: Record<string, unknown>;
	namePrefix?: string;
	nameStrategy?: FieldScope['nameStrategy'];
	instanceId?: string;
	constraintContext?: ConstraintEvaluationContext;
}

export function FormElements({
	elements,
	engine,
	class: className,
	style,
	initialValues,
	values,
	namePrefix,
	nameStrategy,
	instanceId,
	constraintContext,
}: FormElementsProps): JsxRenderable {
	const scope: FieldScope = { namePrefix, nameStrategy, instanceId };

	return elements.map((element, index) =>
		jsx(FormElement, {
			key: composeElementKey(element, index, scope),
			config: element,
			constraintContext: constraintContext ?? { values: peekOwningConstraintValues() },
			engine,
			name: composeFieldName(element, scope),
			scopePath: namePrefix,
			id: composeFieldId(element, scope),
			instanceId,
			initialValues,
			values,
			class: className,
			style,
		}),
	);
}
