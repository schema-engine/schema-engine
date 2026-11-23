import { describe, expect, test } from 'vitest';
import { createFormEngine, createFormRuntime } from '@schema-engine/forms';
import { createFormStateContainer, FORM_ROOT } from '@schema-engine/forms/state-container';
import { container, fillIn } from '../src/lib/form-recipes/container';
import { bareControls, engine, textInput } from '../src/lib/form-recipes/engine';
import { engine as localized, formatIssue } from '../src/lib/form-recipes/format-issue';
import { walkThrough as nativeFacts } from '../src/lib/form-recipes/native-facts';
import { submitToJsonApi, submitToProblemDetails } from '../src/lib/form-recipes/server-errors';
import { createCheckout, walkThrough as wizard } from '../src/lib/form-recipes/checkout-wizard';
import { hydrateOnClient, renderOnServer } from '../src/lib/form-recipes/hydration';

describe('the form state page', () => {
	test('isValid counts recorded errors only; checkValidity validates without recording; validate records', async () => {
		const result = await fillIn();
		expect(result).toMatchObject({
			recordedBefore: true,
			checked: false,
			recordedAfterCheck: true,
			validated: false,
			isValid: false,
		});
		expect(result.error).toMatchObject({ type: 'minLength', ruleId: 'password-min', params: { minLength: 8 } });
		expect(result.field).toMatchObject({ invalid: true, isDirty: true, isTouched: false, isValidating: false });
		expect(container.getSnapshot().errors['email']).toBeUndefined();
	});
});

describe('server rendering', () => {
	test('a client container starts from what the server rendered, with the same defaults', () => {
		const payload = renderOnServer();
		expect(JSON.parse(payload)).toEqual({ values: { name: 'Ada' }, rowIds: {} });
		const client = hydrateOnClient(payload);
		expect(client.getSnapshot().values).toEqual({ name: 'Ada' });
		expect(client.getSnapshot().dirty).toEqual({});
		client.setValue('name', 'Grace');
		expect(client.getSnapshot().dirty).toEqual({ name: true });
	});
});

describe('the native validity page', () => {
	test('the walk-through shows the documented error after each step', async () => {
		const { typing, leaving, clearing, fixed } = await nativeFacts();
		expect(typing).toBeUndefined();
		expect(leaving).toEqual({
			type: 'typeMismatch',
			source: 'native',
			params: { inputType: 'email' },
			all: [{ type: 'typeMismatch', source: 'native', params: { inputType: 'email' } }],
		});
		expect(clearing).toMatchObject({ type: 'required', source: 'validation', ruleId: 'email-required' });
		expect(fixed).toBeUndefined();
	});

	test('a fact is dropped when its value changes, before the host reports again', async () => {
		const config = engine.defineForm({
			id: 'f',
			steps: [{ id: 's', title: 'S', elements: [{ $type: 'input', id: 'email', name: 'email' }] }],
		});
		const form = createFormStateContainer({
			config,
			registry: engine.getValidationRegistry(),
			defaults: { email: '' },
		});
		form.setValue('email', 'abc');
		form.reportNative({ email: { type: 'typeMismatch', params: { inputType: 'email' } } });
		expect(await form.checkValidity()).toBe(false);
		form.setValue('email', 'abcd');
		expect(await form.checkValidity()).toBe(true);
	});
});

describe('the issue text page', () => {
	test.each([
		[
			{ type: 'minLength', source: 'validation', ruleId: 'password-min', params: { minLength: 8 } },
			'password',
			'Use at least 8 characters for your password',
		],
		[
			{ type: 'minLength', source: 'validation', ruleId: 'bio-min', params: { minLength: 20 } },
			'bio',
			'Use at least 20 characters',
		],
		[{ type: 'required', source: 'validation', ruleId: 'email-required' }, 'email', 'Email is required'],
		[{ type: 'typeMismatch', source: 'native', params: { inputType: 'email' } }, 'email', 'Enter a valid email'],
		[
			{ type: 'taken', source: 'server', message: 'This email is already registered' },
			'email',
			'This email is already registered',
		],
		[
			{ type: 'actionFailed', source: 'submission', params: { actionId: 'save' } },
			FORM_ROOT,
			'Something went wrong. Please try again.',
		],
		[
			{ type: 'unknown', source: 'validation', message: 'Written by the rule author' },
			'x',
			'Written by the rule author',
		],
		[{ type: 'unknown', source: 'validation' }, 'x', ''],
	] as const)('%j at %s reads %j', (issue, path, text) => {
		expect(formatIssue(issue, { path })).toBe(text);
		expect(localized.getIssueFormatter()).toBe(formatIssue);
	});
});

