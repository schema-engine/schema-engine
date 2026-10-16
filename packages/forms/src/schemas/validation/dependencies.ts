import type { BaseValidationRule } from './types.js';
import type { ValidationRegistry } from './validation-registry.js';
import { getValidationRulesForElement } from './utils.js';
import { walkNamedElements } from '@/lib/field-scope.js';
import { resolveFieldRef } from '@/lib/field-ref.js';
import { expandFieldTemplatePaths } from '@/lib/path-values.js';

const NO_DEPENDENTS: readonly string[] = [];

/**
 * Which fields a renderer must re-validate when a value changes.
 *
 * @remarks
 * Built over *rendered* paths, so `lines.0.max` depends on `lines.0.quantity`
 * and not on every row's quantity.
 */
export interface DependencyIndex {
	/** Field paths whose validation must re-run when `path` changes. */
	dependentsOf(path: string): readonly string[];
	/** Union of {@link DependencyIndex.dependentsOf} across several changed paths. */
	expand(changed: readonly string[]): string[];
	/** Every path something depends on — the set worth diffing. */
	readonly watched: readonly string[];
}

/**
 * Absolute paths whose change should re-validate the field at `fieldPath`.
 *
 * @remarks
 * A rule declares what it reads through its registration's `dependsOn`; the
 * references come back as authored, so they are resolved against the declaring
 * field exactly as the rule itself resolves them at validation time.
 */
function collectRuleDependencies(
	rules: ReadonlyArray<BaseValidationRule> | undefined,
	fieldPath: string,
	registry: ValidationRegistry,
): string[] {
	const references = (rules ?? []).flatMap((rule) => registry.getRuleDependencies(rule));
	return [...new Set(references.map((reference) => resolveFieldRef(reference, fieldPath)))];
}

/**
 * Inverts each field's declared rule and require-constraint dependencies into a change-to-dependents map.
 *
 * @remarks
 * Only direct dependents, deliberately: if `c` depends on `b` and `b` on `a`,
 * changing `a` re-validates `b` and not `c`. Transitive expansion invites cycles
 * and no assertion needs it, because every one of them reads values rather than
 * another field's validity. A rule that depends on validity would have to
 * revisit this.
 *
 * Rebuilt from the current values rather than cached: the index depends on the
 * config and on how many array rows exist, and a stale one after a row is added
 * or removed is worse than the walk it saves. Both walks are over the config,
 * not over user input.
 */
export function buildDependencyIndex(
	elements: readonly object[],
	values: Record<string, unknown>,
	registry: ValidationRegistry,
): DependencyIndex {
	const dependents = new Map<string, string[]>();

	for (const { path: templatePath, element } of walkNamedElements(elements)) {
		const rules = getValidationRulesForElement(element, registry);
		const constraints = 'constraints' in element && Array.isArray(element.constraints) ? element.constraints : [];
		const requiredReferences = constraints.flatMap((constraint: unknown) =>
			typeof constraint === 'object' &&
			constraint !== null &&
			'action' in constraint &&
			constraint.action === 'require' &&
			'field' in constraint &&
			typeof constraint.field === 'string'
				? [constraint.field]
				: [],
		);
		for (const fieldPath of expandFieldTemplatePaths(values, templatePath)) {
			const dependencies = [
				...collectRuleDependencies(rules, fieldPath, registry),
				...requiredReferences.map((reference) => resolveFieldRef(reference, fieldPath)),
			];
			for (const dependency of dependencies) {
				const existing = dependents.get(dependency);
				if (!existing) {
					dependents.set(dependency, [fieldPath]);
				} else if (!existing.includes(fieldPath)) {
					existing.push(fieldPath);
				}
			}
		}
	}

	return {
		watched: [...dependents.keys()],
		dependentsOf: (path) => dependents.get(path) ?? NO_DEPENDENTS,
		expand: (changed) => [...new Set(changed.flatMap((path) => dependents.get(path) ?? NO_DEPENDENTS))],
	};
}

/**
 * Whether a dependent field's re-validation should be allowed to show an error.
 *
 * @remarks
 * Typing a password must not light up a confirmation the user has not reached.
 * Both renderers ask this one function rather than deciding locally, which is
 * the mistake the constraint subsystem made once and paid for twice.
 */
export function shouldSurfaceDependentError(field: { touched: boolean; submitted: boolean }): boolean {
	return field.touched || field.submitted;
}
