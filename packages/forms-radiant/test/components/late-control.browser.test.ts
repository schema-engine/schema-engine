import { afterEach, expect, test, vi } from 'vitest';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { SeMaskedInput } from '@/elements/inputs/form-masked-input';
import { registerHostControl } from '@/lib/control-host';

afterEach(() => document.body.replaceChildren());

let counter = 0;
const freshTag = () => `se-late-masked-${(counter += 1)}`;

/** A form over a container holding `seed`, with a field named `late` whose control markup is `controlHtml`. */
async function mountLate(controlHtml: string) {
	const container = createFormStateContainer({
		config: {
			steps: [{ id: 'main', elements: [{ name: 'late', $type: 'input' }] }],
			validationMode: 'onSubmit',
			reValidateMode: 'onChange',
		},
		registry: createDefaultValidationRegistry(),
		defaults: { late: 'seed' },
	});
	const reportNative = vi.spyOn(container, 'reportNative');
	const form = document.createElement('rui-form') as RuiFormElement;
	form.innerHTML = `<rui-field name="late">${controlHtml}</rui-field>`;
	document.body.append(form);
	await customElements.whenDefined('rui-form');
	form.connect(container, { formatError: () => '' });
	await new Promise((resolve) => setTimeout(resolve, 50));
	return { container, form, reportNative };
}

test('a control host defined after its field connected is seeded with the value the form holds, and reports its native state', async () => {
	const tag = freshTag();
	const { form, reportNative } = await mountLate(`<${tag}></${tag}>`);
	expect(form.querySelector<HTMLInputElement>(tag)?.value).toBeUndefined();
	reportNative.mockClear();

	registerHostControl(tag, { mode: 'owns' });
	customElements.define(tag, class extends SeMaskedInput {});

	const host = form.querySelector<SeMaskedInput>(tag)!;
	await expect.poll(() => host.value).toBe('seed');
	await expect.poll(() => reportNative.mock.calls.length).toBeGreaterThan(0);
});

test('a control host inserted into an already connected field is seeded the same way', async () => {
	const tag = freshTag();
	registerHostControl(tag, { mode: 'owns' });
	customElements.define(tag, class extends SeMaskedInput {});
	const { form, reportNative } = await mountLate('');
	reportNative.mockClear();

	const host = document.createElement(tag) as SeMaskedInput;
	form.querySelector('rui-field')!.append(host);

	await expect.poll(() => host.value).toBe('seed');
	await expect.poll(() => reportNative.mock.calls.length).toBeGreaterThan(0);
});
