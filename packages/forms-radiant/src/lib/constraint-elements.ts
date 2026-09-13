import type { NormalizedElementConfig, NormalizedFormConfig } from '@schema-engine/forms';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';

export interface ConstrainedElementMetadata {
	readonly fieldName: string;
	readonly id?: string;
	readonly constraints: ReadonlyArray<NonNullable<FormEngine.ElementConfig['constraints']>[number]>;
	readonly isRequired: boolean;
}

/**
 * Traverses a normalized form configuration and extracts metadata for all
 * elements that declare constraints.
 */
export function collectConstrainedElements(config: NormalizedFormConfig | undefined): ConstrainedElementMetadata[] {
	if (!config?.steps) {
		return [];
	}

	const result: ConstrainedElementMetadata[] = [];

	function walk(elements: ReadonlyArray<NormalizedElementConfig>, basePath = ''): void {
		for (const element of elements) {
			const name = 'name' in element && typeof element.name === 'string' ? element.name : undefined;
			const id = 'id' in element && typeof element.id === 'string' ? element.id : undefined;
			const localName = name ?? id ?? '';
			const fieldPath = basePath && localName ? `${basePath}.${localName}` : localName || basePath;

			if ('constraints' in element && Array.isArray(element.constraints) && element.constraints.length > 0) {
				result.push({
					fieldName: fieldPath,
					id,
					constraints: element.constraints,
					isRequired: isFieldRequired('rules' in element ? element.rules : undefined),
				});
			}

			if ('elements' in element && Array.isArray(element.elements)) {
				walk(element.elements as ReadonlyArray<NormalizedElementConfig>, fieldPath);
			}
		}
	}

	for (const step of config.steps) {
		walk(step.elements);
	}

	return result;
}
