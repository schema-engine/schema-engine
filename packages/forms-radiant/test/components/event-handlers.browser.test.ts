import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx/client';
import type { FormInstanceElement } from '@/components/form-instance.script';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { CardRecipe, WizardRecipe } from '@/recipes';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	recipes: [CardRecipe, WizardRecipe],
});

const text = (name: string) => ({ $type: 'input', inputType: 'text', id: name, name, label: name }) as const;

async function mount(config: Record<string, unknown>, onSubmit: () => void = () => {}) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine, onSubmit }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	return host;
}

const rows = (host: Element) => host.querySelectorAll(':scope > .se-form-array > .se-form-array__item');

test('adding a row to a nested array leaves the outer array alone', async () => {
	const host = await mount({
		id: 'nested',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						minItems: 1,
						elements: [
							text('name'),
							{
								$type: 'arrayElements',
								id: 'phones',
								name: 'phones',
								minItems: 1,
								elements: [text('number')],
							},
						],
					},
				],
			},
		],
	});
	const outer = host.querySelector('se-form-array')!;
	await expect.poll(() => rows(outer).length).toBe(1);
	const inner = outer.querySelector('se-form-array')!;
	await expect.poll(() => rows(inner).length).toBe(1);

	inner.querySelector<HTMLButtonElement>('.se-form-array__add')!.click();

	await expect.poll(() => rows(inner).length).toBe(2);
	expect(rows(outer).length).toBe(1);

	inner.querySelector<HTMLButtonElement>('.se-form-array__remove')!.click();
	await expect.poll(() => rows(inner).length).toBe(1);
	expect(rows(outer).length).toBe(1);

	outer.querySelector<HTMLButtonElement>(':scope > .se-form-array > .se-form-array__add')!.click();
	await expect.poll(() => rows(outer).length).toBe(2);
	outer
		.querySelector<HTMLButtonElement>(':scope > .se-form-array > .se-form-array__item > .se-form-array__remove')!
		.click();
	await expect.poll(() => rows(outer).length).toBe(1);
});

test('Enter on an early wizard step does not submit and shows no errors on later steps', async () => {
	let submitted = 0;
	const host = await mount(
		{
			id: 'wizard',
			view: { $type: 'wizard' },
			steps: [
				{ id: 'one', title: 'One', elements: [text('first')] },
				{ id: 'two', title: 'Two', elements: [{ ...text('second'), rules: [{ $type: 'required' }] }] },
				{ id: 'three', title: 'Three', elements: [text('third')] },
			],
		},
		() => submitted++,
	);
	const form = host.querySelector('rui-form')!;
	let invalid = 0;
	form.addEventListener('se-action-submit-invalid', () => invalid++);
	await expect.poll(() => host.querySelector('se-wizard-actions button')).toBeTruthy();
	expect(form.querySelector('button[type="submit"]')).toBeNull();

	const input = form.querySelector<HTMLInputElement>('input[name="first"]')!;
	await userEvent.click(input);
	await userEvent.keyboard('{Enter}');
	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(submitted).toBe(0);
	expect(invalid).toBe(0);
});

test('Enter in the only text input of a wizard goes to the next step instead of submitting', async () => {
	let submitted = 0;
	const host = await mount(
		{
			id: 'single-input-wizard',
			view: { $type: 'wizard' },
			steps: [
				{ id: 'one', title: 'One', elements: [text('only')] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		},
		() => submitted++,
	);
	const form = host.querySelector('rui-form')!;
	const instance = host.querySelector<FormInstanceElement>('se-form-instance')!;
	let invalid = 0;
	form.addEventListener('se-action-submit-invalid', () => invalid++);
	await expect.poll(() => host.querySelector('se-wizard-actions button')).toBeTruthy();

	await userEvent.click(form.querySelector<HTMLInputElement>('input[name="only"]')!);
	await userEvent.keyboard('{Enter}');

	await expect
		.poll(() => instance.getContextValue().steps.findIndex(({ id }) => id === instance.getContextValue().current))
		.toBe(1);
	expect(submitted).toBe(0);
	expect(invalid).toBe(0);
});

const required = [{ $type: 'required', message: 'Required' }];

test('a failed Next shows the error and focuses the field, outside a submit', async () => {
	const host = await mount({
		id: 'focus-wizard',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'one', title: 'One', elements: [text('first'), { ...text('second'), rules: required }] },
			{ id: 'two', title: 'Two', elements: [] },
		],
	});
	const instance = host.querySelector<FormInstanceElement>('se-form-instance')!;
	await expect.poll(() => host.querySelector('se-wizard-actions button')).toBeTruthy();

	expect(await instance.next()).toBe('invalid');

	await expect.poll(() => document.activeElement?.closest('se-field')?.getAttribute('name')).toBe('second');
	expect(instance.getContextValue().current).toBe('one');
});

test('a step the answers skip is passed over, hidden from the progress and refused by goTo', async () => {
	const host = await mount({
		id: 'skipping-wizard',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'one', title: 'One', elements: [text('hasCompany')] },
			{
				id: 'company',
				title: 'Company',
				constraints: [{ field: 'hasCompany', operator: 'equals', value: 'yes', $type: 'show' }],
				elements: [text('companyName')],
			},
			{ id: 'three', title: 'Three', elements: [] },
		],
	});
	const instance = host.querySelector<FormInstanceElement>('se-form-instance')!;
	await expect.poll(() => host.querySelector('se-wizard-actions button')).toBeTruthy();

	expect(await instance.goTo('company')).toBe('refused');
	expect(await instance.next()).toBe('moved');

	expect(instance.getContextValue().current).toBe('three');
	await expect.poll(() => host.querySelector('.se-wizard-actions__counter')?.textContent).toContain('2');
	expect(host.querySelector('.se-wizard-actions__counter')?.textContent).toContain('2');
});
