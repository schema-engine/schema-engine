import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { ActionTriggersDemo } from './action-triggers.demo';
import { realtimeDashboardPlay } from './action-triggers.play';

const meta = {
	title: 'Capabilities/Actions',
	component: ActionTriggersDemo,
	parameters: {
		layout: 'padded',
		radiant: { cssImports: ['./action-triggers.demo.css'] },
	},
} satisfies Meta<typeof ActionTriggersDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RealtimeDashboard: Story = {
	play: realtimeDashboardPlay,
};
