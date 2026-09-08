import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { submitFormHandler } from '../msw/submit-form';
import { getEngine } from '@/stories/shared/form-builder.ui';
import { InteractiveActionDemo } from './action-triggers.demo';
import { realtimeDashboardPlay } from './action-triggers.play';

const simpleEngine = getEngine();

const meta = {
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
