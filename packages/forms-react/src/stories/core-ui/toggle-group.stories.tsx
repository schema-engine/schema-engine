import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup } from '@/components/core-ui/toggle-group';
import { Toggle } from '@/components/core-ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const meta = {
	component: ToggleGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<ToggleGroup>
			<Toggle value="bold" aria-label="Toggle bold">
				<Bold className="h-4 w-4" />
			</Toggle>
			<Toggle value="italic" aria-label="Toggle italic">
				<Italic className="h-4 w-4" />
			</Toggle>
			<Toggle value="underline" aria-label="Toggle underline">
				<Underline className="h-4 w-4" />
			</Toggle>
		</ToggleGroup>
	),
};

export const Single: Story = {
	render: () => (
		<ToggleGroup>
			<Toggle value="left" aria-label="Align left">
				Left
			</Toggle>
			<Toggle value="center" aria-label="Align center">
				Center
			</Toggle>
			<Toggle value="right" aria-label="Align right">
				Right
			</Toggle>
		</ToggleGroup>
	),
};

export const Playground: Story = {
	args: {},
	render: () => (
		<ToggleGroup>
			<Toggle value="list" aria-label="List view">
				List
			</Toggle>
			<Toggle value="grid" aria-label="Grid view">
				Grid
			</Toggle>
			<Toggle value="compact" aria-label="Compact view">
				Compact
			</Toggle>
		</ToggleGroup>
	),
};

export const Disabled: Story = {
	render: () => (
		<ToggleGroup>
			<Toggle value="bold" aria-label="Toggle bold" disabled>
				Bold
			</Toggle>
			<Toggle value="italic" aria-label="Toggle italic" disabled>
				Italic
			</Toggle>
		</ToggleGroup>
	),
};
