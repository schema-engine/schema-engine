import { evaluateConstraints } from '../constraints/constraint-evaluator.js';
import {
	expandContainerParentPaths,
	expandFieldTemplatePaths,
	getValueAtPath,
	withoutValueAt,
} from '../lib/path-values.js';
import { getElementName, scalarItemsIn, walkNamedElements } from '../lib/field-scope.js';
import { frozenCopy } from '../lib/frozen-copy.js';
import type { ConstraintLogic } from '../schemas/base-field.js';
import {
	createValidationContext,
	createZodSchemaFromRules,
	getValidationRulesForElement,
	isFieldRequired,
} from '../schemas/validation/utils.js';
import type { BaseValidationRule, RequiredRule } from '../schemas/validation/types.js';
import type { ValidationRegistry } from '../schemas/validation/validation-registry.js';
import type { DebounceScope } from '../lib/debounce.js';
import { REPORTED_TEXT, ValidationSuperseded, ValidationUnavailable } from '../schemas/validation/errors.js';
import * as z from 'zod/mini';

export interface ValidationElement {
	readonly name?: string;
	readonly id?: string;
	readonly elements?: readonly ValidationElement[];
	readonly $type?: string;
	readonly rules?: readonly BaseValidationRule[];
	readonly constraints?: readonly ConstraintLogic[];
	/** Authored `disabled`: a disabled field takes no part in validation. */
	readonly disabled?: boolean;
}
export type ValidationElementTree = ReadonlyArray<ValidationElement>;
export interface ValidationStep {
	readonly id?: string;
	readonly elements: readonly ValidationElement[];
	/** `show` and `hide` constraints on earlier steps' fields: a step they hide is skipped. */
	readonly constraints?: readonly ConstraintLogic[];
}

export interface EffectiveRulesInput {
	element: ValidationElement;
	fieldPath: string;
	values: Record<string, unknown>;
	registry: ValidationRegistry;
	/** Set when a `require` constraint of a container around the field holds. */
	inheritedRequired?: boolean;
	/**
	 * The values constraints read, when they differ from `values`.
	 *
	 * @remarks The values of excluded paths are absent from them, see {@link Participation.visible}. Rules always read `values`.
	 */
	constraintValues?: Record<string, unknown>;
}

export interface ValidateFieldValueInput extends EffectiveRulesInput {
	value: unknown;
	/**
	 * Keyed async validation state for this caller's form lifetime.
	 *
	 * @remarks Required: a fresh scope per call delays debounced rules without coalescing them.
	 */
	debounceScope: DebounceScope;
}

export interface ValidateFormValuesInput {
	elements: ValidationElementTree;
	values: Record<string, unknown>;
	registry: ValidationRegistry;
	/**
	 * Limits validation to these paths, and to the paths below them unless `exactNames` is set.
	 *
	 * @remarks Omitted, every field is validated; an empty list validates nothing, as `validate([])` of the form state container does.
	 */
	names?: readonly string[];
	/** Match `names` as whole paths: a field below a named container is not validated. */
	exactNames?: boolean;
	/** Keyed async validation state for this caller's form lifetime; see `ValidateFieldValueInput`. */
	debounceScope: DebounceScope;
	/**
	 * What takes part, when the caller already has it from {@link resolveParticipation}.
	 *
	 * @remarks Computed from `elements` and `values`, as one step, when omitted: no caller opts out of participation.
	 */
	participation?: Pick<Participation, 'excluded' | 'visible'>;
}

/** Whether a failed rule blocks the form (`error`) or only advises (`warning`). */
export type ValidationSeverity = 'error' | 'warning';

/**
 * One rule a value fails, with what a translation needs to say so.
 *
 * @remarks
 * `type` is the rule's type, `ruleId` the author's stable name for that rule and `params` the options its
 * registration exposes (`{ minLength: 8 }`), so a message is composed from the issue and not parsed out of
 * the text. `message` is only the text the author wrote on the rule: the schema library's generic text is
 * never used. A rule reports one issue however many checks its schema runs.
 */
export interface ValidationIssue {
	readonly type: string;
	readonly ruleId?: string;
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
	readonly severity: ValidationSeverity;
}

/**
 * A rule that could not run: its schema could not be built, or it threw while checking the value.
 *
 * @remarks
 * Not a field error. The value is neither valid nor invalid as far as this rule goes, and the cause is
 * the author's or the integration's to fix. `path` and `ruleType` say where; `cause` is what was thrown.
 */
export class FormValidationFailure extends Error {
	readonly path: string;
	readonly ruleType: string;
	readonly ruleId?: string;
	/** `'unavailable'` when the service the rule asks could not answer, else `'error'`. */
	readonly reason: 'unavailable' | 'error';

