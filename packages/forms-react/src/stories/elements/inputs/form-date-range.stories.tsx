import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { defineStoryForm, getEngine } from '@/stories/shared/form-builder.ui';

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
				component:
					'Date range picker with presets, text inputs, and Apply/Cancel. Values are stored as `{ from, to }` ISO dates.',
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
			id: 'date-range-default',
			title: 'Date Range Field',
			steps: [
				{
					id: 'step-1',
					title: 'Select Dates',
					elements: [
						{
							$type: 'date-range',
							id: 'tripDates',
							name: 'tripDates',
							label: 'Trip dates',
							placeholder: 'Pick a date range',
							numberOfMonths: 2,
							presets: true,
							description: 'Select your check-in and check-out dates',
						},
					],
				},
			],
		}),
	},
};
