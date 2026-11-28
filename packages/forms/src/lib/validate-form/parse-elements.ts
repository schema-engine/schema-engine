import type { FormTaggedConfig } from '@/schemas/form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { safeParseTree, type NodeLookup, type ParsedNode, type PartialNode } from '@schema-engine/registry';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { markNormalizedElementConfig, type NormalizedElementConfig } from '@/lib/normalized-form-config';
import {
	ELEMENT_CHILDREN_KEY,
	getElementChildren,
	withElementChildren,
	withoutElementChildren,
} from '@/lib/element-children';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';
import { areaPlacementIssue, namedPlacementIssue, spanIssue, subgridIssue, type PlacedElement } from './grid-checks';
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

/**
 * An element whose own schema passed, as the checks that read a whole step see it: its own parsed config, where it sits
 * in the document, and the children that parsed.
 *
 * @remarks
 * It is built from the registry's `children` alone, so it is finite (a cycle stops in the registry) and holds no
 * rejected node. `config` is the node's own schema output with `elements` replaced by the `config` of each retained
 * child, so an element with an issue of its own still counts for the step's constraints, the payload and the grid.
 */
export interface RetainedElement {
	config: FormTaggedConfig;
	path: Path;
	children: RetainedElement[];
}

/** What {@link parseElementNode} returns: the issues found, the element when it has none, and what parsed. */
interface ParsedElement {
	issues: FormValidationIssue[];
	/** The element, with its rules parsed, its appearance resolved and its children checked. Only when it has no issue. */
	item?: FormTaggedConfig;
	/** What parsed, unless the element's own schema failed. */
	retained?: RetainedElement;
}

type ElementTreeNode = ParsedNode<AnyElementRegistration> | PartialNode<AnyElementRegistration>;

/** The placement items of a retained element, each child with its own path. */
export function placedFromRetained({ config, path, children }: RetainedElement): PlacedElement {
	return { element: config, path, children: children.map(placedFromRetained) };
}

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

/** The node's own config: the data of a node of a parsed document, the schema output of a node of a partial tree. */
function ownConfig(node: ElementTreeNode): FormTaggedConfig {
	return ('data' in node ? node.data : node.output) as FormTaggedConfig;
}

/**
 * The first issue of the grid checks of a node. They overlap on the same keys, so one issue says what is wrong.
 */
function gridIssue(
	config: FormTaggedConfig,
	nested: boolean,
	registration: AnyElementRegistration,
): { message: string; path: Path } | undefined {
	return (
		namedPlacementIssue(config) ??
		areaPlacementIssue(config, nested) ??
		spanIssue(config) ??
		subgridIssue(config, containerKindOf(registration))
	);
}

/**
 * Runs the checks forms adds on a node whose own schema passed, and on its children, in one pass.
 *
 * @remarks
 * A node reports every family that fails (rules, reserved name, grid, appearance), and its children are always
 * checked, so one call reports every issue of the element. Within the grid family the first issue wins, as the checks
 * overlap on the same keys. A node's own issues come before its children's. The authored `appearance` is read at the
 * node's `path`, since the schema never saw it. The child scope for appearance is the resolved one even when the pick
 * has an issue.
 *
 * An element that declares no child path holds no children: `elements` on it, authored or added by its schema, is one
 * issue, its other families are still checked, its children are not, and its retained config has no `elements`, so no
 * step check walks what was never validated.
 */
