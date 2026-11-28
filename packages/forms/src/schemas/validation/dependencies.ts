import type { BaseValidationRule } from './types.js';
import type { ValidationRegistry } from './validation-registry.js';
import { getValidationRulesForElement } from './utils.js';
import { walkNamedElements } from '../../lib/field-scope.js';
import { resolveFieldRef } from '../../lib/field-ref.js';
import { expandFieldTemplatePaths } from '../../lib/path-values.js';

const NO_DEPENDENTS: readonly string[] = [];
const NO_REFERENCES: readonly string[] = [];

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
	/**
	 * What the field at `path` reads, as its rules and constraints wrote it.
	 *
	 * @remarks
	 * References come back as authored, because what they mean depends on where the field is: a bare name
	 * is a sibling of the field and a dotted one is a position. Resolve them with `resolveFieldRef` against
	 * the field's path as it is when the question is asked.
	 */
	referencesOf(path: string): readonly string[];
}

/**
 * The references a field's rules read, as authored.
 *
 * @remarks
 * A rule declares what it reads through its registration's `dependsOn`; the references come back as
 * authored, so they are resolved against the declaring field exactly as the rule itself resolves them at
 * validation time.
 */
function ruleReferences(rules: ReadonlyArray<BaseValidationRule> | undefined, registry: ValidationRegistry): string[] {
	return (rules ?? []).flatMap((rule) => registry.getRuleDependencies(rule));
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
 * Not cached here: the index depends on the config and on how many array rows
 * exist, so a caller that keeps one must rebuild it when a row is added or
 * removed.
 */
export function buildDependencyIndex(
	elements: readonly object[],
	values: Record<string, unknown>,
	registry: ValidationRegistry,
): DependencyIndex {
	const dependents = new Map<string, string[]>();
	const authored = new Map<string, readonly string[]>();

	for (const { path: templatePath, element } of walkNamedElements(elements)) {
		const rules = getValidationRulesForElement(element, registry);
		const constraints = 'constraints' in element && Array.isArray(element.constraints) ? element.constraints : [];
		const requiredReferences = constraints.flatMap((constraint: unknown) =>
			typeof constraint === 'object' &&
			constraint !== null &&
			'$type' in constraint &&
			constraint.$type === 'require' &&
			'field' in constraint &&
			typeof constraint.field === 'string'
				? [constraint.field]
				: [],
		);
		for (const fieldPath of expandFieldTemplatePaths(values, templatePath)) {
			const references = [...new Set([...ruleReferences(rules, registry), ...requiredReferences])];
			authored.set(fieldPath, references);
			for (const dependency of new Set(references.map((reference) => resolveFieldRef(reference, fieldPath)))) {
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
		referencesOf: (path) => authored.get(path) ?? NO_REFERENCES,
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
