import { evaluateConstraints } from '../constraints/constraint-evaluator.js';
import { expandContainerParentPaths, expandFieldTemplatePaths, getValueAtPath } from '../lib/path-values.js';
import { walkNamedElements } from '../lib/field-scope.js';
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
import * as z from 'zod/mini';

export interface ValidationElement {
	readonly name?: string;
	readonly id?: string;
	readonly elements?: readonly ValidationElement[];
	readonly $type?: string;
	readonly rules?: readonly BaseValidationRule[];
	readonly constraints?: readonly ConstraintLogic[];
}
export type ValidationElementTree = ReadonlyArray<ValidationElement>;
export interface ValidationStep {
	readonly elements: readonly ValidationElement[];
}

export interface EffectiveRulesInput {
	element: ValidationElement;
	fieldPath: string;
	values: Record<string, unknown>;
	registry: ValidationRegistry;
	/** Set when a `require` constraint of a container around the field holds. */
	inheritedRequired?: boolean;
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
	 * Skips a field a `show` or `hide` constraint hides, and every field inside a hidden container.
	 *
	 * @remarks
	 * Renderers validate only the fields they render, so a caller that validates the whole form without
	 * naming fields sets this to agree with what a submission checks.
	 */
	skipHidden?: boolean;
}

export interface FieldValidationError {
	readonly type: 'validation';
	readonly message: string;
}

/** The errors a validation found, by the dotted path of the field that failed; a container has its own. */
export type FormValidationErrors = Record<string, FieldValidationError>;

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
	return walkNamedElements(elements).flatMap(({ path, element, hasChildren, arrayItemDepth }) => {
		const paths = arrayItemDepth
			? expandArrayItemPaths(values, path, arrayItemDepth)
			: hasChildren
				? expandContainerTemplatePaths(values, path)
				: expandFieldTemplatePaths(values, path);
		return paths.map((fieldPath) => ({ element, fieldPath, hasChildren }));
	});
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
}: EffectiveRulesInput): BaseValidationRule[] {
	const rules = getValidationRulesForElement<BaseValidationRule>(element, registry) ?? [];
	const isRequired = evaluateConstraints({
		constraints: element.constraints,
		values,
		fieldPath,
		baseRequired: isFieldRequired(rules) || inheritedRequired,
	}).isRequired;

	if (!isRequired || isFieldRequired(rules)) {
		return [...rules];
	}

	const requiredRule: RequiredRule = { type: 'required' };
	return [requiredRule, ...rules];
}

/**
 * Validates one field value and returns its first validation message when invalid.
 */
export async function validateFieldValue({
	element,
	value,
	values,
	fieldPath,
	registry,
	debounceScope,
	inheritedRequired,
}: ValidateFieldValueInput): Promise<string | undefined> {
	const rules = effectiveRulesFor({ element, values, fieldPath, registry, inheritedRequired });
	if (rules.length === 0) {
		return undefined;
	}

	try {
		const context = createValidationContext({
			values,
			fieldPath,
			debounceScope,
		});
		const schema = createZodSchemaFromRules(rules, context, registry);
		const result = await z.safeParseAsync(schema, value);
		return result.success ? undefined : result.error.issues[0]?.message || 'Validation failed';
	} catch {
		return 'Validation failed';
	}
}

/**
 * Validates named fields and returns their errors by dotted path.
 *
 * @remarks
 * `names` limits validation to matching paths and their descendants, which lets
 * callers validate a wizard step without surfacing errors from later steps;
 * `exactNames` limits it to the named paths themselves. The errors are flat so that
 * a container and a row inside it can both fail: `contacts` and `contacts.0.email`
 * are separate keys.
 *
 * A field inside a container (fieldset or array) whose `require` constraint
 * holds is required, at any depth. The container's own `required` rule does not
 * pass down.
 */
export async function validateFormValues({
	elements,
	values,
	registry,
	names,
	exactNames = false,
	debounceScope,
	skipHidden = false,
}: ValidateFormValuesInput): Promise<FormValidationErrors> {
	const allFields = fieldElementPathsFor(elements, values);
	const hiddenPaths = skipHidden
		? allFields
				.filter(
					({ element, fieldPath }) =>
						!evaluateConstraints({ constraints: element.constraints, values, fieldPath }).shouldShow,
				)
				.map(({ fieldPath }) => fieldPath)
		: [];
	const isHidden = (fieldPath: string) =>
		hiddenPaths.some((hidden) => fieldPath === hidden || fieldPath.startsWith(`${hidden}.`));
	const requiredContainers = allFields
		.filter(
			({ element, fieldPath, hasChildren }) =>
				hasChildren && evaluateConstraints({ constraints: element.constraints, values, fieldPath }).isRequired,
		)
		.map(({ fieldPath }) => `${fieldPath}.`);
	const fields = allFields.filter(
		({ fieldPath }) => pathIsRequested(fieldPath, names, exactNames) && !isHidden(fieldPath),
	);
	const messages = await Promise.all(
		fields.map(async ({ element, fieldPath, hasChildren }) => ({
			fieldPath,
			message: await validateFieldValue({
				element,
				value: getValueAtPath(values, fieldPath),
				values,
				fieldPath,
				registry,
				debounceScope,
				inheritedRequired: !hasChildren && requiredContainers.some((prefix) => fieldPath.startsWith(prefix)),
			}),
		})),
	);

	const errors: FormValidationErrors = {};
	for (const { fieldPath, message } of messages) {
		if (message) {
			errors[fieldPath] = { type: 'validation', message };
		}
	}

	return errors;
}
