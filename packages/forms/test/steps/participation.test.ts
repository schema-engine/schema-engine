import { describe, expect, test } from 'vitest';
import { createDebounceScope } from '@/lib/debounce';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import { selectFieldState } from '@/state-container/selectors';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import {
	collectStepFieldPaths,
	resolveParticipation,
	validateFormValues,
	type ValidationStep,
} from '@/engine/value-validation';

const registry = createDefaultValidationRegistry();
const element = (config: Record<string, unknown>) => markNormalizedElementConfig(config as unknown as ElementConfig);
const input = (name: string, extra: Record<string, unknown> = {}) => element({ $type: 'input', name, ...extra });
const when = (field: string, value: unknown, action: 'show' | 'hide' | 'require') => ({
	field,
	operator: 'equals' as const,
	value,
	action,
});

/** hasCompany decides the company step; the company step's `wantsInvoice` decides the payment step's `vat`. */
const wizard = (): ValidationStep[] => [
	{ id: 'contact', elements: [input('hasCompany'), input('note')] },
	{
		id: 'company',
		constraints: [when('hasCompany', true, 'show')],
		elements: [input('wantsInvoice'), input('company', { rules: [{ type: 'required' }] })],
	},
	{
		id: 'payment',
		elements: [
			input('vat', { constraints: [when('wantsInvoice', 'yes', 'show')], rules: [{ type: 'required' }] }),
			input('iban', { constraints: [when('wantsInvoice', 'yes', 'require')] }),
		],
	},
];

describe('resolveParticipation', () => {
	test('a step its constraints hide is skipped, and its fields take no part', () => {
		const result = resolveParticipation(wizard(), { hasCompany: false, wantsInvoice: '', company: '' });
		expect(result.skippedSteps).toEqual(['company']);
		expect(result.excluded).toEqual(expect.arrayContaining(['wantsInvoice', 'company']));
	});

	test('a step its constraints show is active, and a hide constraint skips it the other way round', () => {
		expect(resolveParticipation(wizard(), { hasCompany: true }).skippedSteps).toEqual([]);
		const steps: ValidationStep[] = [
			{ id: 'a', elements: [input('x')] },
			{ id: 'b', constraints: [when('x', 'skip', 'hide')], elements: [input('y')] },
		];
		expect(resolveParticipation(steps, { x: 'skip' }).skippedSteps).toEqual(['b']);
		expect(resolveParticipation(steps, { x: 'go' }).skippedSteps).toEqual([]);
	});

	test('the value of a skipped step is absent for a later field constraint', () => {
		const held = { hasCompany: false, wantsInvoice: 'yes', vat: '' };
		const result = resolveParticipation(wizard(), held);
		expect(result.excluded).toContain('vat');
		expect(result.fields.vat).toMatchObject({ hidden: true });
		expect(resolveParticipation(wizard(), { ...held, hasCompany: true }).excluded).not.toContain('vat');
	});

	test('the value of a skipped step is absent for a later step constraint', () => {
		const steps: ValidationStep[] = [
			{ id: 'a', elements: [input('x')] },
			{ id: 'b', constraints: [when('x', 'on', 'show')], elements: [input('y')] },
			{ id: 'c', constraints: [when('y', 'yes', 'show')], elements: [input('z')] },
		];
		const result = resolveParticipation(steps, { x: 'off', y: 'yes', z: '' });
		expect(result.skippedSteps).toEqual(['b', 'c']);
	});

	test('the value of a hidden field is absent for a later constraint, in document order', () => {
		const steps: ValidationStep[] = [
			{
				id: 'only',
				elements: [
					input('kind'),
					input('detail', { constraints: [when('kind', 'business', 'show')] }),
					input('followUp', { constraints: [when('detail', 'yes', 'show')] }),
				],
			},
		];
		const hidden = resolveParticipation(steps, { kind: 'person', detail: 'yes', followUp: '' });
		expect(hidden.excluded).toEqual(['detail', 'followUp']);
		const shown = resolveParticipation(steps, { kind: 'business', detail: 'yes', followUp: '' });
		expect(shown.excluded).toEqual([]);
	});

	test('a constraint reads the raw value of a field not yet resolved', () => {
		const steps: ValidationStep[] = [
			{
				id: 'only',
				elements: [
					input('early', { constraints: [when('late', 'yes', 'show')] }),
					input('gate'),
					input('late', { constraints: [when('gate', 'open', 'show')] }),
				],
			},
		];
		expect(resolveParticipation(steps, { early: '', gate: 'closed', late: 'yes' }).excluded).toEqual(['late']);
	});

	test('a skipped step leaves its values in the held values and takes its fields out of the step paths used to validate', () => {
		const steps = wizard();
		expect(collectStepFieldPaths(steps[1], { wantsInvoice: 'yes' })).toEqual(['wantsInvoice', 'company']);
	});
});

const validate = async (values: Record<string, unknown>) => {
	const steps = wizard();
	const { issues } = await validateFormValues({
		steps,
		values,
		registry,
		debounceScope: createDebounceScope(),
	});
	return Object.keys(issues).toSorted();
};

