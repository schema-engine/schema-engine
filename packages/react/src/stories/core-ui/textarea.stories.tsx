import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '@/components/core-ui/textarea';
import { Label } from '@/components/core-ui/label';

const meta = {
	component: Textarea,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A textarea component for multi-line text input.',
			},
		},
	},
	argTypes: {
		placeholder: {
			control: 'text',
			description: 'Placeholder text',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the textarea',
		},
		rows: {
			control: 'number',
			description: 'Number of rows',
		},
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Enter your message here...',
		rows: 4,
	},
};

export const Small: Story = {
	args: {
		placeholder: 'Small textarea',
		rows: 2,
	},
};

export const Large: Story = {
	args: {
		placeholder: 'Large textarea for detailed input...',
		rows: 8,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="space-y-2 max-w-md">
			<Label>Message</Label>
			<Textarea placeholder="Enter your message..." rows={4} />
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className="space-y-1 max-w-md">
			<Label>Feedback</Label>
			<Textarea placeholder="Tell us what you think..." rows={4} />
			<p className="text-xs text-muted-foreground">Your feedback helps us improve</p>
		</div>
	),
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultValue: 'This textarea is disabled and cannot be edited',
		rows: 4,
	},
};

export const ReadOnly: Story = {
	args: {
		readOnly: true,
		defaultValue: 'This is read-only content that cannot be modified.',
		rows: 4,
	},
};
