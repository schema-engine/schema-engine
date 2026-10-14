import { getElementChildren } from '@schema-engine/forms';

interface ArrayValueSource {
	initialValues?: unknown;
	elements: readonly object[];
	scalar?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasFieldName(element: object): element is object & { name: string } {
	return 'name' in element && typeof element.name === 'string' && element.name.length > 0;
}

function clonePlainValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(clonePlainValue);
	if (!isRecord(value)) return value;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return value;
	return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clonePlainValue(child)]));
}

function elementDefaultValue(element: object): unknown {
	if ('defaultValue' in element && element.defaultValue !== undefined) {
		return clonePlainValue(element.defaultValue);
	}

	const children = getElementChildren(element) as object[] | undefined;
	if (!children?.length) return '';

	if ('$type' in element && element.$type === 'arrayElements') {
		const rows: unknown[] = [];
		const minItems = 'minItems' in element && typeof element.minItems === 'number' ? element.minItems : 0;
		while (rows.length < minItems) {
			rows.push(
				createArrayItemDefaultValue({
					initialValues: 'initialValues' in element ? element.initialValues : undefined,
					elements: children,
				}),
			);
		}
		return rows;
	}

	return Object.fromEntries(children.filter(hasFieldName).map((child) => [child.name, elementDefaultValue(child)]));
}

export function createArrayItemDefaultValue({ initialValues, elements, scalar }: ArrayValueSource): unknown {
	if (isRecord(initialValues)) return structuredClone(initialValues);
	if (elements.length === 1 && !getElementChildren(elements[0])?.length) {
		const [element] = elements;
		const value = elementDefaultValue(element);
		if (scalar === true) return value;
		if (scalar === false) return hasFieldName(element) ? { [element.name]: value } : {};
		return isRecord(value) && hasFieldName(element) ? { [element.name]: value } : value;
	}

	return Object.fromEntries(
		elements.filter(hasFieldName).map((element) => [element.name, elementDefaultValue(element)]),
	);
}
