import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@/components/core-ui/checkbox';
import { Label } from '@/components/core-ui/label';

const meta = {
	component: Checkbox,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A checkbox input component built on Base UI.',
			},
		},
	},
	argTypes: {
		checked: {
			control: 'boolean',
			description: 'Whether the checkbox is checked',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the checkbox',
		},
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		defaultChecked: false,
	},
};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		defaultChecked: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox />
			<Label className="cursor-pointer font-normal">Accept terms and conditions</Label>
		</div>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="space-y-3">
			<div className="flex items-center space-x-2">
				<Checkbox defaultChecked />
				<Label className="cursor-pointer font-normal">Option 1</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox />
				<Label className="cursor-pointer font-normal">Option 2</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox defaultChecked />
				<Label className="cursor-pointer font-normal">Option 3</Label>
			</div>
		</div>
	),
};

export const Group: Story = {
	render: () => (
		<fieldset className="space-y-3">
			<legend className="text-sm font-semibold mb-3">Select your interests</legend>
			<div className="flex items-center space-x-2">
				<Checkbox />
				<Label className="cursor-pointer font-normal">React</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox />
				<Label className="cursor-pointer font-normal">TypeScript</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox />
				<Label className="cursor-pointer font-normal">Web Development</Label>
			</div>
		</fieldset>
	),
};
