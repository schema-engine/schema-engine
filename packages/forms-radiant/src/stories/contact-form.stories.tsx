import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { formRendererMeta } from '@/stories/shared/form-story';
import { playContactFormValidation } from '@/stories/shared/play';

const formConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	mode: 'free',
	steps: [
		{
			id: 'step-1',
			title: 'Your Information',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 4,
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Send message',
				},
			],
		},
	],
};

const meta = {
	...formRendererMeta,
	title: 'Forms/Contact Form',
	args: {
		config: formConfig,
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: playContactFormValidation,
};
