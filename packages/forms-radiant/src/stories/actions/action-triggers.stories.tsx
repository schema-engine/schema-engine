import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { ActionTriggersDemo } from './action-triggers.demo';
import { realtimeDashboardPlay } from './action-triggers.play';

const meta = {
	component: ActionTriggersDemo,
	parameters: {
		layout: 'padded',
		radiant: { renderMode: 'client' },
	},
} satisfies Meta<typeof ActionTriggersDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RealtimeDashboard: Story = {
	play: realtimeDashboardPlay,
};
