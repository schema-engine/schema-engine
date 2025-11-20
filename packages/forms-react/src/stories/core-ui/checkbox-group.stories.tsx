import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckboxGroup } from '@/components/core-ui/checkbox-group';
import { Label } from '@/components/core-ui/label';
import { Checkbox } from '@/components/core-ui/checkbox';

const meta = {
	component: CheckboxGroup,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A checkbox group component for selecting multiple options.',
			},
		},
	},
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['option1']}>
			<div className="flex items-center space-x-2">
				<Checkbox value="option1" />
				<Label className="cursor-pointer font-normal">Option 1</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox value="option2" />
				<Label className="cursor-pointer font-normal">Option 2</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox value="option3" />
				<Label className="cursor-pointer font-normal">Option 3</Label>
			</div>
		</CheckboxGroup>
	),
};

export const Preferences: Story = {
	render: () => (
		<fieldset className="space-y-3">
			<legend className="text-sm font-semibold mb-3">Preferences</legend>
			<CheckboxGroup defaultValue={['email', 'push']}>
				<div className="flex items-center space-x-2">
					<Checkbox value="email" />
					<Label className="cursor-pointer font-normal">Email Notifications</Label>
				</div>
				<div className="flex items-center space-x-2">
					<Checkbox value="push" />
					<Label className="cursor-pointer font-normal">Push Notifications</Label>
				</div>
				<div className="flex items-center space-x-2">
					<Checkbox value="sms" />
					<Label className="cursor-pointer font-normal">SMS Alerts</Label>
				</div>
			</CheckboxGroup>
		</fieldset>
	),
};

export const AllSelected: Story = {
	render: () => (
		<CheckboxGroup defaultValue={['a', 'b', 'c']}>
			<div className="flex items-center space-x-2">
				<Checkbox value="a" />
				<Label className="cursor-pointer font-normal">Item A</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox value="b" />
				<Label className="cursor-pointer font-normal">Item B</Label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox value="c" />
				<Label className="cursor-pointer font-normal">Item C</Label>
			</div>
		</CheckboxGroup>
	),
};