function checkElementNode(
	node: ElementTreeNode,
	pass: ElementPass,
	appearance: AppearanceScope,
	nested: boolean,
): { issues: FormValidationIssue[]; item?: FormTaggedConfig; retained: RetainedElement } {
	const path = schemaIssuePath(node.path);
	const declared = ownConfig(node);
	const authored = authoredAt(pass.root, pass.rootPath, path);
	const issues: FormValidationIssue[] = [];

	const holdsNone = node.registration.childPaths === undefined;
	const authoredChildren =
		typeof authored === 'object' && authored !== null && Object.hasOwn(authored, ELEMENT_CHILDREN_KEY);
	if (holdsNone && (authoredChildren || declared[ELEMENT_CHILDREN_KEY] !== undefined)) {
		issues.push(
			issueAt(
				[...path, ELEMENT_CHILDREN_KEY],
				`Element '${node.$type}' declares no child path, so it cannot hold elements.`,
			),
		);
	}
	const own: FormTaggedConfig = holdsNone ? (withoutElementChildren(declared) as FormTaggedConfig) : declared;

	const checkedRules = checkElementRules(own, pass.checkRule, path);
	issues.push(...checkedRules.issues);
	const config = checkedRules.issues.length > 0 ? own : checkedRules.item;

	const reserved = reservedNameSegment(config);
	if (reserved) {
		issues.push(
			issueAt(
				[...path, 'name'],
				`Field name '${String(config.name)}' uses the reserved segment '${reserved}': a name cannot start with '${ENGINE_KEY_PREFIX}' or be one of __proto__, constructor and prototype.`,
			),
		);
	}

	const grid = gridIssue(config, nested, node.registration);
	if (grid) issues.push(issueAt([...path, ...grid.path], grid.message));

	const authoredAppearance =
		typeof authored === 'object' && authored !== null && 'appearance' in authored ? authored.appearance : undefined;
	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${config.$type}'`,
		path,
		supported: node.registration.appearanceAxes ?? [],
	});
	issues.push(...elementAppearance.issues);

	const slot = node.children.find(({ keys }) => keys.length === 1 && keys[0] === ELEMENT_CHILDREN_KEY);
	const nextChildren: FormTaggedConfig[] = [];
	const retainedChildren: RetainedElement[] = [];
	for (const child of slot?.nodes ?? []) {
		const checked = checkElementNode(child, pass, elementAppearance.childScope, true);
		issues.push(...checked.issues);
		retainedChildren.push(checked.retained);
		if (checked.item) nextChildren.push(checked.item);
	}

	const holdsChildren = slot !== undefined && Array.isArray(own[ELEMENT_CHILDREN_KEY]);
	const retained: RetainedElement = {
		config: holdsChildren
			? withElementChildren(
					own,
					retainedChildren.map((child) => child.config),
				)
			: own,
		path,
		children: retainedChildren,
	};
	if (issues.length > 0) return { issues, retained };

	const resolved = withAppearance(config, elementAppearance.selection);
	return { issues, item: holdsChildren ? withElementChildren(resolved, nextChildren) : resolved, retained };
}

/**
 * Validates one element and everything it holds, as the registry's tree walk reads them, then runs forms' own checks on
 * what parsed.
 *
 * @remarks
 * The registry walk reads the children as authored and holds each parent schema to its child paths, so a schema that
 * drops, reorders or injects children is a `RegistryError`, not a different form. When the document has issues the
 * registry still returns the nodes that parsed, and forms' checks (names, rules, grid, appearance) run on them, so the
 * issues come in one pass: the registry's first, then forms', parent before children, in document order. Throws
 * `RegistryError` as `safeParseTree` does.
 */
export function parseElementNode(
	item: unknown,
	elementRegistry: ValidateFormOptions['elements'],
	checkRule: ValidateFormOptions['checkRule'],
	path: Path,
	appearance: AppearanceScope,
): ParsedElement {
	const parsed = safeParseTree(elementTreeLookup(elementRegistry), item, { path });
	const registryIssues = parsed.success ? [] : fromSchemaIssues(parsed.issues, []);
	if (!parsed.tree) return { issues: registryIssues };
	const checked = checkElementNode(parsed.tree, { root: item, rootPath: path, checkRule }, appearance, false);
	const issues = [...registryIssues, ...checked.issues];
	return issues.length > 0
		? { issues, retained: checked.retained }
		: { issues, item: checked.item, retained: checked.retained };
}

/**
 * Validates the elements of a step. `items` holds the elements with no issue, for normalization; `retained` holds
 * every element whose own schema passed, with the children that did, for the checks that read a whole step.
 */
export function parseElementList(
	items: readonly unknown[],
	elementRegistry: ValidateFormOptions['elements'],
	checkRule: ValidateFormOptions['checkRule'],
	parentPath: Path,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; items: FormTaggedConfig[]; retained: RetainedElement[] } {
	const next: FormTaggedConfig[] = [];
	const retained: RetainedElement[] = [];
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
		if (parsed.retained) retained.push(parsed.retained);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next, retained };
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
