import type { FormConfig, FormConfigEnvelope, FormTaggedConfig } from '@/schemas/form-config';
import { formConfigEnvelopeSchema } from '@/schemas/form-config';
import { safeParseStandardSchema } from '@schema-engine/registry';
import {
	markNormalizedFormConfig,
	getNormalizedFormOwner,
	type NormalizedElementConfig,
	type NormalizedFormConfig,
} from '@/lib/normalized-form-config';
import { stepGrid } from '@/lib/form-view';
import { walkNamedElements } from '@/lib/field-scope';
import { ENGINE_KEY_PREFIX, isReservedPathKey } from '@/lib/reserved-path-keys';
import { getDefaultLayoutTheme } from '@schema-engine/layout';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';
import { fieldPlacementIssues, templateIssues, type PlacedElement } from './validate-form/grid-checks';
import {
	childPath,
	issueAt,
	type FormValidationIssue,
	type FormValidationResult,
	type ParseResult,
	type Path,
} from './validate-form/issues';
import type { ValidateFormOptions } from './validate-form/options';
import { brandElementTree, parseElementList, parseElementNode } from './validate-form/parse-elements';
import { parseOwnerActions } from './validate-form/parse-owner-actions';
import { parseView } from './validate-form/parse-view';
import { stepStructureIssues } from './validate-form/step-checks';
import { fromSchemaIssues } from './validate-form/schema-issues';
import { FormValidationError } from './validate-form/validation-error';

export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, stepGrid } from '@/lib/form-view';
export type { FormValidationIssue, FormValidationResult } from './validate-form/issues';
export type { ValidateFormOptions } from './validate-form/options';
export { FormValidationError } from './validate-form/validation-error';

/**
 * Validate a single element against its registration schema, including nested child elements.
 * Use this before rendering a field that is not already part of a {@link NormalizedFormConfig}.
 * The normalized marker is applied only after this element and its children succeed.
 *
 * @throws {FormValidationError} Issue paths are relative to the element, for example `['grid', 'width']`
 * or `['elements', 0, 'rules', 1, '$type']`.
 */
export function validateElementConfig(
	config: unknown,
	options: Pick<ValidateFormOptions, 'elements' | 'checkRule' | 'axes'>,
): NormalizedElementConfig {
	const parsed = parseElementNode(config, options.elements, options.checkRule, [], {
		axes: options.axes ?? getDefaultLayoutTheme().axes,
		inherited: {},
	});
	if (!parsed.item) throw new FormValidationError(parsed.issues, config);
	return brandElementTree(parsed.item, options.elements);
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 * Returns a frozen {@link NormalizedFormConfig}: schema defaults and transforms are kept, the input object is not mutated.
 *
 * @throws {FormValidationError} With the issues found. {@link safeValidateFormConfig} returns them instead.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): NormalizedFormConfig {
	const result = safeValidateFormConfig(config, options);
	if (!result.success) throw new FormValidationError(result.issues, config);
	return result.data;
}

/**
 * Same validation as {@link validateFormConfig}, reported as a result: the normalized form, or the
 * issues found, each with the config path it is about.
 *
 * @remarks
 * A malformed envelope (the form's own shape) stops the deeper checks, so it comes back on its own;
 * once the envelope parses, the issues of every element, action, grid and view are reported together.
 * Still throws for a misuse of the API, such as a registration whose Standard Schema is async.
 */
