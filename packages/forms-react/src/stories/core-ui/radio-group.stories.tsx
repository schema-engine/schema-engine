import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '@/components/core-ui/radio-group';
import { Label } from '@/components/core-ui/label';

const meta = {
	component: RadioGroup,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A radio group component for selecting a single option from multiple choices.',
			},
		},
	},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue="option1">
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option1" />
				<Label className="cursor-pointer font-normal">Option 1</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option2" />
				<Label className="cursor-pointer font-normal">Option 2</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option3" />
				<Label className="cursor-pointer font-normal">Option 3</Label>
			</div>
		</RadioGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<RadioGroup defaultValue="small" className="flex flex-col gap-3">
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="small" />
				<Label className="cursor-pointer font-normal">Small</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="medium" />
				<Label className="cursor-pointer font-normal">Medium</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="large" />
				<Label className="cursor-pointer font-normal">Large</Label>
			</div>
		</RadioGroup>
	),
};

export const Horizontal: Story = {
	render: () => (
		<RadioGroup defaultValue="yes" className="flex gap-4">
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="yes" />
				<Label className="cursor-pointer font-normal">Yes</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="no" />
				<Label className="cursor-pointer font-normal">No</Label>
			</div>
		</RadioGroup>
	),
};

export const Disabled: Story = {
	render: () => (
		<RadioGroup defaultValue="option1" disabled>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option1" disabled />
				<Label className="cursor-pointer font-normal opacity-50">Option 1</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option2" disabled />
				<Label className="cursor-pointer font-normal opacity-50">Option 2</Label>
			</div>
		</RadioGroup>
	),
};
