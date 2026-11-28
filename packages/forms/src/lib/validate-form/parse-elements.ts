import type { FormTaggedConfig } from '@/schemas/form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { safeParseTree, type NodeLookup, type ParsedNode } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { markNormalizedElementConfig, type NormalizedElementConfig } from '@/lib/normalized-form-config';
import { ELEMENT_CHILDREN_KEY, getElementChildren, withElementChildren } from '@/lib/element-children';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';
import { areaPlacementIssue, namedPlacementIssue, spanIssue, subgridIssue } from './grid-checks';
import { childPath, issueAt, type FormValidationIssue, type Path } from './issues';
import type { ValidateFormOptions } from './options';
import { fromSchemaIssues, schemaIssuePath } from './schema-issues';
import { containerKindOf } from '@/lib/container-kind-of';
import type { AnyElementRegistration } from '@/types/registration';
import { ENGINE_KEY_PREFIX, isReservedPathKey } from '@/lib/reserved-path-keys';

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

type ElementTreeNode = ParsedNode<AnyElementRegistration>;

const lookupRegistrations = new WeakMap<AnyElementRegistration, AnyElementRegistration>();

/** Runs a schema on the node without its `appearance`, which the engine resolves and writes back itself. */
function withoutAppearance(schema: StandardSchemaV1): StandardSchemaV1 {
	const standard = schema['~standard'];
	return {
		'~standard': {
			version: 1,
			vendor: standard.vendor,
			validate: (value, options) => {
				if (typeof value !== 'object' || value === null || !('appearance' in value)) {
					return standard.validate(value, options);
				}
				const { appearance: _appearance, ...rest } = value;
				return standard.validate(rest, options);
			},
		},
	};
}

/**
 * The element registry as {@link safeParseTree} reads it: each registration's schema runs without the node's
 * `appearance`, so a strict element schema never sees a key the engine owns.
 *
 * @remarks
 * Forms resolves `appearance` itself, down the tree, and writes the resolved pick back after the schema, so the rule is
 * the engine's and not each schema's to allow the key. A wrapped registration is made once per registration, and the
 * lookup carries the registry's `kind` and `hint`.
 */
function elementTreeLookup(registry: ValidateFormOptions['elements']): NodeLookup<AnyElementRegistration> {
	return {
		kind: registry.kind,
		hint: registry.hint,
		get: (type) => {
			const registration = registry.get(type);
			if (!registration) return undefined;
			let wrapped = lookupRegistrations.get(registration);
			if (!wrapped) {
				wrapped = { ...registration, schema: withoutAppearance(registration.schema) };
				lookupRegistrations.set(registration, wrapped);
			}
			return wrapped;
		},
	};
}

/**
 * The authored value at a document path, read from the authored element the path starts under.
 *
 * @param root - The authored element, at `rootPath` in the document
 */
function authoredAt(root: unknown, rootPath: Path, path: Path): unknown {
	let current = root;
	for (const key of path.slice(rootPath.length)) {
		if (typeof current !== 'object' || current === null) return undefined;
		current = (current as Record<PropertyKey, unknown>)[key];
	}
	return current;
}

interface ElementPass {
	root: unknown;
	rootPath: Path;
	checkRule: ValidateFormOptions['checkRule'];
}

/**
 * Runs the checks forms adds on a node of the parsed tree, and returns it with its parsed rules, its resolved
 * appearance and its checked children, or the issues found.
 *
 * @remarks
 * The tree holds only nodes whose schema passed, with children read as authored, so these checks never see a node the
 * registry rejected. A node that fails a check reports it and its children are not walked, as the parent's check
 * is what the children's checks hang on. The authored `appearance` is read at the node's `path`, since the schema never
 * saw it.
 */
