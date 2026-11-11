import { describe, expect, test } from 'vitest';
import { defineRecipeSpec } from '@/recipes/define-recipe-spec';
import { cardSpec, wizardSpec, builtInRecipeSpecs } from '@/recipes/built-in-specs';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe } from '@/recipes/define-form-recipe';
import {
	CardShellConfigSchema,
	FormActionsConfigSchema,
	StepHeaderConfigSchema,
	WizardActionsConfigSchema,
} from '@/recipes/slot-schemas';
import { buildViewModel, buildViewSteps, getSlotConfig } from '@/recipes/view-model';
import { createInitialStepStates } from '@/engine/step-machine';

describe('defineRecipeSpec', () => {
	test('rejects wizard recipes without actions', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'invalid-wizard',
				kind: 'wizard',
				metadata: { name: 'Invalid', description: 'Missing actions' },
				slotSchemas: { header: StepHeaderConfigSchema },
			}),
		).toThrow(/actions slot/i);
	});

	test('rejects progress on single-step recipes', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'invalid-card',
				kind: 'single-step',
				metadata: { name: 'Invalid', description: 'Has progress' },
				slotSchemas: { progress: WizardActionsConfigSchema },
			}),
		).toThrow(/progress slot/i);
	});

	test('allows actions on single-step recipes', () => {
		expect(() =>
			defineRecipeSpec({
				$type: 'single-step-actions',
				kind: 'single-step',
				metadata: { name: 'Actions', description: 'Has actions' },
				slotSchemas: { actions: FormActionsConfigSchema },
			}),
		).not.toThrow();
	});

	test('omits empty shell slots from the view schema', () => {
		expect(wizardSpec.slots).toEqual(['header', 'progress', 'actions']);
		expect(wizardSpec.schema.safeParse({ $type: 'wizard', shell: {} }).success).toBe(false);
	});
});

describe('defineRecipeSpec slotDefaults', () => {
	const base = {
		$type: 'defaults',
		kind: 'single-step',
		metadata: { name: 'Defaults' },
		slotSchemas: { header: StepHeaderConfigSchema },
	} as const;

	test('fails at definition naming the recipe, slot and key', () => {
		expect(() =>
			defineRecipeSpec({
				...base,
				// @ts-expect-error -- 'befor' is not a counterPlacement value
				slotDefaults: { header: { counterPlacement: 'befor' } },
			}),
		).toThrow(/'defaults' slotDefaults\.header.*counterPlacement/);
	});

	test('fails on an unknown key in a declared slot', () => {
		expect(() =>
			defineRecipeSpec({
				...base,
				// @ts-expect-error -- 'sizee' is not a header key
				slotDefaults: { header: { sizee: 'sm' } },
			}),
		).toThrow(/'defaults' slotDefaults\.header.*sizee/);
	});

	test('fails on a default for an undeclared slot', () => {
		expect(() =>
			defineRecipeSpec({
				...base,
				// @ts-expect-error -- the recipe declares no progress slot
				slotDefaults: { progress: {} },
			}),
		).toThrow(/slotDefaults\.progress.*does not declare/);
	});

	test('accepts a valid partial default', () => {
		const spec = defineRecipeSpec({ ...base, slotDefaults: { header: { counterPlacement: 'before' } } });
		expect(spec.slotDefaults).toEqual({ header: { counterPlacement: 'before' } });
	});
});

describe('built-in recipe specs', () => {
	test('declare unique $type values', () => {
		const types = Object.values(builtInRecipeSpecs).map((spec) => spec.$type);
		expect(new Set(types).size).toBe(types.length);
	});

	test('card schema accepts shell config without nested $type', () => {
		expect(cardSpec.schema.safeParse({ $type: 'card', shell: { padding: 'md' } }).success).toBe(true);
		expect(cardSpec.schema.safeParse({ $type: 'card', shell: { $type: 'card' } }).success).toBe(false);
	});

	test('sidebar wizard accepts optional shell separator', () => {
		expect(builtInRecipeSpecs['sidebar-wizard'].slots).toContain('shell');
		expect(builtInRecipeSpecs['sidebar-wizard'].schema.safeParse({ $type: 'sidebar-wizard' }).success).toBe(true);
		expect(
			builtInRecipeSpecs['sidebar-wizard'].schema.safeParse({
				$type: 'sidebar-wizard',
				shell: { showSeparator: false },
			}).success,
		).toBe(true);
	});
});

