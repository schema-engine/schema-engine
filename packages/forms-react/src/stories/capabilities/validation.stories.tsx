import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import {
	asyncUsernameAvailabilityPlay,
	builtInRulesPlay,
	clearsErrorsAfterValidInputPlay,
	formatRulesPlay,
} from './validation.play.js';

const engine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine,
		config: defineStoryForm({
			id: 'validation-feedback',
			title: 'Validation feedback',
			reValidateMode: 'onChange',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Work email',
							inputType: 'email',
							placeholder: 'name@example.com',
							rules: [
								ValidationPresets.string.required('Work email is required'),
								ValidationPresets.string.email('Enter a valid work email'),
							],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Continue' },
					],
				},
			],
		}),
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={engine}>
				<Story />
			</StoryWrapper>
		),
	],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClearsErrorsAfterValidInput: Story = {
	play: clearsErrorsAfterValidInputPlay,
};

export const BuiltInRules: Story = {
	args: {
		config: defineStoryForm({
			id: 'built-in-validation-rules',
			title: 'Built-in validation rules',
			reValidateMode: 'onChange',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email address',
							inputType: 'email',
							rules: [
								ValidationPresets.string.required('Email address is required'),
								ValidationPresets.string.email('Enter a valid email address'),
							],
						},
						{
							$type: 'input',
							id: 'password',
							name: 'password',
							label: 'Password',
							inputType: 'password',
							rules: [
								ValidationPresets.string.minLength(8, 'Use at least 8 characters'),
								ValidationPresets.string.pattern('(?=.*\\d)', 'Include at least one number'),
							],
						},
						{
							$type: 'number',
							id: 'team-size',
							name: 'teamSize',
							label: 'Team size',
							rules: [
								ValidationPresets.number.min(1, 'At least one person is required'),
								ValidationPresets.number.max(100, 'Use a number below 101'),
							],
						},
						{
							$type: 'input',
							id: 'website',
							name: 'website',
							label: 'Website URL',
							inputType: 'url',
							rules: [ValidationPresets.string.url('Enter a valid URL')],
						},
						{
							$type: 'input',
							id: 'server',
							name: 'server',
							label: 'Server IPv4 address',
							rules: [{ $type: 'ipv4', message: 'Enter a valid IPv4 address' }],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Validate fields' },
					],
				},
			],
		}),
	},
	play: builtInRulesPlay,
};

export const FormatRules: Story = {
	args: {
		config: defineStoryForm({
			id: 'format-validation-rules',
			title: 'Format validation rules',
			reValidateMode: 'onChange',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'input',
							id: 'uuid',
							name: 'uuid',
							label: 'UUID',
							rules: [{ $type: 'uuid', message: 'Enter a valid UUID' }],
						},
						{
							$type: 'input',
							id: 'ipv6',
							name: 'ipv6',
							label: 'Server IPv6 address',
							rules: [{ $type: 'ipv6', message: 'Enter a valid IPv6 address' }],
						},
						{
							$type: 'input',
							id: 'jwt',
							name: 'jwt',
							label: 'JSON Web Token',
							rules: [{ $type: 'jwt', message: 'Enter a valid JWT' }],
						},
						{
							$type: 'input',
							id: 'base64',
							name: 'base64',
							label: 'Base64 value',
							rules: [{ $type: 'base64', message: 'Enter Base64 data' }],
						},
						{
							$type: 'input',
							id: 'hash',
							name: 'hash',
							label: 'SHA-256 hash',
							rules: [{ $type: 'hash', algorithm: 'sha256', message: 'Enter a valid SHA-256 hash' }],
						},
						{
							$type: 'input',
							id: 'cuid',
							name: 'cuid',
							label: 'CUID',
							rules: [{ $type: 'cuid', message: 'Enter a valid CUID' }],
						},
						{
							$type: 'input',
							id: 'ulid',
							name: 'ulid',
							label: 'ULID',
							rules: [{ $type: 'ulid', message: 'Enter a valid ULID' }],
						},
						{
							$type: 'input',
							id: 'hex',
							name: 'hex',
							label: 'Hexadecimal value',
							rules: [{ $type: 'hex', message: 'Enter hexadecimal characters' }],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Validate formats' },
					],
				},
			],
		}),
	},
	play: formatRulesPlay,
};

export const AsyncUsernameAvailability: Story = {
	args: {
		config: defineStoryForm({
			id: 'async-username-validation',
			title: 'Async username availability',
			reValidateMode: 'onChange',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'input',
							id: 'username',
							name: 'username',
							label: 'Username',
							rules: [
								ValidationPresets.string.required('Username is required'),
								{
									$type: 'async',
									url: '/api/validate-username',
									debounce: 100,
									disableCache: true,
									message: 'That username is unavailable',
								},
							],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Check availability' },
					],
				},
			],
		}),
	},
	parameters: {
		msw: { handlers: [] },
	},
	beforeEach: installUsernameValidationFetch,
	play: asyncUsernameAvailabilityPlay,
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
