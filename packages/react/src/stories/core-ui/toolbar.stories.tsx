import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarGroup } from '@/components/core-ui/toolbar';
import { ToggleGroup } from '@/components/core-ui/toggle-group';
import { Toggle } from '@/components/core-ui/toggle';
import { Bold, Italic, Underline, Link2 } from 'lucide-react';

const meta = {
	title: 'Core UI/Toolbar',
	component: Toolbar,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Toolbar>
			<ToolbarGroup>
				<ToggleGroup>
					<Toggle value="bold" aria-label="Bold">
						<Bold className="h-4 w-4" />
					</Toggle>
					<Toggle value="italic" aria-label="Italic">
						<Italic className="h-4 w-4" />
					</Toggle>
					<Toggle value="underline" aria-label="Underline">
						<Underline className="h-4 w-4" />
					</Toggle>
				</ToggleGroup>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarButton aria-label="Link">
				<Link2 className="h-4 w-4" />
			</ToolbarButton>
		</Toolbar>
	),
};

export const TextFormatting: Story = {
	render: () => (
		<Toolbar>
			<ToolbarGroup>
				<ToggleGroup>
					<Toggle value="bold" aria-label="Bold">
						<Bold className="h-4 w-4" />
					</Toggle>
					<Toggle value="italic" aria-label="Italic">
						<Italic className="h-4 w-4" />
					</Toggle>
					<Toggle value="underline" aria-label="Underline">
						<Underline className="h-4 w-4" />
					</Toggle>
				</ToggleGroup>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup>
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
			</ToolbarGroup>
		</Toolbar>
	),
};

export const Mixed: Story = {
	render: () => (
		<Toolbar>
			<ToolbarGroup>
				<ToggleGroup>
					<Toggle value="bold">Bold</Toggle>
					<Toggle value="italic">Italic</Toggle>
				</ToggleGroup>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarButton>Clear</ToolbarButton>
			<ToolbarButton>Save</ToolbarButton>
		</Toolbar>
	),
};
