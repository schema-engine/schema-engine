import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createValidationFieldPlay } from '@/stories/shared/field-plays';
import { clickSubmit, expectFieldError, expectNoFieldError, playFieldFocusAndType } from '@/stories/shared/play';
import { whenInteractive } from '@/stories/shared/storybook-ssr';

const meta = {
	...formRendererMeta,
	title: 'Capabilities/Validation',
	args: {
		config: {
			...fieldFormConfig('validation-feedback', 'Validation feedback', [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Work email',
					inputType: 'email',
					placeholder: 'name@example.com',
					rules: [
						{ type: 'required', message: 'Work email is required' },
						{ type: 'email', message: 'Enter a valid work email' },
					],
				},
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Continue' },
			]),
			reValidateMode: 'onChange',
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClearsErrorsAfterValidInput: Story = {
	play: createValidationFieldPlay(/work email/i, 'name@example.com', /continue/i, /work email is required/i),
};

export const BuiltInRules: Story = {
	args: {
		config: {
			...fieldFormConfig('built-in-validation-rules', 'Built-in validation rules', [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email address is required' },
						{ type: 'email', message: 'Enter a valid email address' },
					],
				},
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					label: 'Password',
					inputType: 'password',
					rules: [
						{ type: 'minLength', value: 8, message: 'Use at least 8 characters' },
						{ type: 'pattern', value: '(?=.*\\d)', message: 'Include at least one number' },
					],
				},
				{
					$type: 'number',
					id: 'team-size',
					name: 'teamSize',
					label: 'Team size',
					rules: [
						{ type: 'min', value: 1, message: 'At least one person is required' },
						{ type: 'max', value: 100, message: 'Use a number below 101' },
					],
				},
				{
					$type: 'input',
					id: 'website',
					name: 'website',
					label: 'Website URL',
					inputType: 'url',
					rules: [{ type: 'url', message: 'Enter a valid URL' }],
				},
				{
					$type: 'input',
					id: 'server',
					name: 'server',
					label: 'Server IPv4 address',
					rules: [{ type: 'ipv4', message: 'Enter a valid IPv4 address' }],
				},
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Validate fields' },
			]),
			reValidateMode: 'onChange',
		},
	},
	play: whenInteractive(async ({ canvasElement }) => {
		for (const [label, invalidValue, validValue, error] of [
			[/email address/i, 'not-an-email', 'name@example.com', /enter a valid email address/i],
			[/password/i, 'short', 'password1', /use at least 8 characters/i],
			[/team size/i, '0', '2', /at least one person is required/i],
			[/website url/i, 'not a URL', 'https://schema-engine.dev', /enter a valid url/i],
			[/server ipv4 address/i, '127.0.0.999', '127.0.0.1', /enter a valid ipv4 address/i],
		] as const) {
			await playFieldFocusAndType(canvasElement, label, invalidValue);
			await clickSubmit(canvasElement, /validate fields/i);
			await expectFieldError(canvasElement, error);
			await playFieldFocusAndType(canvasElement, label, validValue);
			await expectNoFieldError(canvasElement, error);
		}
	}),
};

