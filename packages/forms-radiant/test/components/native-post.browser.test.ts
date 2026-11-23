import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { containerOf } from './mount-field';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	csrf: { token: () => 'tok', header: 'x-csrf', field: '_csrf' },
});

/** Mounts a form that posts natively and records what the browser would send. */
async function mountPost(action = '/save') {
	const host = document.createElement('div');
	document.body.append(host);
	const config = engine.validateForm({
		id: 'native-post',
		payload: { campaign: 'spring' },
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'name', name: 'name' },
					{
						$type: 'input',
						id: 'secret',
						name: 'secret',
						constraints: [{ field: 'name', operator: 'equals', value: 'show', action: 'show' }],
					},
					{ $type: 'input', id: 'locked', name: 'locked', disabled: true, defaultValue: 'x' },
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						initialValues: { email: '' },
						elements: [{ $type: 'input', id: 'email', name: 'email' }],
					},
					{ $type: 'drop-zone', id: 'upload', name: 'upload', maxFiles: 2 },
				],
			},
		],
	});
	createRoot(host).render(FormRenderer({ config, engine, action, method: 'post' }));
	const ruiForm = host.querySelector('rui-form')!;
	await expect.poll(() => new FormController(ruiForm).container).toBeTruthy();
	const nativeForm = host.querySelector('form')!;
	const sent: Array<Array<[string, FormDataEntryValue]>> = [];
	const post = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {
		sent.push([...new FormData(nativeForm).entries()]);
	});
	const send = async () => {
		const before = post.mock.calls.length;
		nativeForm.requestSubmit();
		await expect.poll(() => post.mock.calls.length).toBe(before + 1);
		return Object.fromEntries(sent.at(-1)!.map(([key, value]) => [key, value]));
	};
	return { ruiForm, nativeForm, sent, send };
}

test('a native post sends the submission values: the payload, nested rows and files', async () => {
	const { ruiForm, send } = await mountPost();
	const container = containerOf(ruiForm);
	container.setValue('name', 'Ada');
	container.fieldArray('contacts').append({ email: 'a@example.com' });
	const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
	container.setValue('upload', [file]);

	const body = await send();

	expect(body.campaign).toBe('spring');
	expect(body.name).toBe('Ada');
	expect(body['contacts.0.email']).toBe('a@example.com');
	expect(body.upload).toBeInstanceOf(File);
	expect((body.upload as File).name).toBe('a.txt');
});

test('a field a constraint hides and a disabled field are not in the post', async () => {
	const { ruiForm, send } = await mountPost();
	containerOf(ruiForm).setValue('name', 'Ada');
	containerOf(ruiForm).setValue('secret', 'hidden value');

	const body = await send();

	expect(body).not.toHaveProperty('secret');
	expect(body).not.toHaveProperty('locked');
	expect(body.name).toBe('Ada');
});

test('a same-origin post carries the CSRF field, and a cross-origin one does not', async () => {
	const same = await mountPost('/save');
	expect((await same.send())._csrf).toBe('tok');
	document.body.replaceChildren();

	const cross = await mountPost('https://elsewhere.test/save');
	expect(await cross.send()).not.toHaveProperty('_csrf');
});

test('the listener is one-shot: a later FormData of the form is the DOM again', async () => {
	const { ruiForm, nativeForm, send } = await mountPost();
	containerOf(ruiForm).setValue('name', 'Ada');
	await send();

	expect(new FormData(nativeForm).has('campaign')).toBe(false);
});
