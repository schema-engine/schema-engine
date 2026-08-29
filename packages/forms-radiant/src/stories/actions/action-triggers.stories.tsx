import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { ActionTriggersDemo } from './action-triggers.demo';

const meta = {
	title: 'Actions/Action Triggers',
	component: ActionTriggersDemo,
	parameters: {
		layout: 'padded',
		radiant: { renderMode: 'client' },
	},
} satisfies Meta<typeof ActionTriggersDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RealtimeDashboard: Story = {};
