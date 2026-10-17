import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { walkNamedElements } from '@schema-engine/forms/lib/field-scope';
import { templatePath } from '@schema-engine/forms/lib/path-values';
import type { NormalizedFormConfig } from '@schema-engine/forms';

export interface ConstrainedElementMetadata {
	readonly fieldName: string;
	readonly id?: string;
	readonly constraints: ReadonlyArray<ConstraintLogic>;
	readonly isRequired: boolean;
	readonly disabled: boolean;
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

	for (const step of config.steps) {
		for (const { path, element } of walkNamedElements(step.elements, '', true)) {
			if ('constraints' in element && element.constraints?.length) {
				result.push({
					fieldName: path,
					id: 'id' in element ? element.id : undefined,
					constraints: element.constraints,
					disabled: 'disabled' in element && element.disabled === true,
					isRequired: isFieldRequired('rules' in element ? element.rules : undefined),
				});
			}
		}
	}

	return result;
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

/**
 * Whether a rendered field is authored `disabled`, itself or through a containing element.
 *
 * @remarks
 * Constraint sync needs the authored state on its own: the field's live
 * `disabled` already includes what a constraint applied at render. A disabled
 * fieldset or array counts for every field inside it, as render passes its
 * `disabled` down to them.
 */
export function createAuthoredDisabledLookup(
	config: NormalizedFormConfig | undefined,
): (renderedPath: string) => boolean {
	const disabled = new Set<string>();
	for (const step of config?.steps ?? []) {
		for (const { path, element } of walkNamedElements(step.elements, '', true)) {
			if ('disabled' in element && element.disabled === true) {
				disabled.add(path);
			}
		}
	}

	return (renderedPath) => {
		const segments = templatePath(renderedPath).split('.');
		return segments.some((_, index) => disabled.has(segments.slice(0, index + 1).join('.')));
	};
}