describe('buildViewSteps', () => {
	test('projects active, completed, valid and visited flags per step', () => {
		const steps = buildViewSteps(
			[{ id: 'one', title: 'One', description: 'First' }, { id: 'two' }, { id: 'three', title: 'Three' }],
			1,
			{ completed: [true, false, false], valid: [true, true, false], visited: [true, true, false] },
		);

		expect(steps).toEqual([
			{
				id: 'one',
				title: 'One',
				description: 'First',
				index: 0,
				total: 3,
				isActive: false,
				isCompleted: true,
				isValid: true,
				isVisited: true,
			},
			{
				id: 'two',
				title: undefined,
				description: undefined,
				index: 1,
				total: 3,
				isActive: true,
				isCompleted: false,
				isValid: true,
				isVisited: true,
			},
			{
				id: 'three',
				title: 'Three',
				description: undefined,
				index: 2,
				total: 3,
				isActive: false,
				isCompleted: false,
				isValid: false,
				isVisited: false,
			},
		]);
	});
});

describe('view model', () => {
	test('builds steps with stable index and total', () => {
		const model = buildViewModel({
			config: {
				id: 'onboarding',
				steps: [
					{ id: 'one', title: 'One', elements: [] },
					{ id: 'two', title: 'Two', elements: [] },
				],
			},
			kind: 'wizard',
			currentStepIndex: 1,
			navigation: {
				canGoNext: false,
				canGoPrevious: true,
				isFirstStep: false,
				isLastStep: true,
				goToStep: () => undefined,
				goToNextStep: () => undefined,
				goToPreviousStep: () => undefined,
			},
			viewConfig: { $type: 'wizard' },
			stepStates: createInitialStepStates(2),
		});

		expect(model.activeStep.index).toBe(1);
		expect(model.activeStep.total).toBe(2);
		expect(model.steps).toHaveLength(2);
	});
});

describe('normalized slot defaults', () => {
	const engine = createFormEngine({ recipes: [defineFormRecipe(cardSpec, {})] });
	const steps = [{ id: 'main', title: 'Main', elements: [] }];

	test('fills slots the author omits from the slot schema defaults', () => {
		const form = engine.defineForm({ id: 'card', steps, view: { $type: 'card' } });
		expect(form.view?.shell).toEqual({ maxWidth: 'md', padding: 'md', shadowSize: 'md' });
		expect(form.view?.actions).toEqual({
			labels: { submit: 'Submit', submitAriaLabel: 'Submit form', submitting: 'Submitting...' },
			align: 'end',
		});
	});

	test('layers author keys over recipe defaults over schema defaults', () => {
		const form = engine.defineForm({ id: 'card', steps, view: { $type: 'card', header: { size: 'lg' } } });
		expect(form.view?.header).toMatchObject({ size: 'lg', align: 'center', titleAs: 'h2' });
	});

	test('shows the defaults in the view JSON Schema', () => {
		const viewSchema = engine.describeRecipe('card').viewSchema as {
			$defs: Record<
				string,
				{ properties: Record<string, { properties: Record<string, { default?: unknown }> }> }
			>;
		};
		const properties = viewSchema.$defs['recipe:card'].properties;
		expect(properties.shell.properties.maxWidth.default).toBe('md');
		expect(properties.actions.properties.align.default).toBe('end');
	});

	test('lists only $type as required in the authoring view JSON Schema', () => {
		const viewSchema = engine.describeRecipe('card').viewSchema as {
			$defs: Record<string, { required?: string[]; properties: Record<string, { required?: string[] }> }>;
		};
		const recipeSchema = viewSchema.$defs['recipe:card'];
		expect(recipeSchema.required).toEqual(['$type']);
		expect(recipeSchema.properties.shell.required ?? []).not.toContain('maxWidth');
	});

	test('getSlotConfig completes a view that was not normalized', () => {
		expect(getSlotConfig({}, 'shell', CardShellConfigSchema)).toEqual({
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'md',
		});
	});
});
