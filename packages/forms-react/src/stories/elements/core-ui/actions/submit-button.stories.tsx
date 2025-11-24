import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets, createExtendableBuilder } from '@/stories/shared/form-builder.ui';
import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@schema-engine/forms/types';
import { FormActionTriggerSchema, type ActionExecutionResult } from '@schema-engine/forms';

declare global {
	interface Window {
		confetti?: (options: unknown) => Promise<void>;
	}
}

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
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
		config: createForm()
			.setId('submit-default')
			.setTitle('Submit Button')
			.addStep({ id: 'step-1', title: 'Simple Form' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Name',
				placeholder: 'Enter your name',
				inputType: 'text',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit',
			})
			.build(),
	},
};

export const CustomLabel: Story = {
	args: {
		config: createForm()
			.setId('submit-custom-label')
			.setTitle('Custom Button Label')
			.addStep({ id: 'step-1', title: 'Registration' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'your.email@example.com',
				inputType: 'email',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Account',
			})
			.build(),
	},
};

export const WithFormValidation: Story = {
	args: {
		config: createForm()
			.setId('submit-validation')
			.setTitle('Form Validation')
			.setDescription('Submit button is only enabled when form is valid')
			.addStep({ id: 'step-1', title: 'Contact Form' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required('Name is required'), ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email('Please enter a valid email')],
			})
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Your message...',
				rows: 4,
				rules: [
					ValidationPresets.string.required('Message is required'),
					ValidationPresets.string.minLength(10, 'Message must be at least 10 characters'),
				],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Send Message',
			})
			.build(),
	},
};

export const LoginForm: Story = {
	args: {
		config: createForm()
			.setId('submit-login')
			.setTitle('Login')
			.addStep({ id: 'step-1', title: 'Sign In' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'your.email@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				placeholder: 'Enter your password',
				inputType: 'password',
				rules: [ValidationPresets.string.required('Password is required')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Sign In',
			})
			.build(),
	},
};

export const SignupForm: Story = {
	args: {
		config: createForm()
			.setId('submit-signup')
			.setTitle('Create Account')
			.setDescription('Sign up for a free account')
			.addStep({ id: 'step-1', title: 'Registration' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				inputType: 'password',
				description: 'At least 8 characters',
				rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(8)],
			})
			.addElement('checkbox', {
				id: 'terms',
				name: 'terms',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required('You must accept the terms')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Account',
			})
			.build(),
	},
};

export const SubscriptionForm: Story = {
	args: {
		config: createForm()
			.setId('submit-subscription')
			.setTitle('Subscribe')
			.setDescription('Join our newsletter')
			.addStep({ id: 'step-1', title: 'Newsletter' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'your.email@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email('Please enter a valid email')],
			})
			.addElement('select', {
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
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Subscribe Now',
			})
			.build(),
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
		schema: ConfettiActionSchema,
		metadata: {
			name: 'Confetti',
			description: 'Throw confetti on the screen',
			icon: 'sparkles',
			defaultTriggers: ['form_submit'],
		},
		execute: async (context: BuilderActionExecutionContext<ConfettiAction>): Promise<ActionExecutionResult> => {
			const action = context.config;

			try {
				if (typeof window === 'undefined') {
					return { success: true, message: 'Confetti skipped in SSR', shouldContinue: true };
				}

				if (!window.confetti) {
					return { success: false, error: 'Confetti library not available', shouldContinue: true };
				}

				await window.confetti({
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

const confettiBuilder = createExtendableBuilder().addAction(confettiPlugin());
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
			if (typeof window !== 'undefined' && !window.confetti) {
				const script = document.createElement('script');
				script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
				script.async = true;
				document.head.appendChild(script);
			}
			return (
				<StoryWrapper engine={confettiEngine}>
					<Story />
				</StoryWrapper>
			);
		},
	],
	args: {
		config: confettiBuilder
			.createForm()
			.setId('submit-confetti')
			.setTitle('Celebrate with Confetti')
			.setDescription('Submit the form and watch the magic happen')
			.addStep({ id: 'step-1', title: 'Contact Info' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Your Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit and Celebrate',
			})
			.addFormAction('confetti', {
				id: 'throw-confetti',
				enabled: true,
				particleCount: 200,
				spread: 90,
				origin: { y: 0.6 },
			})
			.build(),
	},
};
