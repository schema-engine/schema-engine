import { describe, expect, inject, test } from 'vitest';
import { hasHydrationMarkers } from '@ecopages/jsx';
import { FormController } from '@/adapters/radiant/controller';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormRendererElement } from '@/components/internals/form-renderer';
import type { SeFormArray } from '@/elements/inputs/form-array-elements';

describe('SSR array hydration', () => {
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
		expect(hasHydrationMarkers(arrayHost)).toBe(true);
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
			await Promise.resolve();
			expect(isolatedApp.querySelector('.se-form-array')).toBe(isolatedRows[0]?.parentElement);
			expect(isolatedApp.querySelector('.se-form-array__item[data-se-row-id="seed-0"]')).toBe(isolatedRows[0]);
			expect(isolatedApp.querySelector('.se-form-array__item[data-se-row-id="seed-1"]')).toBe(isolatedRows[1]);

			renderer.engine = engine;
			document.body.append(app);
			await expect.poll(() => form.ready).toBe(true);
			expect(app.querySelector('.se-form-array__item[data-se-row-id="seed-0"]')).toBe(serverRows[0]);
			await expect.poll(() => form.getValues()).toEqual({ contacts: [{ role: 'Alice' }, { role: 'Bob' }] });
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Alice', 'Bob']);

			const ruiForm = app.querySelector('rui-form');
			const submitButton = app.querySelector<HTMLButtonElement>('button[type="submit"]');
			if (!ruiForm || !submitButton) throw new Error('Expected the form submit control');
			let invalidSubmissions = 0;
			let validSubmissions = 0;
			ruiForm.addEventListener('rui-invalid', () => invalidSubmissions++);
			ruiForm.addEventListener('rui-submit', () => validSubmissions++);
			submitButton.click();
			await expect.poll(() => invalidSubmissions).toBe(1);
			expect(validSubmissions).toBe(0);

			await expect(form.trigger()).resolves.toBe(false);
			expect(form.field('contacts').error).toBe('Add at least three contacts');
			form.setValue('contacts.0.role', 'Edited Alice');
			await expect.poll(() => app.querySelector<HTMLInputElement>('.rui-input')?.value).toBe('Edited Alice');

			const addButton = arrayHost.querySelector<HTMLButtonElement>('[data-action="add"]');
			if (!addButton) throw new Error('Expected array add button');
			addButton.click();
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Edited Alice', 'Bob', 'Viewer']);
			await expect(form.trigger()).resolves.toBe(true);

			form.reset();
			await expect.poll(() => form.getValues()).toEqual({ contacts: [{ role: 'Alice' }, { role: 'Bob' }] });
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Alice', 'Bob']);
		} finally {
			form.disconnect();
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
			await expect.poll(() => form.ready).toBe(true);
			await expect
				.poll(() => form.getValues())
				.toEqual({
					contacts: [{ role: 'Viewer' }, { role: 'Viewer' }],
				});
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Viewer', 'Viewer']);

			form.setValue('contacts.0.role', 'Edited');
			await expect.poll(() => app.querySelector<HTMLInputElement>('.rui-input')?.value).toBe('Edited');
			form.reset();
			await expect
				.poll(() => form.getValues())
				.toEqual({
					contacts: [{ role: 'Viewer' }, { role: 'Viewer' }],
				});
			await expect
				.poll(() => [...app.querySelectorAll<HTMLInputElement>('.rui-input')].map(({ value }) => value))
				.toEqual(['Viewer', 'Viewer']);
		} finally {
			form.disconnect();
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
			await expect.poll(() => form.ready).toBe(true);
			await expect
				.poll(() => form.getValues())
				.toEqual({
					members: [{ role: 'Admin' }, { role: '' }],
				});

			const addButton = arrayHost.querySelector<HTMLButtonElement>('[data-action="add"]');
			if (!addButton) throw new Error('Expected array add button');
			addButton.click();
			await expect
				.poll(() => form.getValues())
				.toEqual({
					members: [{ role: 'Admin' }, { role: '' }, { role: '' }],
				});
		} finally {
			form.disconnect();
			app.remove();
		}
	});
});
