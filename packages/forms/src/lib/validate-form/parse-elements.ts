import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FormTaggedConfig } from '@/schemas/form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { safeParseStandardSchema } from '@/lib/standard-schema';
import { markNormalizedElementConfig, type NormalizedElementConfig } from '@/lib/normalized-form-config';
import { getElementChildren, withElementChildren } from '@/lib/element-children';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';
import { areaPlacementIssue, namedPlacementIssue } from './grid-checks';
import { childPath, isTaggedConfig, issueAt, type FormValidationIssue, type ParseResult, type Path } from './issues';
import type { ValidateFormOptions } from './options';
import { fromSchemaIssues } from './schema-issues';

function parseRegistration(schema: StandardSchemaV1, config: object, path: Path): ParseResult<unknown> {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		return { ok: false, issues: fromSchemaIssues(result.error.issues, path) };
	}
	return { ok: true, data: result.data };
}

export function parseTypedConfig(
	kind: 'element' | 'action',
	item: FormTaggedConfig,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	path: Path,
): ParseResult<FormTaggedConfig> {
	const registration = getRegistration(item.$type);
	if (!registration) {
		return {
			ok: false,
			issues: [
				issueAt([...path, '$type'], `Unknown ${kind} type '${item.$type}'. Register it with ${registerHint}.`),
			],
		};
	}

	const parsed = parseRegistration(registration.schema, item, path);
	if (!parsed.ok) return parsed;
	if (!isTaggedConfig(parsed.data)) {
		return {
			ok: false,
			issues: [
				issueAt(
					[...path, '$type'],
					`Invalid ${kind} configuration for '${item.$type}': parsed output is missing $type.`,
				),
			],
		};
	}
	return { ok: true, data: parsed.data };
}

/**
 * Validates the `actions` of the form or of a step. A nested array is a group of actions that
 * render together; its members sit one level deeper in the path.
 */
export function parseActionList(
	items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	ownerPath: Path,
): { issues: FormValidationIssue[]; items?: Array<FormTaggedConfig | FormTaggedConfig[]> } {
	if (!items) return { issues: [] };

	const next: Array<FormTaggedConfig | FormTaggedConfig[]> = [];
	const issues: FormValidationIssue[] = [];
	const parseItem = (item: FormTaggedConfig, path: Path): FormTaggedConfig | undefined => {
		const result = parseTypedConfig('action', item, getRegistration, registerHint, path);
		if (!result.ok) {
			issues.push(...result.issues);
			return undefined;
		}
		return result.data;
	};
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		if (Array.isArray(item)) {
			const group = item
				.map((action, actionIndex) => parseItem(action, [...ownerPath, 'actions', index, actionIndex]))
				.filter((action): action is FormTaggedConfig => action !== undefined);
			next.push(group);
			continue;
		}
		const parsed = parseItem(item, [...ownerPath, 'actions', index]);
		if (parsed) next.push(parsed);
	}

	return { issues, items: next };
}

/** The first rule of an element with a `type` no validation handler is registered for. */
function unregisteredValidationRule(
	item: FormTaggedConfig,
	hasValidation: ValidateFormOptions['hasValidation'],
): { index: number; message: string } | undefined {
	if (!Array.isArray(item.rules)) return undefined;

	for (const [index, rule] of item.rules.entries()) {
		if (typeof rule !== 'object' || rule === null || !('type' in rule) || typeof rule.type !== 'string') {
			continue;
		}
		if (!hasValidation(rule.type)) {
			const fieldName = typeof item.name === 'string' ? `Field '${item.name}'` : 'Element';
			return { index, message: `${fieldName} uses validation rule '${rule.type}' with no registered handler.` };
		}
	}

	return undefined;
}

export function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	path: Path,
	appearance: AppearanceScope,
	nested = false,
): { issues: FormValidationIssue[]; item?: FormTaggedConfig } {
	const fail = (message: string, relative: Path = []) => ({ issues: [issueAt([...path, ...relative], message)] });

	if (!isTaggedConfig(item)) {
		return fail('Invalid element configuration: missing $type.', ['$type']);
	}
	const unregisteredRule = unregisteredValidationRule(item, hasValidation);
	if (unregisteredRule) return fail(unregisteredRule.message, ['rules', unregisteredRule.index, 'type']);

	const { appearance: authoredAppearance, ...authored } = item;
	const parsed = parseTypedConfig(
		'element',
		authored as FormTaggedConfig,
		getElement,
		'createFormEngine({ elements: [...] })',
		path,
	);
	if (!parsed.ok) {
		return { issues: parsed.issues };
	}
	const placementIssue = namedPlacementIssue(parsed.data);
	if (placementIssue) return fail(placementIssue.message, placementIssue.path);
	const areaIssue = areaPlacementIssue(parsed.data, nested);
	if (areaIssue) return fail(areaIssue.message, areaIssue.path);

	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${item.$type}'`,
		path,
		supported: getElement(item.$type)?.appearanceAxes ?? [],
	});
	const issues = elementAppearance.issues;
	const resolved = withAppearance(parsed.data, elementAppearance.selection);

	const children = getElementChildren(parsed.data);
	if (!children) {
		return issues.length > 0 ? { issues } : { issues: [], item: resolved };
	}

	const nextChildren: FormTaggedConfig[] = [];
	const childScope = elementAppearance.childScope;
	for (let index = 0; index < children.length; index += 1) {
		const parsedChild = parseElementNode(
			children[index],
			getElement,
			hasValidation,
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
	hasValidation: ValidateFormOptions['hasValidation'],
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
			getElement,
			hasValidation,
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
	getElement: ValidateFormOptions['getElement'],
): NormalizedElementConfig {
	const children = getElementChildren(config);
	const next = children
		? withElementChildren(
				config,
				children.map((child) => brandElementTree(child as FormTaggedConfig, getElement)),
			)
		: config;
	return markNormalizedElementConfig(next as unknown as ElementConfig, getElement(config.$type)?.containerKind);
}
