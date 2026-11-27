import type { FormTaggedConfig } from '@/schemas/form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { safeParseNode, type NodeLookup } from '@schema-engine/registry';
import { markNormalizedElementConfig, type NormalizedElementConfig } from '@/lib/normalized-form-config';
import { getElementChildren, withElementChildren } from '@/lib/element-children';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';
import { areaPlacementIssue, namedPlacementIssue, spanIssue, subgridIssue } from './grid-checks';
import { childPath, isTaggedConfig, issueAt, type FormValidationIssue, type Path } from './issues';
import type { ElementRegistration, ValidateFormOptions } from './options';
import { fromSchemaIssues } from './schema-issues';
import { containerKindOf } from '@/lib/container-kind-of';
import { ENGINE_KEY_PREFIX, isReservedPathKey } from '@/lib/reserved-path-keys';

/** Finds an element by `$type` for `safeParseNode`, and says where to register one nothing answers. */
function elementLookup(getElement: ValidateFormOptions['getElement']): NodeLookup<ElementRegistration> {
	return { get: getElement, hint: 'Register it with createFormEngine({ elements: [...] }).' };
}

/**
 * Holds each rule of an element to its registration, and replaces it with the rule as the registration parses it.
 *
 * @remarks
 * The element's own schema accepts a rule of any `$type`, so this is where a rule is held to the
 * registry. Every rule is checked, so a form with two bad rules reports both. An issue keeps the path
 * the registry gave it, laid under the rule: a refused option is at its key, a type nothing registers or
 * a handler that throws is at the rule's `$type`.
 */
function checkElementRules(
	item: FormTaggedConfig,
	checkRule: ValidateFormOptions['checkRule'],
	path: Path,
): { issues: FormValidationIssue[]; item: FormTaggedConfig } {
	if (!Array.isArray(item.rules)) return { issues: [], item };

	const issues: FormValidationIssue[] = [];
	const rules: unknown[] = [];
	for (const [index, rule] of item.rules.entries()) {
		if (typeof rule !== 'object' || rule === null || !('$type' in rule) || typeof rule.$type !== 'string') {
			rules.push(rule);
			continue;
		}
		const checked = checkRule(rule as { $type: string });
		if (checked.ok) {
			rules.push(checked.rule);
			continue;
		}
		for (const issue of checked.issues) {
			issues.push({ ...issue, path: [...path, 'rules', index, ...issue.path] });
		}
	}
	return { issues, item: { ...item, rules } };
}

/** The first segment of an element's name that the engine reserves. */
function reservedNameSegment(item: FormTaggedConfig): string | undefined {
	return typeof item.name === 'string' ? item.name.split('.').find(isReservedPathKey) : undefined;
}

/** What {@link parseElementNode} returns: the element, or the issues found, never neither. */
type ParsedElement = { issues: FormValidationIssue[]; item?: undefined } | { issues: []; item: FormTaggedConfig };

export function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	checkRule: ValidateFormOptions['checkRule'],
	path: Path,
	appearance: AppearanceScope,
	nested = false,
): ParsedElement {
	const fail = (message: string, relative: Path = []) => ({ issues: [issueAt([...path, ...relative], message)] });

	const tagged = isTaggedConfig(item) ? item : undefined;
	const reserved = tagged && reservedNameSegment(tagged);
	if (tagged && reserved) {
		return fail(
			`Field name '${String(tagged.name)}' uses the reserved segment '${reserved}': a name cannot start with '${ENGINE_KEY_PREFIX}' or be one of __proto__, constructor and prototype.`,
			['name'],
		);
	}
	let authoredAppearance: unknown;
	let node: unknown = item;
	if (tagged) {
		const { appearance: taggedAppearance, ...withoutAppearance } = tagged;
		authoredAppearance = taggedAppearance;
		node = withoutAppearance;
	}
	const parsed = safeParseNode(elementLookup(getElement), node, path);
	if (!parsed.success) {
		return { issues: fromSchemaIssues(parsed.issues, []) };
	}
	if (!isTaggedConfig(parsed.data)) {
		return fail(
			`Invalid element configuration for '${parsed.registration.$type}': parsed output is missing $type.`,
			['$type'],
		);
	}
	const checkedRules = checkElementRules(parsed.data, checkRule, path);
	if (checkedRules.issues.length > 0) return { issues: checkedRules.issues };
	const config = checkedRules.item;
	const parsedReserved = reservedNameSegment(config);
	if (parsedReserved) {
		return fail(
			`Field name '${String(config.name)}' uses the reserved segment '${parsedReserved}': a name cannot start with '${ENGINE_KEY_PREFIX}' or be one of __proto__, constructor and prototype.`,
			['name'],
		);
	}
	const placementIssue = namedPlacementIssue(config);
	if (placementIssue) return fail(placementIssue.message, placementIssue.path);
	const areaIssue = areaPlacementIssue(config, nested);
	if (areaIssue) return fail(areaIssue.message, areaIssue.path);
	const span = spanIssue(config);
	if (span) return fail(span.message, span.path);
	const subgrid = subgridIssue(config, containerKindOf(parsed.registration));
	if (subgrid) return fail(subgrid.message, subgrid.path);

	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${config.$type}'`,
		path,
		supported: parsed.registration.appearanceAxes ?? [],
	});
	const issues = elementAppearance.issues;
	const resolved = withAppearance(config, elementAppearance.selection);

	const children = getElementChildren(config);
	if (!children) {
		return issues.length > 0 ? { issues } : { issues: [], item: resolved };
	}

	const nextChildren: FormTaggedConfig[] = [];
	const childScope = elementAppearance.childScope;
	for (let index = 0; index < children.length; index += 1) {
		const parsedChild = parseElementNode(
			children[index],
			getElement,
			checkRule,
			childPath(path, index),
			childScope,
			true,
		);
		issues.push(...parsedChild.issues);
		if (parsedChild.item) nextChildren.push(parsedChild.item);
	}

	if (issues.length > 0) {
		return { issues };
	}

	return { issues: [], item: withElementChildren(resolved, nextChildren) };
}

/**
 * Validates the elements of a step. `byIndex` keeps each element at the index it was authored at
 * (`undefined` where it failed), so later checks name the right path.
 */
export function parseElementList(
	items: unknown[] | undefined,
	getElement: ValidateFormOptions['getElement'],
	checkRule: ValidateFormOptions['checkRule'],
	parentPath: Path,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; items?: FormTaggedConfig[]; byIndex: Array<FormTaggedConfig | undefined> } {
	if (!items) return { issues: [], byIndex: [] };

	const next: FormTaggedConfig[] = [];
	const byIndex: Array<FormTaggedConfig | undefined> = [];
	const issues: FormValidationIssue[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const parsed = parseElementNode(items[index], getElement, checkRule, childPath(parentPath, index), appearance);
		issues.push(...parsed.issues);
		byIndex.push(parsed.item);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next, byIndex };
}

export function brandElementTree(
	config: FormTaggedConfig,
	getElement: ValidateFormOptions['getElement'],
): NormalizedElementConfig {
	const children = getElementChildren(config);
	const next = children
		? withElementChildren(
				config,
				children.map((child) => brandElementTree(child as FormTaggedConfig, getElement)),
			)
		: config;
	return markNormalizedElementConfig(next as unknown as ElementConfig, containerKindOf(getElement(config.$type)));
}