describe('validation with skipped steps', () => {
	test('does not validate the fields of a skipped step', async () => {
		expect(await validate({ hasCompany: false, wantsInvoice: '', company: '', vat: '', iban: '' })).toEqual([]);
		expect(await validate({ hasCompany: true, wantsInvoice: '', company: '', vat: '', iban: '' })).toEqual([
			'company',
		]);
	});

	test('a require constraint does not read the value of a skipped step', async () => {
		const held = { hasCompany: false, wantsInvoice: 'yes', company: '', vat: '', iban: '' };
		expect(await validate(held)).toEqual([]);
		expect(await validate({ ...held, hasCompany: true })).toEqual(['company', 'iban', 'vat']);
	});
});

const make = (defaults: Record<string, unknown>) =>
	createFormStateContainer({
		config: { steps: wizard(), validationMode: 'onSubmit', reValidateMode: 'onChange' },
		registry,
		defaults,
	});

describe('the container with skipped steps', () => {
	const held = { hasCompany: false, note: '', wantsInvoice: 'yes', company: '', vat: '', iban: '' };

	test('validate and checkValidity pass although a skipped step holds an empty required field', async () => {
		const container = make(held);
		expect(await container.checkValidity()).toBe(true);
		expect(await container.validate()).toEqual({ outcome: 'passed' });
		expect(container.getSnapshot().errors).toEqual({});
	});

	test('a skipped step is validated again once its constraints show it', async () => {
		const container = make(held);
		container.setValue('hasCompany', true);
		expect(await container.checkValidity()).toBe(false);
		expect(await container.validate(['company'])).toEqual({ outcome: 'invalid' });
		expect(Object.keys(container.getSnapshot().errors)).toContain('company');
		container.setValue('hasCompany', false);
		expect(container.getSnapshot().errors).toEqual({});
	});

	test('the submitted values leave out a skipped step and what only it kept shown, while the held values stay', async () => {
		const container = make({ ...held, note: 'hi' });
		const result = await container.submit();
		expect(result.outcome).toBe('passed');
		if (result.outcome !== 'passed') return;
		expect(result.values).toEqual({ hasCompany: false, note: 'hi', iban: '' });
		expect(container.getSnapshot().values).toMatchObject({ wantsInvoice: 'yes', company: '' });
		container.setValue('hasCompany', true);
		container.setValue('company', 'Acme');
		container.setValue('vat', 'V1');
		container.setValue('iban', 'I1');
		const again = await container.submit();
		expect(again.outcome).toBe('passed');
		if (again.outcome !== 'passed') return;
		expect(again.values).toMatchObject({ company: 'Acme', wantsInvoice: 'yes', vat: 'V1', iban: 'I1' });
	});
});

describe('one ordered evaluation of show, disable and require', () => {
	test('require reads the same progressive values as show: both see a later field as held, and an earlier excluded one as absent', () => {
		const steps: ValidationStep[] = [
			{
				id: 'only',
				elements: [
					input('needs', { constraints: [when('late', 'yes', 'require')] }),
					input('shown', { constraints: [when('late', 'yes', 'show')] }),
					input('gate'),
					input('late', { constraints: [when('gate', 'open', 'show')] }),
					input('afterLate', { constraints: [when('late', 'yes', 'require')] }),
				],
			},
		];
		const { fields, excluded } = resolveParticipation(steps, { gate: 'closed', late: 'yes' });
		expect(excluded).toEqual(['late']);
		expect(fields.needs?.required).toBe(true);
		expect(fields.shown?.hidden).toBe(false);
		expect(fields.afterLate?.required).toBe(false);
	});

	test('a require constraint of a container reaches the fields in it, and a hidden or disabled container takes them with it', async () => {
		const container = createFormStateContainer({
			config: {
				validationMode: 'onSubmit',
				reValidateMode: 'onChange',
				steps: [
					{
						id: 'a',
						elements: [
							input('kind'),
							element({
								$type: 'fieldset',
								name: 'company',
								constraints: [when('kind', 'business', 'require'), when('kind', 'ghost', 'hide')],
								elements: [{ $type: 'input', name: 'vat' }],
							}),
						],
					},
				],
			},
			registry,
			defaults: { kind: 'person', company: { vat: '' } },
		});
		expect(selectFieldState(container.getSnapshot(), 'company.vat')).toMatchObject({ required: false });
		container.setValue('kind', 'business');
		expect(selectFieldState(container.getSnapshot(), 'company.vat')).toMatchObject({
			required: true,
			hidden: false,
		});
		container.setValue('kind', 'ghost');
		expect(selectFieldState(container.getSnapshot(), 'company.vat')).toMatchObject({ hidden: true });
	});

	test('a field of a skipped step is hidden, and the snapshot lists the skipped step, with the same object while nothing changed', () => {
		const container = make({ hasCompany: false, note: '', wantsInvoice: 'no', company: '', vat: '', iban: '' });
		const before = container.getSnapshot().participation;
		expect(before.skippedSteps).toEqual(['company']);
		expect(selectFieldState(container.getSnapshot(), 'company')).toMatchObject({ hidden: true });
		container.setValue('note', 'x');
		expect(container.getSnapshot().participation).toBe(before);
		container.setValue('hasCompany', true);
		expect(container.getSnapshot().participation.skippedSteps).toEqual([]);
	});
});
