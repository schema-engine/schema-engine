import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { defineStoryForm, getEngine } from '@/stories/shared/form-builder.ui.js';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'Calendar popover for selecting a single ISO date (`YYYY-MM-DD`).',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'date-default',
			title: 'Date Field',
			steps: [
				{
					id: 'step-1',
					title: 'Select Date',
					elements: [
						{
							$type: 'date',
							id: 'startDate',
							name: 'startDate',
							label: 'Start date',
							placeholder: 'Pick a date',
							description: 'Choose when your project begins',
						},
					],
				},
			],
		}),
	},
};

export const WithBounds: Story = {
	args: {
		config: defineStoryForm({
			id: 'date-bounds',
			title: 'Date Field With Bounds',
			steps: [
				{
					id: 'step-1',
					title: 'Select Date',
					elements: [
						{
							$type: 'date',
							id: 'appointmentDate',
							name: 'appointmentDate',
							label: 'Appointment date',
							min: '2026-01-01',
							max: '2026-12-31',
							description: 'Only dates in 2026 are selectable',
						},
					],
				},
			],
		}),
	},
};
