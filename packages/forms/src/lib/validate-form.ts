import type { FormConfig } from '@/schemas/form-config';
import type { RecipeRegistration } from '@/types';
import { validateRegistrationConfig } from '@/lib/standard-schema';

export const DEFAULT_WIZARD_RECIPE = 'bare-controls';

export class FormValidationError extends Error {
	constructor(
		message: string,
		public readonly issues: string[] = [],
	) {
		super(message);
		this.name = 'FormValidationError';
	}
}

export interface ValidateFormOptions {
	getRecipe: (id: string) => RecipeRegistration<any, any> | undefined;
	parseFormConfig: (config: unknown) => FormConfig;
}

export function resolveFormRecipe(
	config: FormConfig,
	getRecipe?: (id: string) => RecipeRegistration<any, any> | undefined,
): RecipeRegistration<any, any> | undefined {
	const requestedType = config.view?.$type;
	if (requestedType) {
		if (!getRecipe) {
			throw new Error(`Form '${config.id}' uses view '${requestedType}' but no FormEngine was supplied.`);
		}
		const recipe = getRecipe(requestedType);
		if (!recipe) {
			throw new Error(`Unknown view recipe '${requestedType}'. Register it with FormComposer.addRecipe().`);
		}
		return recipe;
	}

	return config.steps.length > 1 ? getRecipe?.(DEFAULT_WIZARD_RECIPE) : undefined;
}

export function resolveValidatedConfig(
	config: FormConfig,
	engine?: { validateForm: (config: unknown) => FormConfig },
): FormConfig {
	if (engine) return engine.validateForm(config);
	if (config.view) {
		throw new Error(`Form '${config.id}' uses view '${config.view.$type}' but no FormEngine was supplied.`);
	}
	return config;
}

function validateView(config: FormConfig, getRecipe: ValidateFormOptions['getRecipe']): string[] {
	const issues: string[] = [];
	const stepCount = config.steps.length;

	if (!config.view) {
		if (stepCount === 0) {
			issues.push('Form must have at least one step.');
		}
		return issues;
	}

	const view = config.view as Record<string, unknown>;
	const recipeType = view.$type;

	if (typeof recipeType !== 'string' || !recipeType) {
		issues.push('view.$type must be a non-empty string.');
		return issues;
	}

	const recipe = getRecipe(recipeType);

	if (!recipe) {
		issues.push(`Unknown view recipe '${recipeType}'. Register it with FormComposer.addRecipe().`);
		return issues;
	}

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

	try {
		validateRegistrationConfig(recipe.schema, view);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Invalid view configuration for recipe '${recipeType}': ${message}`);
	}

	const allowedSlots = new Set(recipe.slots);
	const reservedKeys = new Set(['$type']);

	// The recipe schema is authoritative for registered schemas; this loop also
	// protects custom non-strict schemas and gives authors a slot-specific error.
	for (const key of Object.keys(view)) {
		if (reservedKeys.has(key)) continue;
		if (!allowedSlots.has(key as (typeof recipe.slots)[number])) {
			issues.push(
				`Recipe '${recipeType}' does not accept view key '${key}'. Allowed: ${[...allowedSlots].join(', ') || '(none)'}.`,
			);
		}
	}

	return issues;
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): FormConfig {
	const issues: string[] = [];

	let parsed: FormConfig;
	try {
		parsed = options.parseFormConfig(config);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new FormValidationError(`Invalid form configuration: ${message}`, [message]);
	}

	issues.push(...validateView(parsed, options.getRecipe));

	if (issues.length > 0) {
		throw new FormValidationError(issues[0] ?? 'Invalid form configuration', issues);
	}

	return parsed;
}
