import { afterEach, beforeEach, describe, expect, inject, test, vi } from 'vitest';
import { FormController } from '@/adapters/radiant/controller';
import { selectFieldState } from '@schema-engine/forms/state-container';
import { containerOf } from '../components/mount-field';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormRendererElement } from '@/components/internals/form-renderer';
import type { SeFormArray } from '@/elements/inputs/form-array-elements';

describe('SSR array hydration', () => {
	const warn = vi.spyOn(console, 'warn');

	beforeEach(() => {
		warn.mockClear();
	});

	afterEach(() => {
		const engineWarnings = warn.mock.calls.filter((call) =>
			String(call.at(-1)).includes('Could not resolve FormEngine'),
		);
		expect(engineWarnings).toEqual([]);
	});

	test('adopts server rows and keeps their authored values as reset defaults', async () => {
		expect(customElements.get('se-form-renderer')).toBe(FormRendererElement);
		const html = inject('ssrArrayHtml').replaceAll('<\\/script>', '</script>');
		expect(html).toContain('<se-form-array');
		expect(html).toContain('</script>');
		expect(html).toContain('<rui-form');

		const app = document.createElement('div');
		app.innerHTML = html;
		const renderer = app.querySelector<FormRendererElement>('se-form-renderer');
		const arrayHost = app.querySelector<SeFormArray>('se-form-array');
		if (!renderer || !arrayHost) throw new Error('Expected rendered form and array hosts');
		const serverRows = [...app.querySelectorAll('.se-form-array__item[data-se-row-id]')];
		expect(arrayHost.hasAttribute('data-radiant-ssr')).toBe(true);
		expect([...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value)).toEqual([
			'Alice',
			'Bob',
		]);

		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const isolatedApp = document.createElement('div');
		isolatedApp.innerHTML = html;
		const isolatedRenderer = isolatedApp.querySelector<FormRendererElement>('se-form-renderer');
		const isolatedArray = isolatedApp.querySelector<SeFormArray>('se-form-array');
		if (!isolatedRenderer || !isolatedArray) throw new Error('Expected server-rendered form hosts');
		const isolatedRows = [...isolatedApp.querySelectorAll('.se-form-array__item[data-se-row-id]')];
		isolatedRenderer.engine = engine;
		const form = new FormController(arrayHost);

		try {
			document.body.append(isolatedApp);
			await expect.poll(() => new FormController(isolatedArray).container).toBeTruthy();
			expect(isolatedApp.querySelector('.se-form-array')).toBe(isolatedRows[0]?.parentElement);
			expect(isolatedApp.querySelector('.se-form-array__item[data-se-row-id="row-1"]')).toBe(isolatedRows[0]);
			expect(isolatedApp.querySelector('.se-form-array__item[data-se-row-id="row-2"]')).toBe(isolatedRows[1]);

			renderer.engine = engine;
			document.body.append(app);
			await expect.poll(() => form.container).toBeTruthy();
			expect(app.querySelector('.se-form-array__item[data-se-row-id="row-1"]')).toBe(serverRows[0]);
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({ contacts: [{ role: 'Alice' }, { role: 'Bob' }] });
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Alice', 'Bob']);

			const ruiForm = app.querySelector('rui-form');
			const submitButton = app.querySelector<HTMLButtonElement>('button[type="submit"]');
			if (!ruiForm || !submitButton) throw new Error('Expected the form submit control');
			let completedSubmissions = 0;
			ruiForm.addEventListener('se-action-submit-complete', () => completedSubmissions++);
			submitButton.click();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().errors.contacts?.message)
				.toBe('Add at least three contacts');
			expect(completedSubmissions).toBe(0);

			await expect(containerOf(arrayHost).validate()).resolves.toEqual({ outcome: 'invalid' });
			expect(selectFieldState(containerOf(arrayHost).getSnapshot(), 'contacts').error?.message).toBe(
				'Add at least three contacts',
			);
			containerOf(arrayHost).setValue('contacts.0.role', 'Edited Alice');
			await expect.poll(() => app.querySelector<HTMLInputElement>('.rui-input')?.value).toBe('Edited Alice');

			const addButton = arrayHost.querySelector<HTMLButtonElement>('.se-form-array__add');
			if (!addButton) throw new Error('Expected array add button');
			addButton.click();
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Edited Alice', 'Bob', 'Viewer']);
			await expect(containerOf(arrayHost).validate()).resolves.toEqual({ outcome: 'passed' });

			containerOf(arrayHost).reset();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({ contacts: [{ role: 'Alice' }, { role: 'Bob' }] });
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Alice', 'Bob']);
		} finally {
			app.remove();
			isolatedApp.remove();
		}
	});

	test('resets minItems rows to their seeded initial values when form defaults contain no rows', async () => {
		const html = inject('ssrMinItemsHtml').replaceAll('<\\/script>', '</script>');
		const app = document.createElement('div');
		app.innerHTML = html;
		const renderer = app.querySelector<FormRendererElement>('se-form-renderer');
		const arrayHost = app.querySelector<SeFormArray>('se-form-array');
		if (!renderer || !arrayHost) throw new Error('Expected rendered form and array hosts');
		const form = new FormController(arrayHost);
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

		try {
			renderer.engine = engine;
			document.body.append(app);
			await expect.poll(() => form.container).toBeTruthy();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({
					contacts: [{ role: 'Viewer' }, { role: 'Viewer' }],
				});
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Viewer', 'Viewer']);

			containerOf(arrayHost).setValue('contacts.0.role', 'Edited');
			await expect.poll(() => app.querySelector<HTMLInputElement>('.rui-input')?.value).toBe('Edited');
			containerOf(arrayHost).reset();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({
					contacts: [{ role: 'Viewer' }, { role: 'Viewer' }],
				});
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Viewer', 'Viewer']);
		} finally {
			app.remove();
		}
	});

	test('keeps object provider row shape when minItems and Add create rows', async () => {
		const html = inject('ssrObjectArrayDefaultsHtml').replaceAll('<\\/script>', '</script>');
		const app = document.createElement('div');
		app.innerHTML = html;
		const renderer = app.querySelector<FormRendererElement>('se-form-renderer');
		const arrayHost = app.querySelector<SeFormArray>('se-form-array');
		if (!renderer || !arrayHost) throw new Error('Expected rendered form and array hosts');
		const form = new FormController(arrayHost);
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

		try {
			renderer.engine = engine;
			document.body.append(app);
			await expect.poll(() => form.container).toBeTruthy();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({
					members: [{ role: 'Admin' }, { role: '' }],
				});

			const addButton = arrayHost.querySelector<HTMLButtonElement>('.se-form-array__add');
			if (!addButton) throw new Error('Expected array add button');
			addButton.click();
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({
					members: [{ role: 'Admin' }, { role: '' }, { role: '' }],
				});
		} finally {
			app.remove();
		}
	});

	test('server rows follow a config change right after hydration', async () => {
		const html = inject('ssrArrayHtml').replaceAll('<\\/script>', '</script>');
		const app = document.createElement('div');
		app.innerHTML = html;
		const renderer = app.querySelector<FormRendererElement>('se-form-renderer');
		const arrayHost = app.querySelector<SeFormArray>('se-form-array');
		if (!renderer || !arrayHost) throw new Error('Expected rendered form and array hosts');

		try {
			renderer.engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
			document.body.append(app);
			await expect
				.poll(() => containerOf(arrayHost).getSnapshot().values)
				.toEqual({ contacts: [{ role: 'Alice' }, { role: 'Bob' }] });

			arrayHost.config = { ...arrayHost.config, disabled: true, addButtonText: 'Add contact' };
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ disabled }) => disabled))
				.toEqual([true, true]);
			expect([...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value)).toEqual([
				'Alice',
				'Bob',
			]);
			expect(arrayHost.querySelector('.se-form-array__add')?.textContent).toContain('Add contact');
		} finally {
			app.remove();
		}
	});
});
