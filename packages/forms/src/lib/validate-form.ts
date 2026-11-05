import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { FormConfig, FormConfigEnvelope, FormTaggedConfig } from '@/schemas/form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { formConfigEnvelopeSchema } from '@/schemas/form-config';
import { safeParseStandardSchema, type StandardSchemaIssue } from '@/lib/standard-schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	markNormalizedElementConfig,
	markNormalizedFormConfig,
	getNormalizedFormOwner,
	type NormalizedElementConfig,
	type NormalizedFormConfig,
} from '@/lib/normalized-form-config';
import { getElementChildren, withElementChildren } from '@/lib/element-children';

export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, resolveFormRecipe } from '@/lib/form-view';
export type { RecipeLookup } from '@/lib/form-view';

export class FormValidationError extends Error {
	constructor(
		message: string,
		public readonly issues: string[] = [],
	) {
		super(message);
		this.name = 'FormValidationError';
	}
}

type ElementRegistration = AnyElementRegistration;

export interface ValidateFormOptions {
	/** Engine (or other owner) that produced this validation. Required to skip re-validation. */
	owner: object;
	getRecipe: (id: string) => AnyRecipeRegistration | undefined;
	getElement: (id: string) => ElementRegistration | undefined;
	getAction: (id: string) => AnyActionRegistration | undefined;
	hasValidation: (type: string) => boolean;
	parseFormConfig?: (config: unknown) => FormConfig;
}

function formatIssuePath(path: StandardSchemaIssue['path']): string {
	if (!path?.length) return '';
	return path
		.map((segment) => {
			if (typeof segment === 'object' && segment !== null && 'key' in segment) {
				return String(segment.key);
			}
			return String(segment);
		})
		.join('.');
}

function formatSchemaIssues(issues: StandardSchemaIssue[]): string {
	return issues
		.map((issue) => {
			const path = formatIssuePath(issue.path);
			const keys =
				'keys' in issue && Array.isArray(issue.keys)
					? issue.keys.filter(
							(key): key is PropertyKey =>
								typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol',
						)
					: [];
			const message = keys.length > 0 ? `${issue.message} (${keys.map(String).join(', ')})` : issue.message;
			return path ? `${message} (${path})` : message;
		})
		.join(', ');
}

function itemLocation(kind: string, index: number, item: { id?: unknown }): string {
	const id = typeof item.id === 'string' && item.id ? ` (id: '${item.id}')` : '';
	return `${kind}[${index}]${id}`;
}

function prefixed(location: string, message: string): string {
	return `${location}: ${message}`;
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; issue: string };

function isTaggedConfig(value: unknown): value is FormTaggedConfig {
	return typeof value === 'object' && value !== null && '$type' in value && typeof value.$type === 'string';
}

function parseRegistration(schema: StandardSchemaV1, config: object, invalidPrefix: string): ParseResult<unknown> {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		const message = formatSchemaIssues(result.error.issues) || 'Validation failed';
		return { ok: false, issue: `${invalidPrefix}: ${message}` };
	}
	return { ok: true, data: result.data };
}

function parseView(
	view: FormTaggedConfig | undefined,
	stepCount: number,
	getRecipe: ValidateFormOptions['getRecipe'],
): { issues: string[]; view?: FormTaggedConfig } {
	if (!view) {
		return { issues: stepCount === 0 ? ['Form must have at least one step.'] : [] };
	}

	const recipeType = view.$type;
	if (!recipeType) {
		return { issues: ['view.$type must be a non-empty string.'] };
	}

	const recipe = getRecipe(recipeType);
	if (!recipe) {
		return {
			issues: [`Unknown view recipe '${recipeType}'. Register it with createFormEngine({ recipes: [...] }).`],
		};
	}

	const issues: string[] = [];
	if (recipe.kind === 'single-step' && stepCount !== 1) {
		issues.push(
			`Recipe '${recipeType}' is single-step only (kind: 'single-step') but the form has ${stepCount} steps.`,
		);
	}
	if (recipe.kind === 'wizard' && stepCount < 2) {
		issues.push(
			`Recipe '${recipeType}' requires at least 2 steps (kind: 'wizard') but the form has ${stepCount} step(s).`,
		);
	}

	const parsed = parseRegistration(recipe.schema, view, `Invalid view configuration for recipe '${recipeType}'`);
	if (!parsed.ok) {
		issues.push(parsed.issue);
		return { issues, view };
	}
	if (!isTaggedConfig(parsed.data)) {
		issues.push(`Invalid view configuration for recipe '${recipeType}': parsed output is missing $type.`);
		return { issues, view };
	}

	const allowedSlots = new Set<string>(recipe.slots);
	for (const key of Object.keys(view)) {
		if (key === '$type') continue;
		if (!allowedSlots.has(key)) {
			issues.push(
				`Recipe '${recipeType}' does not accept view key '${key}'. Allowed: ${[...allowedSlots].join(', ') || '(none)'}.`,
			);
		}
	}

	return { issues, view: parsed.data };
}