const signup = (answer: Response) => {
	const signupEngine = createFormEngine({
		elements: [textInput],
		recipes: [bareControls],
		fetch: async () => answer,
	});
	const submitted: Array<Record<string, unknown>> = [];
	const config = signupEngine.defineForm({
		id: 'signup',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'email', name: 'email' },
					{ $type: 'input', id: 'contacts', name: 'contacts' },
				],
			},
		],
	});
	return { engine: signupEngine, config, submitted };
};

describe('the server errors page', () => {
	test('fromProblemDetails puts each pointer on its field and the rest on the form', async () => {
		const { engine: signupEngine, config } = signup(
			Response.json(
				{
					type: 'https://example.com/problems/validation',
					title: 'Validation failed',
					status: 422,
					errors: [
						{ pointer: '#/email', code: 'taken', detail: 'This email is already registered' },
						{ detail: 'Try again later', code: 'rate_limited' },
					],
				},
				{ status: 422 },
			),
		);
		const runtime = createFormRuntime({
			engine: signupEngine,
			config,
			host: { focus: () => {} },
			onSubmit: submitToProblemDetails,
		});
		runtime.mount();
		expect(await runtime.submit()).toBe('submitted');
		expect(runtime.container.getSnapshot().errors['email']).toMatchObject({
			type: 'taken',
			source: 'server',
			message: 'This email is already registered',
		});
		expect(runtime.container.getSnapshot().errors[FORM_ROOT]).toMatchObject({ type: 'rate_limited' });
	});

	test('fromJsonApiErrors reads source.pointer', async () => {
		const { engine: signupEngine, config } = signup(
			Response.json(
				{
					errors: [
						{
							status: '422',
							code: 'taken',
							detail: 'This email is already registered',
							source: { pointer: '/data/attributes/email' },
						},
					],
				},
				{ status: 422 },
			),
		);
		const runtime = createFormRuntime({
			engine: signupEngine,
			config,
			host: { focus: () => {} },
			onSubmit: submitToJsonApi,
		});
		runtime.mount();
		await runtime.submit();
		expect(runtime.container.getSnapshot().errors['email']).toMatchObject({ type: 'taken', source: 'server' });
	});
});

describe('the wizard page', () => {
	test('the walk-through returns the documented outcomes', async () => {
		const { log, steps, submitted } = await wizard();
		expect(log).toEqual([
			['next', 'invalid', 'contact'],
			['next', 'moved', 'payment'],
			['back', 'moved', 'contact'],
			['next', 'moved', 'company'],
			['goTo payment', 'invalid', 'company'],
			['goTo payment', 'moved', 'payment'],
			['submit', 'invalid', 'payment'],
			['submit', 'submitted', 'payment'],
		]);
		expect(steps.map(({ id, visited, complete }) => [id, visited, complete])).toEqual([
			['contact', true, true],
			['company', true, true],
			['payment', true, false],
		]);
		expect(submitted).toEqual([
			{ hasCompany: 'yes', email: 'ada@example.com', vat: 'IT12345678901', card: '4242 4242 4242 4242' },
		]);
	});

	test('a skipped step is passed over, refused by goTo and left out of the submission', async () => {
		const submitted: Array<Record<string, unknown>> = [];
		const checkout = createCheckout((values) => void submitted.push({ ...values }));
		checkout.container.setValue('email', 'ada@example.com');
		expect(checkout.getSnapshot().steps.map(({ id, skipped }) => [id, skipped])).toEqual([
			['contact', false],
			['company', true],
			['payment', false],
		]);
		expect(await checkout.goTo('company')).toBe('refused');
		expect(await checkout.next()).toBe('moved');
		expect(checkout.getSnapshot().current).toBe('payment');
		checkout.container.setValue('card', '4242');
		expect(await checkout.submit()).toBe('submitted');
		expect(submitted[0]).not.toHaveProperty('vat');
	});

	test('a free form reaches an unvisited step without validating; a linear one refuses it', async () => {
		const free = engine.defineForm({
			id: 'free',
			navigation: 'free',
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [{ $type: 'input', id: 'a', name: 'a', rules: [{ type: 'required' }] }],
				},
				{ id: 'two', title: 'Two', elements: [] },
			],
		});
		const runtime = createFormRuntime({ engine, config: free, host: { focus: () => {} } });
		runtime.mount();
		expect(await runtime.goTo('two')).toBe('moved');
		expect(createCheckout().getSnapshot().current).toBe('contact');
		expect(await createCheckout().goTo('payment')).toBe('refused');
	});
});
