import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import {
	defineStoryForm,
	getEngine,
	ValidationPresets,
	createExtendableComposer,
	rhfAdapter,
} from '@/stories/shared/form-builder.ui';
import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@schema-engine/forms/types';
import { FormActionTriggerSchema, type ActionExecutionResult } from '@schema-engine/forms';
import { SUBMIT_FORM_MOCK_URL } from '@/stories/msw/submit-form';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

const CONFETTI_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';

declare global {
	interface Window {
		confetti?: (options: unknown) => Promise<void>;
	}
}

function loadConfetti(): Promise<(options: unknown) => Promise<void>> {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Confetti is not available in SSR'));
	}

	if (window.confetti) {
		return Promise.resolve(window.confetti);
	}

	const existing = document.querySelector<HTMLScriptElement>(`script[src="${CONFETTI_SCRIPT_SRC}"]`);

	return new Promise((resolve, reject) => {
		const handleLoad = () => {
			if (window.confetti) {
				resolve(window.confetti);
				return;
			}
			reject(new Error('Confetti library not available'));
		};

		if (existing) {
			if (existing.dataset.loaded === 'true') {
				handleLoad();
				return;
			}
			existing.addEventListener('load', handleLoad, { once: true });
			existing.addEventListener('error', () => reject(new Error('Failed to load confetti library')), {
				once: true,
			});
			return;
		}

		const script = document.createElement('script');
		script.src = CONFETTI_SCRIPT_SRC;
		script.async = true;
		script.addEventListener('load', () => {
			script.dataset.loaded = 'true';
			handleLoad();
		});
		script.addEventListener('error', () => reject(new Error('Failed to load confetti library')), { once: true });
		document.head.appendChild(script);
	});
}

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'Submit button element for form submission. Base UI implementation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with submit button',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-default',
			title: 'Submit Button',
			steps: [
				{
					id: 'step-1',
					title: 'Simple Form',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Name',
							placeholder: 'Enter your name',
							inputType: 'text',
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
					],
				},
			],
		}),
	},
};

export const CustomLabel: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-custom-label',
			title: 'Custom Button Label',
			steps: [
				{
					id: 'step-1',
					title: 'Registration',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							placeholder: 'your.email@example.com',
							inputType: 'email',
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Create Account' },
					],
				},
			],
		}),
	},
};

export const WithFormValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-validation',
			title: 'Form Validation',
			description: 'Submit button is only enabled when form is valid',
			steps: [
				{
					id: 'step-1',
					title: 'Contact Form',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Full Name',
							placeholder: 'John Doe',
							inputType: 'text',
							rules: [
								ValidationPresets.string.required('Name is required'),
								ValidationPresets.string.minLength(2),
							],
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email Address',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.email('Please enter a valid email')],
						},
						{
							$type: 'textarea',
							id: 'message',
							name: 'message',
							label: 'Message',
							placeholder: 'Your message...',
							rows: 4,
							rules: [
								ValidationPresets.string.required('Message is required'),
								ValidationPresets.string.minLength(10, 'Message must be at least 10 characters'),
							],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send Message' },
					],
				},
			],
		}),
	},
};

export const LoginForm: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-login',
			title: 'Login',
			steps: [
				{
					id: 'step-1',
					title: 'Sign In',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							placeholder: 'your.email@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.email()],
						},
						{
							$type: 'input',
							id: 'password',
							name: 'password',
							label: 'Password',
							placeholder: 'Enter your password',
							inputType: 'password',
							rules: [ValidationPresets.string.required('Password is required')],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Sign In' },
					],
				},
			],
		}),
	},
};

export const SignupForm: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-signup',
			title: 'Create Account',
			description: 'Sign up for a free account',
			steps: [
				{
					id: 'step-1',
					title: 'Registration',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Full Name',
							placeholder: 'John Doe',
							inputType: 'text',
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.email()],
						},
						{
							$type: 'input',
							id: 'password',
							name: 'password',
							label: 'Password',
							inputType: 'password',
							description: 'At least 8 characters',
							rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(8)],
						},
						{
							$type: 'checkbox',
							id: 'terms',
							name: 'terms',
							label: 'I agree to the terms and conditions',
							rules: [ValidationPresets.string.required('You must accept the terms')],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Create Account' },
					],
				},
			],
		}),
	},
};

