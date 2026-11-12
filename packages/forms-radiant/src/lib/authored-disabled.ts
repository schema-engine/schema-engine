import { walkNamedElements } from '@schema-engine/forms/lib/field-scope';
import { templatePath } from '@schema-engine/forms/lib/path-values';
import type { NormalizedFormConfig } from '@schema-engine/forms';

/**
 * Whether a rendered field is authored `disabled`, itself or through a containing element.
 *
 * @remarks
 * A constrained field needs the authored state on its own: its live `disabled`
 * already includes what a constraint applied at render, so it could not be
 * lifted again. A disabled fieldset or array counts for every field inside it,
 * as render passes its `disabled` down to them.
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
