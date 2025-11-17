import type { Meta, StoryObj } from '@storybook/react-vite';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/core-ui/collapsible';
import { Button } from '@/components/core-ui/button';
import { ChevronDown } from 'lucide-react';

const meta = {
	component: Collapsible,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A collapsible component for hiding and revealing content.',
			},
		},
	},
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Collapsible defaultOpen={false}>
			<CollapsibleTrigger>
				<Button variant="ghost" className="w-full justify-between">
					Click to expand
					<ChevronDown className="h-4 w-4" />
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="p-4">
				This is the hidden content that appears when expanded.
			</CollapsibleContent>
		</Collapsible>
	),
};

export const Open: Story = {
	render: () => (
		<Collapsible defaultOpen={true}>
			<CollapsibleTrigger>
				<Button variant="ghost" className="w-full justify-between">
					Click to collapse
					<ChevronDown className="h-4 w-4" />
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="p-4">This content is visible by default.</CollapsibleContent>
		</Collapsible>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm">
			<Collapsible>
				<CollapsibleTrigger>
					<Button variant="ghost" className="w-full justify-between">
						Section 1
						<ChevronDown className="h-4 w-4" />
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-4">Content 1</CollapsibleContent>
			</Collapsible>
			<Collapsible>
				<CollapsibleTrigger>
					<Button variant="ghost" className="w-full justify-between">
						Section 2
						<ChevronDown className="h-4 w-4" />
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-4">Content 2</CollapsibleContent>
			</Collapsible>
		</div>
	),
};
