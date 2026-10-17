import { afterEach, describe, expect, test, vi } from 'vitest';
import { getByRole, queryAllByRole, queryAllByText, queryByText } from '@testing-library/dom';
import { userEvent } from 'vitest/browser';
import * as v from 'valibot';
import type { BuilderActionRuntimeContext, FormConfigView } from '@schema-engine/forms';

export const conformanceAction = {
	$type: 'conformance',
	schema: v.object({ $type: v.literal('conformance'), id: v.string(), triggers: v.optional(v.array(v.string())) }),
	metadata: { name: 'Conformance' },
	execute: vi.fn(async (context: BuilderActionRuntimeContext<{ id: string }>) =>
		context.config.id === 'abort'
			? { success: false, shouldContinue: false, error: 'Submission stopped' }
			: { success: true },
	),
};

/**
 * `$type` each renderer registers with `containerKind: 'array'` and its array widget.
 *
 * @remarks
 * Each registration reuses its built-in array widget unchanged. Its props type pins
 * `$type: 'arrayElements'`, which the widget never reads, so the registration
 * widens the widget to `Omit<ArrayElementsProps, '$type'>` rather than rewriting
 * `$type` at runtime, where it would mask a leftover `$type` check.
 */
export const customArrayType = 'repeater';

export interface ConformanceMountOptions {
	config: FormConfigView;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void;
	onChange?: (data: Record<string, unknown>) => void;
	onAction?: () => void;
}
export type ConformanceMount = (
	options: ConformanceMountOptions,
) => Promise<{ host: HTMLElement; cleanup: () => void }>;

const lastActionContext = () => conformanceAction.execute.mock.calls.at(-1)?.[0];
const input = (name: string, label: string) => ({ $type: 'input', id: name, name, label });
const form = (elements: FormConfigView['steps'][number]['elements']): FormConfigView => ({
	id: 'conformance',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [...elements, { $type: 'submit', id: 'submit', name: 'conformanceSubmit', label: 'Submit' }],
		},
	],
});

const wizard = (...steps: FormConfigView['steps'][number]['elements'][]): FormConfigView => ({
	id: 'conformance',
	view: { $type: 'wizard', actions: { showStepCounter: true } },
	steps: steps.map((elements, index) => ({ id: `step${index}`, title: `Step ${index + 1}`, elements })),
});
const actionIds = () => conformanceAction.execute.mock.calls.map(([context]) => context.config.id);

