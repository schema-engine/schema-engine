import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import {
	type FieldScope,
	composeElementKey,
	composeFieldId,
	composeFieldName,
	type NormalizedElementConfig,
} from '@schema-engine/forms';
import { FormElement } from './field-renderer';

export interface FormElementsProps {
	elements: ReadonlyArray<NormalizedElementConfig>;
	className?: string;
	style?: Record<string, string | number | undefined>;
	namePrefix?: string;
	nameStrategy?: FieldScope['nameStrategy'];
	instanceId?: string;
}

export function FormElements({
	elements,
	className,
	style,
	namePrefix,
	nameStrategy,
	instanceId,
}: FormElementsProps): JsxRenderable {
	const scope: FieldScope = { namePrefix, nameStrategy, instanceId };

	return elements.map((element, index) =>
		jsx(FormElement, {
			key: composeElementKey(element, index, scope),
			config: element,
			name: composeFieldName(element, scope),
			id: composeFieldId(element, scope),
			instanceId,
			className,
			style,
		}),
	);
}