function checkElementNode(
	node: ElementTreeNode,
	pass: ElementPass,
	appearance: AppearanceScope,
	nested: boolean,
): ParsedElement {
	const path = schemaIssuePath(node.path);
	const fail = (message: string, relative: Path = []) => ({ issues: [issueAt([...path, ...relative], message)] });
	const authored = authoredAt(pass.root, pass.rootPath, path);

	if (
		node.registration.childPaths === undefined &&
		typeof authored === 'object' &&
		authored !== null &&
		Object.hasOwn(authored, ELEMENT_CHILDREN_KEY)
	) {
		return fail(`Element '${node.$type}' declares no child path, so it cannot hold elements.`, [
			ELEMENT_CHILDREN_KEY,
		]);
	}

	const checkedRules = checkElementRules(node.data as FormTaggedConfig, pass.checkRule, path);
	if (checkedRules.issues.length > 0) return { issues: checkedRules.issues };
	const config = checkedRules.item;
	const reserved = reservedNameSegment(config);
	if (reserved) {
		return fail(
			`Field name '${String(config.name)}' uses the reserved segment '${reserved}': a name cannot start with '${ENGINE_KEY_PREFIX}' or be one of __proto__, constructor and prototype.`,
			['name'],
		);
	}
	const placementIssue = namedPlacementIssue(config);
	if (placementIssue) return fail(placementIssue.message, placementIssue.path);
	const areaIssue = areaPlacementIssue(config, nested);
	if (areaIssue) return fail(areaIssue.message, areaIssue.path);
	const span = spanIssue(config);
	if (span) return fail(span.message, span.path);
	const subgrid = subgridIssue(config, containerKindOf(node.registration));
	if (subgrid) return fail(subgrid.message, subgrid.path);

	const authoredAppearance =
		typeof authored === 'object' && authored !== null && 'appearance' in authored ? authored.appearance : undefined;
	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${config.$type}'`,
		path,
		supported: node.registration.appearanceAxes ?? [],
	});
	const issues = elementAppearance.issues;
	const resolved = withAppearance(config, elementAppearance.selection);

	const slot = node.children.find(({ keys }) => keys.length === 1 && keys[0] === ELEMENT_CHILDREN_KEY);
	if (!slot) {
		return issues.length > 0 ? { issues } : { issues: [], item: resolved };
	}

	const nextChildren: FormTaggedConfig[] = [];
	for (const child of slot.nodes) {
		const checked = checkElementNode(child, pass, elementAppearance.childScope, true);
		issues.push(...checked.issues);
		if (checked.item) nextChildren.push(checked.item);
	}
	if (issues.length > 0) return { issues };

	return {
		issues: [],
		item: Array.isArray(resolved[ELEMENT_CHILDREN_KEY]) ? withElementChildren(resolved, nextChildren) : resolved,
	};
}

/**
 * Validates one element and everything it holds, as the registry's tree walk reads them, then runs forms' own checks on
 * the tree.
 *
 * @remarks
 * The registry walk reads the children as authored and holds each parent schema to its child paths, so a schema that
 * drops, reorders or injects children is a `RegistryError`, not a different form. Forms' checks (names, rules, grid,
 * appearance) run after it, on a tree whose every schema passed. Throws `RegistryError` as `safeParseTree` does.
 */
export function parseElementNode(
	item: unknown,
	elementRegistry: ValidateFormOptions['elements'],
	checkRule: ValidateFormOptions['checkRule'],
	path: Path,
	appearance: AppearanceScope,
): ParsedElement {
	const parsed = safeParseTree(elementTreeLookup(elementRegistry), item, { path });
	if (!parsed.success) return { issues: fromSchemaIssues(parsed.issues, []) };
	return checkElementNode(parsed.tree, { root: item, rootPath: path, checkRule }, appearance, false);
}

/**
 * Validates the elements of a step. `byIndex` keeps each element at the index it was authored at
 * (`undefined` where it failed), so later checks name the right path.
 */
export function parseElementList(
	items: unknown[] | undefined,
	elementRegistry: ValidateFormOptions['elements'],
	checkRule: ValidateFormOptions['checkRule'],
	parentPath: Path,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; items?: FormTaggedConfig[]; byIndex: Array<FormTaggedConfig | undefined> } {
	if (!items) return { issues: [], byIndex: [] };

	const next: FormTaggedConfig[] = [];
	const byIndex: Array<FormTaggedConfig | undefined> = [];
	const issues: FormValidationIssue[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const parsed = parseElementNode(
			items[index],
			elementRegistry,
			checkRule,
			childPath(parentPath, index),
			appearance,
		);
		issues.push(...parsed.issues);
		byIndex.push(parsed.item);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next, byIndex };
}

export function brandElementTree(
	config: FormTaggedConfig,
	elementRegistry: ValidateFormOptions['elements'],
): NormalizedElementConfig {
	const children = getElementChildren(config);
	const next = children
		? withElementChildren(
				config,
				children.map((child) => brandElementTree(child as FormTaggedConfig, elementRegistry)),
			)
		: config;
	return markNormalizedElementConfig(
		next as unknown as ElementConfig,
		containerKindOf(elementRegistry.get(config.$type)),
	);
}