	constructor(path: string, rule: { readonly type: string; readonly id?: string }, cause: unknown) {
		const reason = cause instanceof Error ? cause.message : String(cause);
		super(`Validation rule '${rule.type}' could not run for '${path}': ${reason}`, { cause });
		this.name = 'FormValidationFailure';
		this.path = path;
		this.ruleType = rule.type;
		this.reason = cause instanceof ValidationUnavailable ? 'unavailable' : 'error';
		if (rule.id !== undefined) this.ruleId = rule.id;
	}
}

/**
 * What validating one field found: the rules it fails, in rule order, and the rules that could not run.
 *
 * @remarks
 * `superseded` is set when a rule's check was replaced by a later one before it ran: the field was not
 * fully checked, so it is neither valid nor invalid and a caller must not decide on it. It is state, not an issue.
 */
export interface FieldValidationResult {
	readonly issues: readonly ValidationIssue[];
	readonly failures: readonly FormValidationFailure[];
	readonly superseded: boolean;
}

/** What a validation found, by the dotted path of the field; a container has its own entry. Only paths with something to report appear. */
export interface FormValidationOutcome {
	readonly issues: Readonly<Record<string, readonly ValidationIssue[]>>;
	readonly failures: Readonly<Record<string, readonly FormValidationFailure[]>>;
	/** The paths a rule of which was replaced by a later check before it ran: not decided either way. */
	readonly superseded: readonly string[];
}

interface FieldElementPath {
	readonly element: ValidationElement;
	readonly fieldPath: string;
	readonly hasChildren: boolean;
}

function expandContainerTemplatePaths(values: Record<string, unknown>, templatePath: string): string[] {
	const segments = templatePath.split('.');
	if (segments.length === 1) {
		return [templatePath];
	}

	const containerName = segments[segments.length - 1];
	const parentPath = segments.slice(0, -1).join('.');
	if (!containerName) {
		return [templatePath];
	}

	return expandContainerParentPaths(values, parentPath).map((fieldPath) => `${fieldPath}.${containerName}`);
}

function expandArrayItemPaths(values: Record<string, unknown>, templatePath: string, depth: number): string[] {
	let paths = expandContainerTemplatePaths(values, templatePath);
	for (let level = 0; level < depth; level += 1) {
		paths = paths.flatMap((path) => {
			const value = getValueAtPath<unknown[]>(values, path);
			return Array.isArray(value) ? Array.from({ length: value.length }, (_, index) => `${path}.${index}`) : [];
		});
	}
	return paths;
}

function pathIsRequested(path: string, names?: readonly string[], exact = false): boolean {
	if (!names) {
		return true;
	}

	return names.some((name) => path === name || (!exact && path.startsWith(`${name}.`)));
}

function fieldElementPathsFor(elements: ValidationElementTree, values: Record<string, unknown>): FieldElementPath[] {
	return walkNamedElements(elements, '', false, scalarItemsIn(values)).flatMap(
		({ path, element, hasChildren, arrayItemDepth }) => {
			const paths = arrayItemDepth
				? expandArrayItemPaths(values, path, arrayItemDepth)
				: hasChildren
					? expandContainerTemplatePaths(values, path)
					: expandFieldTemplatePaths(values, path);
			return paths.map((fieldPath) => ({ element, fieldPath, hasChildren }));
		},
	);
}

/**
 * Lists the named paths in a step, expanding field templates for each live array row.
 *
 * @remarks
 * Container paths stay whole so their own rules can be validated, while leaf
 * paths such as `contacts.email` expand to the rendered `contacts.0.email` paths.
 */
export function collectStepFieldPaths(
	step: ValidationStep | undefined,
	values: Record<string, unknown> = {},
): string[] {
	const paths = fieldElementPathsFor(step?.elements ?? [], values).map(({ fieldPath }) => fieldPath);

	return [...new Set(paths)];
}

/**
 * Resolves authored rules and adds a required rule when a `require` constraint holds.
 *
 * @remarks
 * Constraint references use the rendered path, so each row of an array evaluates
 * against its own sibling values.
 */
export function effectiveRulesFor({
	element,
	fieldPath,
	values,
	registry,
	inheritedRequired = false,
	constraintValues = values,
}: EffectiveRulesInput): BaseValidationRule[] {
	const rules = getValidationRulesForElement<BaseValidationRule>(element, registry) ?? [];
	const isRequired = evaluateConstraints({
		constraints: element.constraints,
		values: constraintValues,
		fieldPath,
		baseRequired: isFieldRequired(rules) || inheritedRequired,
	}).isRequired;

	if (!isRequired || isFieldRequired(rules)) {
		return [...rules];
	}

	const requiredRule: RequiredRule = { type: 'required' };
	return [requiredRule, ...rules];
}

