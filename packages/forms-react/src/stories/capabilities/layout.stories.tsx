import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { defineStoryForm, getEngine } from '@/stories/shared/form-builder.ui.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { responsiveColumnsPlay, responsiveFieldSpansPlay } from './layout.play.js';

const engine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine,
		config: defineStoryForm({
			id: 'layout-responsive-columns',
			title: 'Responsive columns',
			grid: {
				columns: 1,
				gap: 'default',
				responsive: {
					sm: { columns: 2 },
					lg: { columns: 3 },
				},
			},
			steps: [
				{
					id: 'contact',
					title: 'Contact details',
					elements: [
						{ $type: 'input', id: 'first-name', name: 'firstName', label: 'First name' },
						{ $type: 'input', id: 'last-name', name: 'lastName', label: 'Last name' },
						{ $type: 'input', id: 'email', name: 'email', label: 'Work email', inputType: 'email' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Create account' },
					],
				},
			],
		}),
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={engine}>
				<Story />
			</StoryWrapper>
		),
	],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveColumns: Story = {
	play: responsiveColumnsPlay,
};

export const ResponsiveFieldSpans: Story = {
	args: {
		config: defineStoryForm({
			id: 'layout-responsive-field-spans',
			title: 'Responsive field spans',
			grid: {
				columns: 1,
				gap: 'default',
				responsive: {
					md: { columns: 2 },
				},
			},
			steps: [
				{
					id: 'contact',
					title: 'Contact details',
					elements: [
						{
							$type: 'input',
							id: 'full-name',
							name: 'fullName',
							label: 'Full name',
							grid: {
								responsive: {
									md: { column: 'span 2' },
								},
							},
						},
						{ $type: 'input', id: 'email', name: 'email', label: 'Work email', inputType: 'email' },
						{ $type: 'input', id: 'phone', name: 'phone', label: 'Phone number' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Create account' },
					],
				},
			],
		}),
	},
	play: responsiveFieldSpansPlay,
};
