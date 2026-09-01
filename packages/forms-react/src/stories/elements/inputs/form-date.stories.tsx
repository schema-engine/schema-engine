import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, rhfAdapter } from '@/stories/shared/form-builder.ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
		adapter: rhfAdapter,
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
		adapter: { table: { disable: true } },
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('date-default')
			.setTitle('Date Field')
			.addStep({ id: 'step-1', title: 'Select Date' })
			.addElement('date', {
				id: 'startDate',
				name: 'startDate',
				label: 'Start date',
				placeholder: 'Pick a date',
				description: 'Choose when your project begins',
			})
			.build(),
	},
};

export const WithBounds: Story = {
	args: {
		config: createForm()
			.setId('date-bounds')
			.setTitle('Date Field With Bounds')
			.addStep({ id: 'step-1', title: 'Select Date' })
			.addElement('date', {
				id: 'appointmentDate',
				name: 'appointmentDate',
				label: 'Appointment date',
				min: '2026-01-01',
				max: '2026-12-31',
				description: 'Only dates in 2026 are selectable',
			})
			.build(),
	},
};