function parseTypedConfig(
	kind: 'element' | 'action',
	item: FormTaggedConfig,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
): ParseResult<FormTaggedConfig> {
	const registration = getRegistration(item.$type);
	if (!registration) {
		return { ok: false, issue: `Unknown ${kind} type '${item.$type}'. Register it with ${registerHint}.` };
	}

	const parsed = parseRegistration(registration.schema, item, `Invalid ${kind} configuration for '${item.$type}'`);
	if (!parsed.ok) return parsed;
	if (!isTaggedConfig(parsed.data)) {
		return {
			ok: false,
			issue: `Invalid ${kind} configuration for '${item.$type}': parsed output is missing $type.`,
		};
	}
	return { ok: true, data: parsed.data };
}

function parseTypedList(
	items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
	kind: 'element' | 'action',
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	parentLocation: string,
	itemKind: string,
): { issues: string[]; items?: Array<FormTaggedConfig | FormTaggedConfig[]> } {
	if (!items) return { issues: [] };

	const next: Array<FormTaggedConfig | FormTaggedConfig[]> = [];
	const issues: string[] = [];
	const parseItem = (item: FormTaggedConfig, location: string): FormTaggedConfig | undefined => {
		const result = parseTypedConfig(kind, item, getRegistration, registerHint);
		if (!result.ok) {
			issues.push(prefixed(location, result.issue));
			return undefined;
		}
		return result.data;
	};
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		if (Array.isArray(item)) {
			const group = item
				.map((action, actionIndex) =>
					parseItem(
						action,
						`${parentLocation} ${itemKind}[${index}] ${itemLocation('actions', actionIndex, { id: action.id })}`,
					),
				)
				.filter((action): action is FormTaggedConfig => action !== undefined);
			next.push(group);
			continue;
		}
		const location = `${parentLocation} ${itemLocation(itemKind, index, { id: item.id })}`;
		const parsed = parseItem(item, location);
		if (parsed) next.push(parsed);
	}

	return { issues, items: next };
}

function taggedId(item: unknown): unknown {
	if (typeof item === 'object' && item !== null && 'id' in item) {
		return (item as { id?: unknown }).id;
	}
	return undefined;
}

function childLocation(parentLocation: string, index: number, child: unknown): string {
	const nested = itemLocation('elements', index, { id: taggedId(child) });
	return parentLocation ? `${parentLocation} ${nested}` : nested;
}

function unregisteredValidationRule(
	item: FormTaggedConfig,
	hasValidation: ValidateFormOptions['hasValidation'],
): string | undefined {
	if (!Array.isArray(item.rules)) return undefined;

	for (const rule of item.rules) {
		if (typeof rule !== 'object' || rule === null || !('type' in rule) || typeof rule.type !== 'string') {
			continue;
		}
		if (!hasValidation(rule.type)) {
			const fieldName = typeof item.name === 'string' ? `Field '${item.name}'` : 'Element';
			return `${fieldName} uses validation rule '${rule.type}' with no registered handler.`;
		}
	}

	return undefined;
}

