import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { CardRecipe, WizardRecipe } from '@/recipes';
import { testAction } from '../adapters/test-actions';

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	recipes: [CardRecipe, WizardRecipe],
	actions: [testAction('submit', ['form_submit'], async () => ({ success: true }))],
});

const alert = {
	$type: 'submission-alert',
	id: 'status',
	name: 'status',
	showOn: ['pending', 'success', 'error'],
	pendingMessage: 'Sending',
	successMessage: 'Sent',
	errorMessage: 'Failed',
} as const;

function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

async function mount(onSubmit: () => Promise<void>, options: { actions?: boolean; steps?: number } = {}) {
	const host = document.createElement('div');
	document.body.append(host);
	const steps = Array.from({ length: options.steps ?? 1 }, (_, index) => ({
		id: `step-${index}`,
		title: `Step ${index}`,
		elements: index === (options.steps ?? 1) - 1 ? [alert] : [],
	}));
	const config = {
		id: 'submission-state',
		view: { $type: options.steps ? 'wizard' : 'card' },
		steps,
		...(options.actions ? { actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }] } : {}),
	};
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine, onSubmit }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	const form = host.querySelector('rui-form')!;
	const events: string[] = [];
	form.addEventListener('se-action-submit-start', () => events.push('start'));
	form.addEventListener('se-action-submit-complete', (event) =>
		events.push(`complete:${(event as CustomEvent).detail.succeeded}`),
	);
	await expect.poll(() => form.querySelector('button[type="submit"], .se-wizard-actions button')).toBeTruthy();
	return { host, form, events, submit: () => form.querySelector<HTMLButtonElement>('button[type="submit"]')! };
}

test('the submit button shows the submitting label and is disabled while onSubmit runs', async () => {
	const pending = deferred();
	const { submit, events } = await mount(() => pending.promise);
	expect(submit().disabled).toBe(false);

	submit().click();

	await expect.poll(() => submit().disabled).toBe(true);
	expect(submit().textContent?.trim()).toBe('Submitting...');
	pending.resolve();
	await expect.poll(() => submit().disabled).toBe(false);
	expect(submit().textContent?.trim()).toBe('Submit');
	expect(events).toEqual(['start', 'complete:true']);
});

test('the last step of a wizard shows the submitting state', async () => {
	const pending = deferred();
	const { host, submit, form } = await mount(() => pending.promise, { steps: 2 });
	expect(host.querySelector('se-wizard-actions')).toBeTruthy();

	form.querySelector<HTMLButtonElement>('.se-wizard-actions__forward button[type="button"]')!.click();
	await expect.poll(() => form.querySelector('button[type="submit"]')).toBeTruthy();
	submit().click();

	await expect.poll(() => submit().disabled).toBe(true);
	expect(submit().textContent?.trim()).toBe('Submitting...');
	pending.resolve();
	await expect.poll(() => submit().disabled).toBe(false);
});

test('the alert reports pending, then the real outcome of a resolved submission', async () => {
	const pending = deferred();
	const { host, submit } = await mount(() => pending.promise);

	submit().click();

	await expect.poll(() => host.querySelector('se-submission-alert')?.textContent).toContain('Sending');
	pending.resolve();
	await expect.poll(() => host.querySelector('se-submission-alert')?.textContent).toContain('Sent');
});

test('the alert reports an error for a rejected submission and never reports success', async () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	const pending = deferred();
	const { host, submit, events } = await mount(() => pending.promise);
	const alertElement = host.querySelector('se-submission-alert')!;
	const seen: string[] = [];
	new MutationObserver(() => seen.push(alertElement.textContent ?? '')).observe(alertElement, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	submit().click();
	await expect.poll(() => alertElement.textContent).toContain('Sending');
	pending.reject(new Error('500'));

	await expect.poll(() => alertElement.textContent).toContain('Failed');
	expect(seen.some((text) => text.includes('Sent'))).toBe(false);
	expect(events).toEqual(['start', 'complete:false']);
});

test('se-action-submit-complete carries the error of a rejected onSubmit', async () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	const failure = new Error('500');
	const { form, submit } = await mount(async () => {
		throw failure;
	});
	const details: unknown[] = [];
	form.addEventListener('se-action-submit-complete', (event) => details.push((event as CustomEvent).detail));

	submit().click();

	await expect.poll(() => details).toHaveLength(1);
	expect(details[0]).toMatchObject({ succeeded: false, error: failure });
});

test('start and complete events also fire when submit actions are configured', async () => {
	const { submit, events } = await mount(async () => {}, { actions: true });

	submit().click();

	await expect.poll(() => events).toEqual(['start', 'complete:true']);
});

test('onSubmit runs once through the instance and the renderer element has no onSubmit property', async () => {
	const onSubmit = vi.fn(async () => {});
	const { host, submit, events } = await mount(onSubmit);

	submit().click();

	await expect.poll(() => events).toEqual(['start', 'complete:true']);
	expect(onSubmit).toHaveBeenCalledOnce();
	expect('onSubmit' in host.querySelector('se-form-renderer')!).toBe(false);
});
