import { containerKindOf } from '@/lib/container-kind-of';
import { getElementChildren } from '@/lib/element-children';
import { getElementName } from '@/lib/field-scope';
import { resolveFieldRef } from '@/lib/field-ref';
import { issueAt, type FormValidationIssue } from './issues';
import type { ValidateFormOptions } from './options';

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

interface CheckedStep {
	readonly id: string;
	readonly elements: readonly object[];
	readonly constraints?: ReadonlyArray<{ readonly field: string }>;
}

/**
 * The paths of the named fields outside array rows: what a step constraint may read.
 *
 * @remarks An array itself is such a field, since its value is read as a whole; what is inside its rows is not.
 */
function readablePaths(
	elements: readonly object[],
	getElement: ValidateFormOptions['getElement'],
	base = '',
): string[] {
	return elements.flatMap((element) => {
		const name = getElementName(element);
		if (!name) return [];
		const path = base ? `${base}.${name}` : name;
		const children = getElementChildren(element);
		const kind =
			'$type' in element && typeof element.$type === 'string'
				? containerKindOf(getElement(element.$type))
				: undefined;
		return kind === 'array' || !children
			? [path]
			: [path, ...readablePaths(children.filter(isObject), getElement, path)];
	});
}

/**
 * The problems of a form's step structure: duplicate ids, and constraints that are not on a step that can be skipped.
 *
 * @remarks
 * A step constraint may read only non-row fields of earlier steps, so the first step has none, the start
 * is deterministic, at least one step is active and the constraints cannot form a cycle.
 */
export function stepStructureIssues(
	steps: readonly CheckedStep[],
	getElement: ValidateFormOptions['getElement'],
): FormValidationIssue[] {
	const issues: FormValidationIssue[] = [];
	const seen = new Set<string>();
	const earlier = new Set<string>();
	steps.forEach((step, index) => {
		if (seen.has(step.id)) {
			issues.push(
				issueAt(['steps', index, 'id'], `Step id '${step.id}' is a duplicate: step ids must be unique.`),
			);
		}
		seen.add(step.id);
		if (index === 0 && step.constraints?.length) {
			issues.push(
				issueAt(['steps', 0, 'constraints'], 'The first step cannot have constraints: it is always active.'),
			);
		} else {
			step.constraints?.forEach((constraint, at) => {
				const path = resolveFieldRef(constraint.field);
				if (!earlier.has(path)) {
					issues.push(
						issueAt(
							['steps', index, 'constraints', at, 'field'],
							`Step '${step.id}' reads '${constraint.field}', which is not a field of an earlier step outside an array row: a step constraint may read only those.`,
						),
					);
				}
			});
		}
		for (const path of readablePaths(step.elements, getElement)) earlier.add(path);
	});
	return issues;
}
