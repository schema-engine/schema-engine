/**
 * Test Story to Debug Adapter Context Issue
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryWrapper } from './shared/story-wrapper';
import { FormEngineProvider } from '@/components/adapter-provider';
import { rhfAdapter } from '@/components/adapters/rhf';
import { defaultFormEngine } from './shared/form-engine-setup';

function AdapterTestInner() {
	return (
		<div style={{ padding: '2rem', background: '#e8f5e9', borderRadius: '8px' }}>
			<h2 style={{ color: '#2e7d32' }}>✓ Adapter Context Working!</h2>
			<p>If you see this, the FormEngineProvider is correctly providing the adapter context.</p>
		</div>
	);
}

function AdapterTest() {
	return (
		<FormEngineProvider engine={defaultFormEngine} adapter={rhfAdapter}>
			<AdapterTestInner />
		</FormEngineProvider>
	);
}

const meta = {
	title: 'Debug/Adapter Context Test',
	component: AdapterTest,
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
} satisfies Meta<typeof AdapterTest>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