/** What a rule reports when its check was replaced before it ran. */
const SUPERSEDED = Symbol('superseded');

type AuthoredRule = BaseValidationRule & { readonly id?: string; readonly severity?: ValidationSeverity };

/**
 * Validates one field value against each of its rules.
 *
 * @remarks
 * `issues` lists the rules the value fails in rule order, whatever order they finish in, one issue per
 * rule. A rule that cannot run is a failure rather than an issue, and the other rules still report: it
 * says nothing about the value.
 */
export async function validateFieldValue({
	element,
	value,
	values,
	fieldPath,
	registry,
	debounceScope,
	inheritedRequired,
	constraintValues,
}: ValidateFieldValueInput): Promise<FieldValidationResult> {
	const rules = effectiveRulesFor({
		element,
		values,
		fieldPath,
		registry,
		inheritedRequired,
		constraintValues,
	}) as AuthoredRule[];
	const context = createValidationContext({ values, fieldPath, debounceScope });
	const results = await Promise.all(
		rules.map(async (rule): Promise<ValidationIssue | FormValidationFailure | typeof SUPERSEDED | undefined> => {
			try {
				const result = await z.safeParseAsync(createZodSchemaFromRules([rule], context, registry), value);
				if (result.success) return undefined;
				const params = registry.getRuleParams(rule);
				const first = result.error.issues[0];
				const reported = first?.code === 'custom' ? first.params?.[REPORTED_TEXT] : undefined;
				const message = registry.getRuleMessage(rule, typeof reported === 'string' ? reported : undefined);
				return Object.freeze({
					type: rule.type,
					...(rule.id === undefined ? {} : { ruleId: rule.id }),
					...(params === undefined ? {} : { params: frozenCopy(params) }),
					...(message ? { message } : {}),
					severity: rule.severity ?? 'error',
				});
			} catch (cause) {
				if (cause instanceof ValidationSuperseded) return SUPERSEDED;
				return new FormValidationFailure(fieldPath, rule, cause);
			}
		}),
	);
	return {
		issues: results.filter(
			(found): found is ValidationIssue =>
				found !== undefined && found !== SUPERSEDED && !(found instanceof Error),
		),
		failures: results.filter((found): found is FormValidationFailure => found instanceof FormValidationFailure),
		superseded: results.includes(SUPERSEDED),
	};
}

/** Whether `path` is an excluded path or lies below one. */
export const isPathExcluded = (excluded: readonly string[], path: string): boolean =>
	excluded.some((around) => path === around || path.startsWith(`${around}.`));

/**
 * What takes part in a form, from its steps and the current values.
 *
 * @remarks
 * `excluded` lists the paths that take no part, each with everything below it. `skippedSteps` lists the ids of
 * the steps its constraints hide, which exclude every field they hold. `visible` is `values` with the excluded
 * paths absent, the values constraints read: an excluded field counts as absent for every constraint that reads it.
 */
export interface Participation {
	readonly excluded: readonly string[];
	readonly skippedSteps: readonly string[];
	readonly visible: Record<string, unknown>;
}

/**
 * Resolves which steps and paths take part, from the config and the current values.
 *
 * @remarks
 * One rule for every consumer of "does this field count". A step a `show` or `hide` constraint hides is
 * skipped and excludes everything it holds. A field a `show` or `hide` constraint hides, and a field that is
 * disabled, whether authored (`disabled`) or by a constraint (`disable`, `enable`), is excluded together with
 * everything below it. Constraints are resolved by `evaluateConstraints`, against each row's own path.
 *
 * Steps and elements are resolved in order, and the value of whatever is excluded is absent when the next
 * constraint reads it, so a field cannot stay shown because of an answer nobody can give. A constraint
 * that reads a field resolved later sees its value as held. An inactive wizard step is not excluded: it
 * is only not rendered.
 */
export function resolveParticipation(steps: readonly ValidationStep[], values: Record<string, unknown>): Participation {
	let visible = values;
	const excluded: string[] = [];
	const skippedSteps: string[] = [];
	const exclude = (path: string) => {
		excluded.push(path);
		visible = withoutValueAt(visible, path);
	};
	for (const step of steps) {
		if (
			step.constraints?.length &&
			!evaluateConstraints({ constraints: step.constraints, values: visible }).shouldShow
		) {
			if (step.id !== undefined) skippedSteps.push(step.id);
			for (const element of step.elements) {
				const name = getElementName(element);
				if (name) exclude(name);
			}
			continue;
		}
		for (const { element, fieldPath } of fieldElementPathsFor(step.elements, values)) {
			if (isPathExcluded(excluded, fieldPath)) continue;
			if (element.disabled === true) {
				exclude(fieldPath);
				continue;
			}
			if (!element.constraints?.length) continue;
			const { shouldShow, shouldDisable } = evaluateConstraints({
				constraints: element.constraints,
				values: visible,
				fieldPath,
			});
			if (!shouldShow || shouldDisable) exclude(fieldPath);
		}
	}
	return { excluded: [...new Set(excluded)], skippedSteps, visible };
}

