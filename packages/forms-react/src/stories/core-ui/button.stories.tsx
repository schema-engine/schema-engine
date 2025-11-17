import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/core-ui/button';
import { Heart, Settings, Plus } from 'lucide-react';

const meta = {
	component: Button,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A versatile button component with multiple variants and sizes built on Base UI.',
			},
		},
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'secondary', 'ghost', 'outline', 'link', 'destructive'],
			description: 'The visual variant of the button',
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg', 'icon-sm', 'icon', 'icon-lg'],
			description: 'The size of the button',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the button',
		},
		children: {
			control: 'text',
			description: 'Button content',
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		variant: 'default',
		size: 'md',
		children: 'Click me',
	},
};

export const Variants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Button variant="default">Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="link">Link</Button>
			<Button variant="destructive">Destructive</Button>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-2">
			<Button size="sm">Small</Button>
			<Button size="md">Medium</Button>
			<Button size="lg">Large</Button>
		</div>
	),
};

export const IconSizes: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-2">
			<Button size="icon-sm">
				<Plus />
			</Button>
			<Button size="icon">
				<Heart />
			</Button>
			<Button size="icon-lg">
				<Settings />
			</Button>
		</div>
	),
};

export const WithIcon: Story = {
	args: {
		children: 'Click me',
	},
	render: (args) => (
		<Button {...args}>
			<Plus /> Add Item
		</Button>
	),
};

export const Disabled: Story = {
	args: {
		children: 'Disabled Button',
		disabled: true,
	},
	render: (args) => <Button {...args} />,
};

export const Loading: Story = {
	args: {
		children: 'Loading...',
		disabled: true,
	},
	render: (args) => <Button {...args} />,
};
