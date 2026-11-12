import { describe, expect, test } from 'vitest';
import { defineRecipeSpec } from '@/recipes/define-recipe-spec';
import { cardSpec, wizardSpec, builtInRecipeSpecs } from '@/recipes/built-in-specs';
import { FormActionsConfigSchema, StepHeaderConfigSchema, WizardActionsConfigSchema } from '@/recipes/slot-schemas';
import { applySlotDefaults, buildViewModel } from '@/recipes/view-model';
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

describe('view model', () => {
	test('applies slot defaults under author overrides', () => {
		const view = applySlotDefaults(
			{ $type: 'card', header: { size: 'lg' } },
			{ header: { align: 'center', size: 'md' } },
		);
		expect(view.header).toEqual({ align: 'center', size: 'lg' });
	});

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