/** @remarks Both browser projects execute these assertions against their own FormRenderer. */
export function rendererConformance(mount: ConformanceMount): void {
	describe('FormRenderer conformance', () => {
		let cleanup: (() => void) | undefined;
		afterEach(() => {
			cleanup?.();
			cleanup = undefined;
			conformanceAction.execute.mockClear();
		});
		const setup = async (options: ConformanceMountOptions) => {
			const result = await mount(options);
			cleanup = result.cleanup;
			return result.host;
		};
		test('resolves sibling show constraints independently in two array rows', async () => {
			const host = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						elements: [
							input('kind', 'Kind'),
							{
								...input('email', 'Email'),
								constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
							},
						],
					},
				]),
				defaultValues: { contacts: [{ kind: '' }, { kind: '' }] },
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Kind' }).length).toBe(2);
			expect(queryAllByRole(host, 'textbox', { name: 'Email' })).toHaveLength(0);
			await userEvent.fill(queryAllByRole(host, 'textbox', { name: 'Kind' })[0], 'business');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Email' }).length).toBe(1);
			expect(getByRole(host, 'textbox', { name: 'Email' }).getAttribute('name')).toBe('contacts.0.email');
		});
		test('both renderers add the same row', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'members',
						name: 'members',
						initialValues: { role: 'user' },
						elements: [{ ...input('fullName', 'Name'), defaultValue: 'x' }, input('role', 'Role')],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Name' }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Name' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			const row = { fullName: 'x', role: 'user' };
			expect(onSubmit).toHaveBeenCalledWith({ members: [row, row] });
		});
		test('a single-child array keeps object rows from form defaultValues', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					{ $type: 'arrayElements', id: 'members', name: 'members', elements: [input('role', 'Role')] },
				]),
				defaultValues: { members: [{ role: 'admin' }] },
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Role' }).length).toBe(1);
			expect(getByRole(host, 'textbox', { name: 'Role' }).getAttribute('name')).toBe('members.0.role');
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Role' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ members: [{ role: 'admin' }, { role: '' }] });
		});
		test('both renderers add the same scalar row', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'tags',
						name: 'tags',
						elements: [{ ...input('tag', 'Tag'), defaultValue: 'x' }],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ tags: ['x', 'x'] });
		});
		test('keeps empty scalar rows seeded to minItems and added after them', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					{ $type: 'arrayElements', id: 'tags', name: 'tags', minItems: 2, elements: [input('tag', 'Tag')] },
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(3);
			await userEvent.fill(queryAllByRole(host, 'textbox', { name: 'Tag' })[2], 'c');
			await userEvent.click(queryAllByRole(host, 'button', { name: 'Remove item' })[0]);
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ tags: ['', 'c'] });
		});
		test(`seeds a custom array registration (${customArrayType}) to minItems`, async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					{
						$type: customArrayType,
						id: 'tags',
						name: 'tags',
						minItems: 2,
						elements: [input('label', 'Label'), input('color', 'Color')],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Label' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			const row = { label: '', color: '' };
			expect(onSubmit).toHaveBeenCalledWith({ tags: [row, row] });
		});
		const address = {
			$type: 'fieldSet',
			id: 'address',
			name: 'address',
			elements: [
				{ ...input('street', 'Street'), rules: [{ type: 'required' as const, message: 'Street is required' }] },
			],
		};
		test('wizard Next validates a required child inside a fieldset', async () => {
			const base = form([address]);
			const config: FormConfigView = {
				...base,
				view: { $type: 'wizard', actions: { showStepCounter: true } },
				steps: [...base.steps, { id: 'second', title: 'Second', elements: [input('last', 'Last')] }],
			};
			const host = await setup({ config });
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			expect(queryAllByRole(host, 'textbox', { name: 'Last' })).toHaveLength(0);
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Street/ }), 'Main Street');
			await userEvent.tab();
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Last' }).length).toBe(1);
		});
		test('dispatches step leave, change and enter when the wizard advances', async () => {
			const host = await setup({
				config: {
					...wizard([input('first', 'First')], [input('last', 'Last')]),
					actions: [
						{ $type: 'conformance', id: 'leave', triggers: ['step_leave'] },
						{ $type: 'conformance', id: 'change', triggers: ['step_change'] },
						{ $type: 'conformance', id: 'enter', triggers: ['step_enter'] },
					],
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect
				.poll(() =>
					conformanceAction.execute.mock.calls.map(([context]) => [context.config.id, context.currentStep]),
				)
				.toEqual([
					['leave', 0],
					['change', 1],
					['enter', 1],
				]);
		});
		test('ignores Next activated again before step validation finishes', async () => {
			const host = await setup({
				config: {
					...wizard(
						[input('first', 'First')],
						[
							{
								...input('second', 'Second'),
								rules: [{ type: 'required', message: 'Second is required' }],
							},
						],
						[input('third', 'Third')],
					),
					actions: [{ $type: 'conformance', id: 'change', triggers: ['step_change'] }],
				},
			});
			const next = getByRole(host, 'button', { name: 'Go to next step' });
			next.click();
			next.click();
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /^Second/ }).length).toBe(1);
			await expect.poll(actionIds).toEqual(['change']);
			expect(queryAllByRole(host, 'textbox', { name: 'Third' })).toHaveLength(0);
			expect(queryByText(host, 'Second is required')).toBeNull();
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Second/ }), 'filled');
			expect(actionIds()).toEqual(['change']);
		});
		test('clears a nested validation error after a failed submission', async () => {
			const onSubmit = vi.fn();
			const host = await setup({ config: { ...form([address]), reValidateMode: 'onChange' }, onSubmit });
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Street/ }), 'Main Street');
			await userEvent.tab();
			await expect.poll(() => queryByText(host, 'Street is required')).toBeNull();
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ address: { street: 'Main Street' } });
		});
		test('handlers receive one errors shape', async () => {
			const host = await setup({
				config: {
					...form([address, input('note', 'Note')]),
					actions: [{ $type: 'conformance', id: 'changed', triggers: ['form_change'] }],
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Note' }), 'Ring twice');
			await expect.poll(() => lastActionContext()?.formData.note).toBe('Ring twice');
			expect(lastActionContext()?.errors).toEqual({
				address: { street: expect.objectContaining({ message: 'Street is required' }) },
			});
		});
		test('a require constraint blocks submission until its condition is removed', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						...input('vat', 'VAT'),
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
					},
				]),
				defaultValues: { kind: 'business', vat: '' },
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /VAT\s*\*/ }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /VAT/ }).getAttribute('aria-invalid'))
				.toBe('true');
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Kind' }), 'personal');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /VAT\s*\*/ }).length).toBe(0);
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /VAT/ }).getAttribute('aria-invalid'))
				.toBe('false');
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'personal' }));
		});
		test('a fieldset require constraint makes its children required, nested containers included', async () => {
			const onSubmit = vi.fn();
			const host = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						$type: 'fieldSet',
						id: 'company',
						name: 'company',
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
						elements: [
							input('vat', 'VAT'),
							{ $type: 'fieldSet', id: 'office', name: 'office', elements: [input('street', 'Street')] },
							{
								$type: 'arrayElements',
								id: 'phones',
								name: 'phones',
								elements: [input('phone', 'Phone')],
							},
						],
					},
				]),
				defaultValues: { kind: 'business', company: { phones: [''] } },
				onSubmit,
			});
			const required = ['VAT', 'Street', 'Phone'];
			await expect
				.poll(() => queryAllByRole(host, 'textbox', { name: /^(VAT|Street|Phone)\s*\*/ }).length)
				.toBe(3);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() =>
					required.map((name) =>
						getByRole(host, 'textbox', { name: new RegExp(`^${name}`) }).getAttribute('aria-invalid'),
					),
				)
				.toEqual(['true', 'true', 'true']);
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Kind' }), 'personal');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /\*/ }).length).toBe(0);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
		});
		test('an authored disabled array disables its rows and its add and remove controls', async () => {
			const onChange = vi.fn();
			const host = await setup({
				config: form([
					input('note', 'Note'),
					{
						$type: 'arrayElements',
						id: 'tags',
						name: 'tags',
						disabled: true,
						elements: [
							{
								...input('tag', 'Tag'),
								constraints: [{ field: 'note', operator: 'not_equals', value: 'hide', action: 'show' }],
							},
						],
					},
				]),
				defaultValues: { tags: ['a', 'b'] },
				onChange,
			});
			const disabledControls = () =>
				[
					...queryAllByRole(host, 'textbox', { name: 'Tag' }),
					...queryAllByRole(host, 'button', { name: /^(Add|Remove) item$/ }),
				].map((control) => (control as HTMLInputElement | HTMLButtonElement).disabled);
			await expect.poll(disabledControls).toEqual([true, true, true, true, true]);
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Note' }), 'shown');
			await expect.poll(() => onChange.mock.lastCall?.[0].note).toBe('shown');
			expect(disabledControls()).toEqual([true, true, true, true, true]);
		});
		test('a row error follows its row when an earlier empty scalar row is removed', async () => {
			const host = await setup({
				config: {
					...form([
						{
							$type: 'arrayElements',
							id: 'tags',
							name: 'tags',
							elements: [
								{ ...input('tag', 'Tag'), rules: [{ type: 'required', message: 'Tag is required' }] },
							],
						},
					]),
					validationMode: 'onBlur',
				},
				defaultValues: { tags: ['', '', ''] },
			});
			const tags = () => queryAllByRole(host, 'textbox', { name: /^Tag/ });
			await expect.poll(() => tags().length).toBe(3);
			await userEvent.click(tags()[2]);
			await userEvent.tab();
			await expect
				.poll(() => tags().map((tag) => tag.getAttribute('aria-invalid')))
				.toEqual(['false', 'false', 'true']);
			await userEvent.click(queryAllByRole(host, 'button', { name: 'Remove item' })[0]);
			await expect.poll(() => tags().map((tag) => tag.getAttribute('aria-invalid'))).toEqual(['false', 'true']);
			expect(queryAllByText(host, 'Tag is required')).toHaveLength(1);
		});
		test('an array require constraint makes its rows required', async () => {
			const host = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						$type: 'arrayElements',
						id: 'phones',
						name: 'phones',
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
						elements: [input('phone', 'Phone')],
					},
				]),
				defaultValues: { kind: 'business', phones: [''] },
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /^Phone\s*\*/ }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /^Phone/ }).getAttribute('aria-invalid'))
				.toBe('true');
		});
		test('reValidateMode onBlur re-validates a field on blur, not on change', async () => {
			const host = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					validationMode: 'onSubmit',
					reValidateMode: 'onBlur',
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
			await userEvent.type(getByRole(host, 'textbox', { name: /^Name/ }), 'Ada');
			expect(queryByText(host, 'Name is required')).not.toBeNull();
			await userEvent.tab();
			await expect.poll(() => queryByText(host, 'Name is required')).toBeNull();
		});
		test('validationMode onChange validates a field before the first submit', async () => {
			const host = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					validationMode: 'onChange',
				},
			});
			await userEvent.type(getByRole(host, 'textbox', { name: /^Name/ }), 'a');
			await userEvent.clear(getByRole(host, 'textbox', { name: /^Name/ }));
			await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
		});
		test('submitCount counts submit attempts that failed validation', async () => {
			const host = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					actions: [{ $type: 'conformance', id: 'submitted', triggers: ['form_submit'] }],
				},
			});
			const name = getByRole(host, 'textbox', { name: /^Name/ });
			await userEvent.click(name);
			await userEvent.tab();
			for (let attempt = 0; attempt < 2; attempt += 1) {
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
			}
			await userEvent.fill(name, 'Ada');
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['submitted']);
			expect(lastActionContext()?.metadata.userInteractions).toBe(3);
		});
		test('typing over a debounced async check shows only the latest result', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ valid: false, message: 'Handle is taken' }))),
			);
			const host = await setup({
				config: {
					...form([
						{
							...input('handle', 'Handle'),
							rules: [{ type: 'async', url: '/conformance-check', debounce: 50, disableCache: true }],
						},
					]),
					reValidateMode: 'onChange',
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			const shown: string[] = [];
			const observer = new MutationObserver(() => shown.push(host.textContent ?? ''));
			observer.observe(host, { subtree: true, childList: true, characterData: true });
			try {
				await userEvent.type(getByRole(host, 'textbox', { name: 'Handle' }), 'ada');
				await expect.poll(() => queryByText(host, 'Handle is taken') !== null).toBe(true);
				expect(shown.some((text) => text.includes('Validation pending'))).toBe(false);
			} finally {
				observer.disconnect();
				vi.unstubAllGlobals();
			}
		});
		test('an aborting submit action runs error and complete triggers without success', async () => {
			const onSubmit = vi.fn();
			const onAction = vi.fn();
			const host = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [
						{ $type: 'conformance', id: 'abort', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'skipped', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
						{ $type: 'conformance', id: 'error', triggers: ['form_submit_error'] },
						{ $type: 'conformance', id: 'complete', triggers: ['form_submit_complete'] },
					],
				},
				onSubmit,
				onAction,
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['abort', 'error', 'complete']);
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onAction).not.toHaveBeenCalled();
		});
		test('an action callback rejection aborts submission and later submit actions', async () => {
			const onSubmit = vi.fn();
			const onAction = vi.fn(() => {
				throw new Error('Callback stopped submission');
			});
			const host = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [
						{ $type: 'conformance', id: 'first', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'skipped', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
						{ $type: 'conformance', id: 'error', triggers: ['form_submit_error'] },
						{ $type: 'conformance', id: 'complete', triggers: ['form_submit_complete'] },
					],
				},
				onSubmit,
				onAction,
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['first', 'error', 'complete']);
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onAction).toHaveBeenCalledTimes(1);
		});
		test('runs a Valibot action registration and forwards change and action callbacks', async () => {
			const onChange = vi.fn();
			const onAction = vi.fn();
			const host = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [{ $type: 'conformance', id: 'changed', triggers: ['form_submit'] }],
				},
				onChange,
				onAction,
			});
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Name' }), 'Ada');
			await expect.poll(() => onChange.mock.calls.length).toBeGreaterThan(0);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onAction.mock.calls.length).toBe(1);
			expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'changed' }), { fullName: 'Ada' });
			expect(onChange).toHaveBeenLastCalledWith({ fullName: 'Ada' });
		});
	});
}
