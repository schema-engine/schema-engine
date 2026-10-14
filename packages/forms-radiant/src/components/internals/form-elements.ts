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

export interface FormElementsProps {
	elements: ReadonlyArray<NormalizedElementConfig>;
	engine?: FormEngine;
	className?: string;
	style?: Record<string, string | number | undefined>;
	initialValues?: Record<string, unknown>;
	values?: Record<string, unknown>;
	namePrefix?: string;
	nameStrategy?: FieldScope['nameStrategy'];
	instanceId?: string;
}

export function FormElements({
	elements,
	engine,
	className,
	style,
	initialValues,
	values,
	namePrefix,
	nameStrategy,
	instanceId,
}: FormElementsProps): JsxRenderable {
	const scope: FieldScope = { namePrefix, nameStrategy, instanceId };

	return elements.map((element, index) =>
		jsx(FormElement, {
			key: composeElementKey(element, index, scope),
			config: element,
			engine,
			name: composeFieldName(element, scope),
			id: composeFieldId(element, scope),
			instanceId,
			initialValues,
			values,
			className,
			style,
		}),
	);
}
