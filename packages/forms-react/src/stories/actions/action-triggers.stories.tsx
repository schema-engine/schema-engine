import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { submitFormHandler } from '../msw/submit-form.js';
import { getEngine } from '@/stories/shared/form-builder.ui.js';
import { InteractiveActionDemo } from './action-triggers.demo.js';
import { realtimeDashboardPlay } from './action-triggers.play.js';

const simpleEngine = getEngine();

const meta = {
	title: 'Capabilities/Actions',
	component: InteractiveActionDemo,
	parameters: {
		layout: 'padded',
		msw: {
			handlers: [submitFormHandler],
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={simpleEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	tags: ['autodocs'],
} satisfies Meta<typeof InteractiveActionDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RealtimeDashboard: Story = {
	render: InteractiveActionDemo,
	play: realtimeDashboardPlay,
};
