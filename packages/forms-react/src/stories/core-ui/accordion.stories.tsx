import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/core-ui/accordion';

const meta = {
	component: Accordion,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'An accordion component for displaying collapsible content sections built on Base UI.',
			},
		},
	},
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	render: () => (
		<Accordion defaultValue={['item1']}>
			<AccordionItem value="item1">
				<AccordionTrigger>Is it accessible?</AccordionTrigger>
				<AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item2">
				<AccordionTrigger>Is it styled?</AccordionTrigger>
				<AccordionContent>Yes. It comes with default styles that you can customize.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item3">
				<AccordionTrigger>Is it animated?</AccordionTrigger>
				<AccordionContent>Yes. It uses smooth transitions for opening and closing.</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const MultipleOpen: Story = {
	render: () => (
		<Accordion>
			<AccordionItem>
				<AccordionTrigger>Section 1</AccordionTrigger>
				<AccordionContent>
					This is the content for section 1. You can have multiple sections open at once.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem>
				<AccordionTrigger>Section 2</AccordionTrigger>
				<AccordionContent>This is the content for section 2. All sections can remain open.</AccordionContent>
			</AccordionItem>
			<AccordionItem>
				<AccordionTrigger>Section 3</AccordionTrigger>
				<AccordionContent>This is the content for section 3. No automatic closing occurs.</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const WithLongContent: Story = {
	render: () => (
		<Accordion>
			<AccordionItem>
				<AccordionTrigger>What is Form Engine?</AccordionTrigger>
				<AccordionContent>
					Form Engine is a powerful and flexible React library for building dynamic forms with validation,
					conditional rendering, and complex logic. It provides a declarative API for creating sophisticated
					form experiences without repetitive boilerplate code.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem>
				<AccordionTrigger>How do I get started?</AccordionTrigger>
				<AccordionContent>
					Getting started is simple. Install the package using npm or bun, import the necessary components,
					and create your form configuration. Check our documentation for detailed examples and API reference.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem>
				<AccordionTrigger>Can I customize the styling?</AccordionTrigger>
				<AccordionContent>
					Yes, Form Engine is built on top of Tailwind CSS and Base UI, making it highly customizable. You can
					override styles using className props or extend the theme configuration to match your design system.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};

export const Nested: Story = {
	render: () => (
		<Accordion>
			<AccordionItem>
				<AccordionTrigger>Parent Section</AccordionTrigger>
				<AccordionContent>
					<div className="space-y-4">
						<p>This is the main content of the parent section.</p>
						<Accordion>
							<AccordionItem>
								<AccordionTrigger>Nested Section 1</AccordionTrigger>
								<AccordionContent>Nested content 1</AccordionContent>
							</AccordionItem>
							<AccordionItem>
								<AccordionTrigger>Nested Section 2</AccordionTrigger>
								<AccordionContent>Nested content 2</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>
				</AccordionContent>
			</AccordionItem>
			<AccordionItem>
				<AccordionTrigger>Another Section</AccordionTrigger>
				<AccordionContent>This section has no nested content.</AccordionContent>
			</AccordionItem>
		</Accordion>
	),
};