/** The paths of one element tree that take no part; see {@link resolveParticipation}, which this is the single-step case of. */
export function resolveExcludedPaths(elements: ValidationElementTree, values: Record<string, unknown>): string[] {
	return [...resolveParticipation([{ elements }], values).excluded];
}

/** Whether a config has anything that can exclude a path, so a container may skip resolving participation. */
export function hasParticipationRules(steps: readonly ValidationStep[]): boolean {
	return steps.some(
		(step) =>
			Boolean(step.constraints?.length) ||
			walkNamedElements(step.elements).some(
				({ element }) => element.disabled === true || Boolean(element.constraints?.length),
			),
	);
}

/** The fields a validation covers, and the values it was planned over. */
export interface ValidationPlan {
	readonly fields: readonly PlannedField[];
	readonly values: Record<string, unknown>;
	/** The values the constraints of the planned fields read: `values` with the excluded paths absent. */
	readonly constraintValues: Record<string, unknown>;
}

/** One field to validate: its element, its rendered path and whether a `require` constraint of a container around it holds. */
export interface PlannedField extends FieldElementPath {
	readonly inheritedRequired: boolean;
}

/**
 * Lists the fields a validation of `names` covers: the requested paths that take part, expanded over live rows.
 *
 * @remarks
 * A field inside a container (fieldset or array) whose `require` constraint holds is required, at any
 * depth. The container's own `required` rule does not pass down. A planned path is one the validation
 * will report on, so a caller can say which paths are pending before it starts.
 */
export function planFormValidation({
	elements,
	values,
	names,
	exactNames = false,
	participation = resolveParticipation([{ elements }], values),
}: Pick<ValidateFormValuesInput, 'elements' | 'values' | 'names' | 'exactNames' | 'participation'>): ValidationPlan {
	const { excluded, visible } = participation;
	const allFields = fieldElementPathsFor(elements, values);
	const requiredContainers = allFields
		.filter(
			({ element, fieldPath, hasChildren }) =>
				hasChildren &&
				evaluateConstraints({ constraints: element.constraints, values: visible, fieldPath }).isRequired,
		)
		.map(({ fieldPath }) => `${fieldPath}.`);
	const fields = allFields
		.filter(
			({ fieldPath }) => pathIsRequested(fieldPath, names, exactNames) && !isPathExcluded(excluded, fieldPath),
		)
		.map((field) => ({
			...field,
			inheritedRequired:
				!field.hasChildren && requiredContainers.some((prefix) => field.fieldPath.startsWith(prefix)),
		}));
	return { fields, values, constraintValues: visible };
}

/** Runs a plan: every planned field against its value and rules, in parallel. */
export async function runValidationPlan(
	plan: ValidationPlan,
	{ registry, debounceScope }: Pick<ValidateFormValuesInput, 'registry' | 'debounceScope'>,
): Promise<FormValidationOutcome> {
	const results = await Promise.all(
		plan.fields.map(async ({ element, fieldPath, inheritedRequired }) => ({
			fieldPath,
			result: await validateFieldValue({
				element,
				value: getValueAtPath(plan.values, fieldPath),
				values: plan.values,
				constraintValues: plan.constraintValues,
				fieldPath,
				registry,
				debounceScope,
				inheritedRequired,
			}),
		})),
	);

	const issues: Record<string, readonly ValidationIssue[]> = {};
	const failures: Record<string, readonly FormValidationFailure[]> = {};
	const superseded: string[] = [];
	for (const { fieldPath, result } of results) {
		if (result.issues.length > 0) issues[fieldPath] = result.issues;
		if (result.failures.length > 0) failures[fieldPath] = result.failures;
		if (result.superseded) superseded.push(fieldPath);
	}
	return { issues, failures, superseded };
}

/**
 * Validates named fields and returns what each failed rule reported, by dotted path.
 *
 * @remarks
 * `names` limits validation to matching paths and their descendants, which lets callers validate a
 * wizard step without surfacing errors from later steps; `exactNames` limits it to the named paths
 * themselves. The results are flat so that a container and a row inside it can both fail: `contacts` and
 * `contacts.0.email` are separate keys. Paths that do not take part, see {@link resolveParticipation},
 * are not validated.
 */
export async function validateFormValues(input: ValidateFormValuesInput): Promise<FormValidationOutcome> {
	return runValidationPlan(planFormValidation(input), input);
}
