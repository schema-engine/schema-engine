import { afterEach, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createRoot } from '@ecopages/jsx/client';
import { createInitialStepStates } from '@schema-engine/forms/engine';
import { StepIndicatorsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StepIndicatorsElement } from '@/components/blocks/step-indicators';
import { FormController } from '@/adapters/radiant/controller';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { deriveInitialInstance, type FormMeta } from '@/lib/instance-view';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

async function mountArray() {
	const host = document.createElement('div');
	document.body.append(host);
	const config = {
		id: 'rows',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						name: 'contacts',
						label: 'Contacts',
						defaultValue: ['a', 'b', 'c'],
						elements: [{ $type: 'input', name: 'item', label: 'Item' }],
					},
				],
			},
		],
	};
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelectorAll('.se-form-array__item')).toHaveLength(3);
	const arrayHost = host.querySelector('se-form-array') as HTMLElement;
	const form = new FormController(arrayHost);
	await expect.poll(() => form.ready).toBe(true);
	return { host, form };
}

function rowsById(host: HTMLElement) {
	return new Map(
		[...host.querySelectorAll<HTMLElement>('.se-form-array__item')].map((row) => [
			row.getAttribute('data-se-row-id') ?? '',
			row,
		]),
	);
}

function inputOf(row: HTMLElement) {
	return row.querySelector<HTMLInputElement>('input')!;
}

test('adding, removing and reordering array rows keeps the other rows, their values and focus', async () => {
	const { host, form } = await mountArray();
	const array = form.fieldArray('contacts');
	const initial = rowsById(host);
	const [idA, idB, idC] = [...initial.keys()];
	const inputs = new Map([...initial].map(([id, row]) => [id, inputOf(row)]));
	inputs.get(idC!)!.focus();

	array.append('d');
	await expect.poll(() => host.querySelectorAll('.se-form-array__item')).toHaveLength(4);
	let rows = rowsById(host);
	for (const id of [idA!, idB!, idC!]) {
		expect(rows.get(id)).toBe(initial.get(id));
		expect(inputOf(rows.get(id)!)).toBe(inputs.get(id));
	}
	expect(document.activeElement).toBe(inputs.get(idC!));

	array.remove(0);
	await expect.poll(() => host.querySelectorAll('.se-form-array__item')).toHaveLength(3);
	rows = rowsById(host);
	expect(rows.has(idA!)).toBe(false);
	for (const id of [idB!, idC!]) {
		expect(rows.get(id)).toBe(initial.get(id));
		expect(inputOf(rows.get(id)!)).toBe(inputs.get(id));
	}
	expect([...host.querySelectorAll('input')].map((input) => input.value)).toEqual(['b', 'c', 'd']);
	expect(document.activeElement).toBe(inputs.get(idC!));

	array.swap(0, 1);
	await expect.poll(() => [...host.querySelectorAll('input')].map((input) => input.value)).toEqual(['c', 'b', 'd']);
	rows = rowsById(host);
	for (const id of [idB!, idC!]) expect(rows.get(id)).toBe(initial.get(id));
	expect([...host.querySelectorAll<HTMLElement>('.se-form-array__remove')].map((b) => b.ariaLabel)).toEqual([
		'Remove item 1',
		'Remove item 2',
		'Remove item 3',
	]);
});

test('adding a row does not touch the rows already rendered', async () => {
	const { host, form } = await mountArray();
	const records: MutationRecord[] = [];
	const observer = new MutationObserver((batch) => records.push(...batch));
	for (const row of rowsById(host).values()) {
		observer.observe(row, { subtree: true, childList: true, attributes: true, characterData: true });
	}
	form.fieldArray('contacts').append('d');
	await expect.poll(() => host.querySelectorAll('.se-form-array__item')).toHaveLength(4);
	await new Promise((resolve) => setTimeout(resolve, 50));
	observer.disconnect();
	const rowOwned = records.filter(
		({ target }) => !(target as Element).matches('.rui-input, .rui-label, .rui-field__error'),
	);
	expect(
		rowOwned.map(({ target, type, attributeName }) => `${(target as Element).tagName}:${type}:${attributeName}`),
	).toEqual([]);
});

test('typing into a row survives a sibling being added', async () => {
	const { host, form } = await mountArray();
	const first = inputOf([...rowsById(host).values()][0]!);
	first.focus();
	first.value = 'typed';
	first.dispatchEvent(new Event('input', { bubbles: true }));
	form.fieldArray('contacts').append('d');
	await expect.poll(() => host.querySelectorAll('.se-form-array__item')).toHaveLength(4);
	expect(inputOf([...rowsById(host).values()][0]!)).toBe(first);
	expect(first.value).toBe('typed');
	expect(document.activeElement).toBe(first);
});

function createMeta(titles: string[]): FormMeta {
	return { id: 'wizard', steps: titles.map((title, index) => ({ id: `step-${index}`, title })) };
}

function instanceAt(meta: FormMeta, currentStep: number) {
	return {
		...deriveInitialInstance(meta),
		currentStep,
		stepStates: {
			...createInitialStepStates(meta.steps.length),
			completed: meta.steps.map((_, index) => index < currentStep),
			visited: meta.steps.map((_, index) => index <= currentStep),
		},
	};
}

test('navigating a wizard keeps the step indicator nodes and only changes their state attributes', async () => {
	const meta = createMeta(['One', 'Two', 'Three']);
	const element = new StepIndicatorsElement();
	element.meta = meta;
	element.slotConfig = z.parse(StepIndicatorsConfigSchema, {});
	Reflect.set(element, 'instance', instanceAt(meta, 0));
	document.body.append(element);
	await expect.poll(() => element.querySelectorAll('.se-step-indicators__item')).toHaveLength(3);
	const items = [...element.querySelectorAll('.se-step-indicators__item')];
	const buttons = items.map((item) => item.querySelector('button')!);
	expect(buttons[0]?.getAttribute('aria-current')).toBe('step');

	const records: MutationRecord[] = [];
	const observer = new MutationObserver((batch) => records.push(...batch));
	observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });
	Reflect.set(element, 'instance', instanceAt(meta, 1));
	element.requestUpdate();
	await expect.poll(() => buttons[1]?.getAttribute('aria-current')).toBe('step');
	await new Promise((resolve) => setTimeout(resolve, 50));
	observer.disconnect();
	const structural = records.filter(
		(record) => record.type === 'childList' && (record.target as Element).matches('ol, li'),
	);
	expect(structural).toEqual([]);
	expect([...element.querySelectorAll('.se-step-indicators__item')]).toEqual(items);
	expect(items.map((item) => item.querySelector('button'))).toEqual(buttons);
	expect(buttons[0]?.hasAttribute('aria-current')).toBe(false);
	expect(buttons[0]?.dataset.completed).toBeDefined();
});
