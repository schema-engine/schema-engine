import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import type { NormalizedElementConfig, NormalizedFormConfig } from '@schema-engine/forms';

export interface ConstrainedElementMetadata {
	readonly fieldName: string;
	readonly id?: string;
	readonly constraints: ReadonlyArray<ConstraintLogic>;
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
				walk(element.elements as unknown as ReadonlyArray<NormalizedElementConfig>, fieldPath);
			}
		}
	}

	for (const step of config.steps) {
		walk(step.elements);
	}

	return result;
}

/**
 * Drops array indices from a rendered field path.
 *
 * @remarks
 * {@link collectConstrainedElements} walks the config, where array length is
 * unknown, so it records the authored template (`contacts.email`). The renderer
 * emits the composed path (`contacts.0.email`).
 */
function templatePath(path: string): string {
	return path
		.split('.')
		.filter((segment) => !/^\d+$/.test(segment))
		.join('.');
}

/**
 * Maps a rendered `data-se-constraint-field` value back to the element that declared it.
 *
 * @remarks
 * Matching the other way round — building selectors from the config — cannot
 * reach a field inside an array, because the config only knows the template path
 * while the DOM carries one composed path per row. An element with no `name`
 * falls back to its `id`, which is what the renderer writes for it.
 */
export function createConstraintLookup(
	config: NormalizedFormConfig | undefined,
): (renderedPath: string) => ConstrainedElementMetadata | undefined {
	const declarations = new Map<string, ConstrainedElementMetadata>();
	for (const item of collectConstrainedElements(config)) {
		declarations.set(item.fieldName, item);
		if (item.id) {
			declarations.set(item.id, item);
		}
	}

	return (renderedPath) => declarations.get(renderedPath) ?? declarations.get(templatePath(renderedPath));
}
