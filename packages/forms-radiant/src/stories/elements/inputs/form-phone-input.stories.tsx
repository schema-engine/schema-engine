import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createDefaultFieldPlay, createValidationFieldPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Phone Input',
	args: {
		config: fieldFormConfig('phone-input-default', 'Phone Number', [
			{
				$type: 'phone-input',
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				defaultCountry: 'US',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: createDefaultFieldPlay(/phone number/i, '+15551234567'),
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('phone-input-validation', 'Phone Number', [
			{
				$type: 'phone-input',
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				rules: [{ type: 'required', message: 'Phone number is required' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/phone number/i, '+15551234567', /submit/i, /phone number is required/i),
};