function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	location: string,
): { issues: string[]; item?: FormTaggedConfig } {
	const fail = (message: string) => ({
		issues: [location ? prefixed(location, message) : message],
	});

	if (!isTaggedConfig(item)) {
		return fail('Invalid element configuration: missing $type.');
	}
	const unregisteredRule = unregisteredValidationRule(item, hasValidation);
	if (unregisteredRule) return fail(unregisteredRule);

	const parsed = parseTypedConfig('element', item, getElement, 'createFormEngine({ elements: [...] })');
	if (!parsed.ok) {
		return fail(parsed.issue);
	}

	const children = getElementChildren(parsed.data);
	if (!children) {
		return { issues: [], item: parsed.data };
	}

	const nextChildren: FormTaggedConfig[] = [];
	const issues: string[] = [];
	for (let index = 0; index < children.length; index += 1) {
		const child = children[index];
		const nested = parseElementNode(child, getElement, hasValidation, childLocation(location, index, child));
		issues.push(...nested.issues);
		if (nested.item) nextChildren.push(nested.item);
	}

	if (issues.length > 0) {
		return { issues };
	}

	return { issues: [], item: withElementChildren(parsed.data, nextChildren) };
}

function parseElementList(
	items: unknown[] | undefined,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	parentLocation: string,
): { issues: string[]; items?: FormTaggedConfig[] } {
	if (!items) return { issues: [] };

	const next: FormTaggedConfig[] = [];
	const issues: string[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		const parsed = parseElementNode(item, getElement, hasValidation, childLocation(parentLocation, index, item));
		issues.push(...parsed.issues);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next };
}

function brandElementTree(
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

/**
 * Validate a single element against its registration schema, including nested child elements.
 * Use this before rendering a field that is not already part of a {@link NormalizedFormConfig}.
 * The normalized marker is applied only after this element and its children succeed.
 */
export function validateElementConfig(
	config: unknown,
	options: Pick<ValidateFormOptions, 'getElement' | 'hasValidation'>,
): NormalizedElementConfig {
	const parsed = parseElementNode(config, options.getElement, options.hasValidation, '');
	if (parsed.issues.length > 0 || !parsed.item) {
		const issues = parsed.issues.length ? parsed.issues : ['Invalid element configuration: missing $type.'];
		throw new FormValidationError(issues[0] ?? 'Invalid element configuration', issues);
	}
	return brandElementTree(parsed.item, options.getElement);
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 * Returns a frozen {@link NormalizedFormConfig}: schema defaults and transforms are kept, the input object is not mutated.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): NormalizedFormConfig {
	const existingOwner = getNormalizedFormOwner(config);
	if (existingOwner) {
		if (existingOwner === options.owner) {
			return config as NormalizedFormConfig;
		}
		const formId = typeof config === 'object' && config !== null && 'id' in config ? String(config.id) : 'unknown';
		const message = `Form '${formId}' was already normalized by a different engine. Pass the original authoring input or JSON to this engine instead.`;
		throw new FormValidationError(message, [message]);
	}

	let envelope: FormConfigEnvelope;
	try {
		envelope = formConfigEnvelopeSchema.parse(
			options.parseFormConfig ? options.parseFormConfig(config) : config,
		) as FormConfigEnvelope;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new FormValidationError(`Invalid form configuration: ${message}`, [message]);
	}

	const issues: string[] = [];
	const parseActions = (
		items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
		parentLocation: string,
		itemKind: string,
	) =>
		parseTypedList(
			items,
			'action',
			options.getAction,
			'createFormEngine({ actions: [...] })',
			parentLocation,
			itemKind,
		);

	const steps = envelope.steps.map((step, stepIndex) => {
		const stepLocation = itemLocation('steps', stepIndex, step);
		const elements = parseElementList(step.elements, options.getElement, options.hasValidation, stepLocation);
		const actions = parseActions(step.actions, stepLocation, 'actions');
		issues.push(...elements.issues, ...actions.issues);
		return {
			...step,
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
		};
	});

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		envelope.steps.length,
		options.getRecipe,
	);
	const formActions = parseActions(envelope.actions, 'form', 'actions');
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		throw new FormValidationError(issues[0] ?? 'Invalid form configuration', issues);
	}

	return markNormalizedFormConfig(
		{
			...envelope,
			steps: steps.map((step) => ({
				...step,
				elements: step.elements.map((element) =>
					brandElementTree(element as FormTaggedConfig, options.getElement),
				),
			})),
			view: view.view ?? envelope.view,
			actions: formActions.items ?? envelope.actions,
		} as unknown as FormConfig,
		options.owner,
	);
}