export const FormatRules: Story = {
	args: {
		config: {
			...fieldFormConfig('format-validation-rules', 'Format validation rules', [
				{
					$type: 'input',
					id: 'uuid',
					name: 'uuid',
					label: 'UUID',
					rules: [
						{ type: 'required', message: 'UUID is required' },
						{ type: 'uuid', message: 'Enter a valid UUID' },
					],
				},
				{
					$type: 'input',
					id: 'ipv6',
					name: 'ipv6',
					label: 'Server IPv6 address',
					rules: [
						{ type: 'required', message: 'Server IPv6 address is required' },
						{ type: 'ipv6', message: 'Enter a valid IPv6 address' },
					],
				},
				{
					$type: 'input',
					id: 'jwt',
					name: 'jwt',
					label: 'JSON Web Token',
					rules: [
						{ type: 'required', message: 'JSON Web Token is required' },
						{ type: 'jwt', message: 'Enter a valid JWT' },
					],
				},
				{
					$type: 'input',
					id: 'base64',
					name: 'base64',
					label: 'Base64 value',
					rules: [
						{ type: 'required', message: 'Base64 value is required' },
						{ type: 'base64', message: 'Enter Base64 data' },
					],
				},
				{
					$type: 'input',
					id: 'hash',
					name: 'hash',
					label: 'SHA-256 hash',
					rules: [
						{ type: 'required', message: 'SHA-256 hash is required' },
						{ type: 'hash', algorithm: 'sha256', message: 'Enter a valid SHA-256 hash' },
					],
				},
				{
					$type: 'input',
					id: 'cuid',
					name: 'cuid',
					label: 'CUID',
					rules: [
						{ type: 'required', message: 'CUID is required' },
						{ type: 'cuid', message: 'Enter a valid CUID' },
					],
				},
				{
					$type: 'input',
					id: 'ulid',
					name: 'ulid',
					label: 'ULID',
					rules: [
						{ type: 'required', message: 'ULID is required' },
						{ type: 'ulid', message: 'Enter a valid ULID' },
					],
				},
				{
					$type: 'input',
					id: 'hex',
					name: 'hex',
					label: 'Hexadecimal value',
					rules: [
						{ type: 'required', message: 'Hexadecimal value is required' },
						{ type: 'hex', message: 'Enter hexadecimal characters' },
					],
				},
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Validate formats' },
			]),
			reValidateMode: 'onChange',
		},
	},
	play: whenInteractive(async ({ canvasElement }) => {
		await clickSubmit(canvasElement, /validate formats/i);
		for (const error of [
			/uuid is required/i,
			/server ipv6 address is required/i,
			/json web token is required/i,
			/base64 value is required/i,
			/sha-256 hash is required/i,
			/cuid is required/i,
			/ulid is required/i,
			/hexadecimal value is required/i,
		]) {
			await expectFieldError(canvasElement, error);
		}
		for (const [label, invalidValue, validValue, error] of [
			[/uuid/i, 'not-a-uuid', '550e8400-e29b-41d4-a716-446655440000', /enter a valid uuid/i],
			[/server ipv6 address/i, 'not-an-ipv6', '2001:db8::1', /enter a valid ipv6 address/i],
			[/json web token/i, 'not-a-jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature', /enter a valid jwt/i],
			[/base64 value/i, 'not base64', 'aGVsbG8=', /enter base64 data/i],
			[
				/sha-256 hash/i,
				'not-a-hash',
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				/enter a valid sha-256 hash/i,
			],
			[/cuid/i, 'not-a-cuid', 'c1234567890abcdef1234567', /enter a valid cuid/i],
			[/ulid/i, 'not-a-ulid', '01ARZ3NDEKTSV4RRFFQ69G5FAV', /enter a valid ulid/i],
			[/hexadecimal value/i, 'not hexadecimal', 'deadbeef', /enter hexadecimal characters/i],
		] as const) {
			await playFieldFocusAndType(canvasElement, label, invalidValue);
			await clickSubmit(canvasElement, /validate formats/i);
			await expectFieldError(canvasElement, error);
			await playFieldFocusAndType(canvasElement, label, validValue);
			await expectNoFieldError(canvasElement, error);
		}
	}),
};

export const AsyncUsernameAvailability: Story = {
	args: {
		config: {
			...fieldFormConfig('async-username-validation', 'Async username availability', [
				{
					$type: 'input',
					id: 'username',
					name: 'username',
					label: 'Username',
					rules: [
						{ type: 'required', message: 'Username is required > test: taken-user' },
						{
							type: 'async',
							url: '/api/validate-username',
							debounce: 100,
							disableCache: true,
							message: 'That username is unavailable',
						},
					],
				},
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Check availability' },
			]),
			reValidateMode: 'onChange',
		},
	},
	beforeEach: installUsernameValidationFetch,
	play: whenInteractive(async ({ canvasElement }) => {
		await clickSubmit(canvasElement, /check availability/i);
		await expectFieldError(canvasElement, /username is required/i);
		await playFieldFocusAndType(canvasElement, /username/i, 'taken-user');
		await clickSubmit(canvasElement, /check availability/i);
		await expectFieldError(canvasElement, /that username is unavailable/i);
		await playFieldFocusAndType(canvasElement, /username/i, 'available-user');
		await expectNoFieldError(canvasElement, /that username is unavailable/i);
	}),
};

function installUsernameValidationFetch() {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url !== '/api/validate-username') {
			return originalFetch(input, init);
		}

		const body = typeof init?.body === 'string' ? init.body : '{}';
		const payload = JSON.parse(body) as { value?: string };
		return Response.json(
			payload.value === 'taken-user'
				? { valid: false, message: 'That username is unavailable' }
				: { valid: true },
		);
	};

	return () => {
		globalThis.fetch = originalFetch;
	};
}