export function safeValidateFormConfig(
	config: unknown,
	options: ValidateFormOptions,
): FormValidationResult<NormalizedFormConfig> {
	const existingOwner = getNormalizedFormOwner(config);
	if (existingOwner) {
		if (existingOwner === options.owner) {
			return {
				success: true,
				data: markNormalizedFormConfig(config as FormConfig, options.owner, options.values),
			};
		}
		const formId = typeof config === 'object' && config !== null && 'id' in config ? String(config.id) : 'unknown';
		return {
			success: false,
			issues: [
				issueAt(
					[],
					`Form '${formId}' was already normalized by a different engine. Pass the original authoring input or JSON to this engine instead.`,
				),
			],
		};
	}

	const parsedEnvelope = parseEnvelope(config);
	if (!parsedEnvelope.ok) return { success: false, issues: parsedEnvelope.issues };
	const envelope = parsedEnvelope.data;

	const issues: FormValidationIssue[] = [];
	const axes = options.axes ?? getDefaultLayoutTheme().axes;
	const formScope: AppearanceScope = { axes, inherited: {} };
	const formAppearance = resolveAppearance(envelope.appearance, formScope, { subject: 'The form', path: [] });
	issues.push(...formAppearance.issues);

	const placed: PlacedElement[][] = [];
	const steps = envelope.steps.map((step, stepIndex) => {
		const stepPath: Path = ['steps', stepIndex];
		const stepAppearance = resolveAppearance(step.appearance, formAppearance.childScope, {
			subject: 'The step',
			path: stepPath,
		});
		issues.push(...stepAppearance.issues);
		const elements = parseElementList(
			step.elements,
			options.elements,
			options.checkRule,
			stepPath,
			stepAppearance.childScope,
		);
		const actions = parseOwnerActions(step.actions, options, stepPath);
		issues.push(...elements.issues, ...actions.issues);
		placed.push(
			elements.byIndex.flatMap((element, index) =>
				element ? [{ element, path: childPath(stepPath, index) }] : [],
			),
		);
		return {
			...withAppearance(step, stepAppearance.selection),
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
		};
	});

	issues.push(...stepStructureIssues(steps, options.elements));
	issues.push(
		...payloadIssues(
			envelope.payload,
			steps.flatMap((step) => step.elements),
		),
	);

	const formShape = templateIssues('Form grid', envelope.grid, ['grid']);
	issues.push(...formShape);
	steps.forEach((step, index) => {
		const own = step.grid !== undefined;
		const label = own ? 'Step grid' : 'Form grid';
		const gridPath: Path = own ? ['steps', index, 'grid'] : ['grid'];
		const shape = own ? templateIssues(label, step.grid, gridPath) : formShape;
		if (own) issues.push(...shape);
		const scope = { gridPath, elements: placed[index] ?? [] };
		issues.push(...fieldPlacementIssues(label, stepGrid(envelope, step), scope, shape.length === 0, !own));
	});

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		{ id: envelope.id, stepCount: envelope.steps.length },
		options,
		formAppearance.childScope,
	);
	const formActions = parseOwnerActions(envelope.actions, options, []);
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		return { success: false, issues };
	}

	return {
		success: true,
		data: markNormalizedFormConfig(
			{
				...withAppearance(envelope, formAppearance.selection),
				steps: steps.map((step) => ({
					...step,
					elements: step.elements.map((element) =>
						brandElementTree(element as FormTaggedConfig, options.elements),
					),
				})),
				view: view.view ?? envelope.view,
				actions: formActions.items ?? envelope.actions,
			} as unknown as FormConfig,
			options.owner,
			options.values,
		),
	};
}

/**
 * The payload keys that cannot travel: a reserved segment, or the name of a field.
 *
 * @remarks
 * The payload is data that travels with a submission and is never a value of the form, so a key that is
 * also a field would make one name mean two things in `submission.values`.
 */
function payloadIssues(
	payload: Readonly<Record<string, unknown>> | undefined,
	elements: readonly object[],
): FormValidationIssue[] {
	if (!payload) return [];
	const fieldNames = new Set(walkNamedElements(elements).map(({ path }) => path.split('.')[0]));
	return Object.keys(payload).flatMap((key) => {
		if (isReservedPathKey(key)) {
			return [
				issueAt(
					['payload', key],
					`Payload key '${key}' is reserved: a key cannot start with '${ENGINE_KEY_PREFIX}' or be one of __proto__, constructor and prototype.`,
				),
			];
		}
		return fieldNames.has(key)
			? [
					issueAt(
						['payload', key],
						`Payload key '${key}' names a field of the form; a payload key cannot be a field.`,
					),
				]
			: [];
	});
}

/**
 * Parses the form's own shape (its id, steps, view and the like). Nothing deeper is checked when this
 * fails, so a malformed envelope is reported on its own.
 */
function parseEnvelope(config: unknown): ParseResult<FormConfigEnvelope> {
	const result = safeParseStandardSchema(formConfigEnvelopeSchema, config);
	if (!result.success) return { ok: false, issues: fromSchemaIssues(result.error.issues, []) };
	return { ok: true, data: result.data as FormConfigEnvelope };
}
