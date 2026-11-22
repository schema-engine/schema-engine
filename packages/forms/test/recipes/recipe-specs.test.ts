import { describe, expect, test, vi } from 'vitest';
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
import { buildViewModel, createViewNavigation, getSlotConfig, projectViewSteps } from '@/recipes/view-model';
import type { FormStepState } from '@/engine/step-machine';

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
		expect(cardSpec.schema.safeParse({ $type: 'card', shell: { appearance: { size: 'compact' } } }).success).toBe(
			true,
		);
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

const state = (id: string, extra: Partial<FormStepState> = {}): FormStepState => ({
	id,
	skipped: false,
	visited: false,
	complete: false,
	invalid: false,
	reachable: false,
	...extra,
});

describe('projectViewSteps', () => {
	test('projects the live state of each step, counting only the steps that are not skipped', () => {
		const steps = projectViewSteps(
			[{ id: 'one', title: 'One', description: 'First' }, { id: 'two' }, { id: 'three', title: 'Three' }],
			[
				state('one', { visited: true, complete: true }),
				state('two', { skipped: true }),
				state('three', { visited: true, invalid: true }),
			],
			'three',
		);

		expect(steps).toEqual([
			{
				id: 'one',
				title: 'One',
				description: 'First',
				index: 0,
				total: 2,
				isActive: false,
				isCompleted: true,
				isInvalid: false,
				isVisited: true,
			},
			{
				id: 'three',
				title: 'Three',
				description: undefined,
				index: 1,
				total: 2,
				isActive: true,
				isCompleted: false,
				isInvalid: true,
				isVisited: true,
			},
		]);
	});
});

describe('createViewNavigation', () => {
	const commands = { next: vi.fn(), back: vi.fn(), goTo: vi.fn() };
	const states = [state('one'), state('two', { skipped: true }), state('three')];

	test('derives first, last and what can be reached from the active steps', () => {
		expect(createViewNavigation(states, 'one', commands)).toMatchObject({
			canGoNext: true,
			canGoPrevious: false,
			isFirstStep: true,
			isLastStep: false,
		});
		expect(createViewNavigation(states, 'three', commands)).toMatchObject({
			canGoNext: false,
			canGoPrevious: true,
			isFirstStep: false,
			isLastStep: true,
		});
	});

	test('says which steps a stepper can go to from the runtime step state', () => {
		const all = [state('a', { reachable: true }), state('b'), state('c', { skipped: true }), state('d')];
		const navigation = createViewNavigation(all, 'b', commands);
		expect(['a', 'b', 'c', 'd', 'nowhere'].map((id) => navigation.canGoToStep(id))).toEqual([
			true,
			false,
			false,
			false,
			false,
		]);
	});

	test('forwards its commands to the runtime, with step ids', () => {
		const navigation = createViewNavigation(states, 'one', commands);
		navigation.goToStep('three');
		navigation.goToNextStep();
		navigation.goToPreviousStep();
		expect(commands.goTo).toHaveBeenCalledWith('three');
		expect(commands.next).toHaveBeenCalledOnce();
		expect(commands.back).toHaveBeenCalledOnce();
	});
});

describe('view model', () => {
	const navigation = createViewNavigation([], '', { next: vi.fn(), back: vi.fn(), goTo: vi.fn() });
	const config = {
		id: 'onboarding',
		steps: [
			{ id: 'one', title: 'One', elements: [] },
			{ id: 'two', title: 'Two', elements: [] },
			{ id: 'three', title: 'Three', elements: [] },
		],
	};

	test('lists the steps that are not skipped, with a stable index and total', () => {
		const model = buildViewModel({
			config,
			kind: 'wizard',
			states: [
				state('one', { visited: true }),
				state('two', { skipped: true }),
				state('three', { visited: true }),
			],
			current: 'three',
			navigation,
			viewConfig: { $type: 'wizard' },
		});

		expect(model.steps.map(({ id }) => id)).toEqual(['one', 'three']);
		expect(model.activeStep).toMatchObject({ id: 'three', index: 1, total: 2 });
		expect(model.currentStepIndex).toBe(1);
	});
});
describe('normalized slot defaults', () => {
	const engine = createFormEngine({ recipes: [defineFormRecipe(cardSpec, {})] });
	const steps = [{ id: 'main', title: 'Main', elements: [] }];

	test('fills slots the author omits from the slot schema defaults', () => {
		const form = engine.defineForm({ id: 'card', steps, view: { $type: 'card' } });
		expect(form.view?.shell).toEqual({});
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
		expect(properties.header.properties.titleAs.default).toBe('h2');
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

	test('getSlotConfig reads a slot extended with extra keys without parsing it', () => {
		const view = { shell: { maxWidth: 'lg', padding: 'md', shadowSize: 'md', accent: 'red' } };
		expect(getSlotConfig(view, 'shell', CardShellConfigSchema)).toMatchObject({ maxWidth: 'lg', accent: 'red' });
	});
});