export const SubscriptionForm: Story = {
	args: {
		config: defineStoryForm({
			id: 'submit-subscription',
			title: 'Subscribe',
			description: 'Join our newsletter',
			steps: [
				{
					id: 'step-1',
					title: 'Newsletter',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email Address',
							placeholder: 'your.email@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.email('Please enter a valid email')],
						},
						{
							$type: 'select',
							id: 'frequency',
							name: 'frequency',
							label: 'Email Frequency',
							placeholder: 'Select frequency',
							options: [
								{ value: 'daily', label: 'Daily' },
								{ value: 'weekly', label: 'Weekly' },
								{ value: 'monthly', label: 'Monthly' },
							],
							rules: [ValidationPresets.string.required()],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Subscribe Now' },
					],
				},
			],
		}),
	},
};

const ConfettiActionSchema = z.object({
	id: z.string(),
	$type: z.literal('confetti'),
	description: z.string().optional(),
	enabled: z.boolean().default(true),
	triggers: z.array(FormActionTriggerSchema).optional(),
	particleCount: z.number().default(100).optional(),
	spread: z.number().default(70).optional(),
	origin: z.object({ y: z.number() }).default({ y: 0.6 }).optional(),
});

type ConfettiAction = z.infer<typeof ConfettiActionSchema>;

function confettiPlugin(): BuilderActionRegistration<'confetti', ConfettiAction> {
	return {
		$type: 'confetti',
		schema: asStandardSchema(ConfettiActionSchema),
		metadata: {
			name: 'Confetti',
			description: 'Throw confetti on the screen',
			icon: 'sparkles',
			defaultTriggers: ['form_submit_success'],
		},
		execute: async (context: BuilderActionExecutionContext<ConfettiAction>): Promise<ActionExecutionResult> => {
			const action = context.config;

			try {
				if (typeof window === 'undefined') {
					return { success: true, message: 'Confetti skipped in SSR', shouldContinue: true };
				}

				const confetti = await loadConfetti();
				await confetti({
					particleCount: action.particleCount,
					spread: action.spread,
					origin: action.origin,
				});

				return { success: true, message: 'Confetti thrown successfully', shouldContinue: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to throw confetti',
					shouldContinue: true,
				};
			}
		},
	};
}

const confettiBuilder = createExtendableComposer().addAction(confettiPlugin());
const confettiEngine = confettiBuilder.build();

export const WithConfetti: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Form with a custom confetti action that throws confetti on successful submission. Uses confetti-js loaded via CDN. The confetti action is registered via extend() method and a custom engine is provided.',
			},
		},
	},
	decorators: [
		(Story) => {
			void loadConfetti();
			return (
				<StoryWrapper engine={confettiEngine}>
					<Story />
				</StoryWrapper>
			);
		},
	],
	args: {
		engine: confettiEngine,
		config: confettiEngine.defineForm({
			id: 'submit-confetti',
			title: 'Celebrate with Confetti',
			description: 'Submit the form and watch the magic happen',
			actions: [
				{ $type: 'submit', id: 'submit-form', endpoint: SUBMIT_FORM_MOCK_URL, method: 'POST', enabled: true },
				{
					$type: 'confetti',
					id: 'throw-confetti',
					enabled: true,
					triggers: ['form_submit_success'],
					particleCount: 200,
					spread: 90,
					origin: { y: 0.6 },
				},
			],
			steps: [
				{
					id: 'step-1',
					title: 'Contact Info',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Your Name',
							placeholder: 'John Doe',
							inputType: 'text',
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.email()],
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit and Celebrate' },
					],
				},
			],
		}),
	},
};
