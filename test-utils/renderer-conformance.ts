import { afterEach, describe, expect, test, vi } from 'vitest';
import { getByRole, queryAllByRole, queryByText } from '@testing-library/dom';
import { userEvent } from 'vitest/browser';
import * as v from 'valibot';
import type { BuilderActionRuntimeContext, FormConfigView } from '@schema-engine/forms';

export const conformanceAction = {
	$type: 'conformance',
	schema: v.object({ $type: v.literal('conformance'), id: v.string(), triggers: v.optional(v.array(v.string())) }),
	metadata: { name: 'Conformance' },
	execute: vi.fn(async (context: BuilderActionRuntimeContext) =>
		context.config.id === 'abort'
			? { success: false, shouldContinue: false, error: 'Submission stopped' }
			: { success: true },
	),
};

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
		const address = {
			$type: 'fieldSet',
			id: 'address',
			name: 'address',
			elements: [{ ...input('street', 'Street'), rules: [{ type: 'required', message: 'Street is required' }] }],
		};
		test('wizard Next validates a required child inside a fieldset', async () => {
			const config = form([address]);
			config.view = { $type: 'wizard', actions: { showStepCounter: true } };
			config.steps.push({ id: 'second', title: 'Second', elements: [input('last', 'Last')] });
			const host = await setup({ config });
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			expect(queryAllByRole(host, 'textbox', { name: 'Last' })).toHaveLength(0);
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Street/ }), 'Main Street');
			await userEvent.tab();
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Last' }).length).toBe(1);
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
			await expect
				.poll(() => conformanceAction.execute.mock.calls.map(([context]) => context.config.id))
				.toEqual(['abort', 'error', 'complete']);
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
			await expect
				.poll(() => conformanceAction.execute.mock.calls.map(([context]) => context.config.id))
				.toEqual(['first', 'error', 'complete']);
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
