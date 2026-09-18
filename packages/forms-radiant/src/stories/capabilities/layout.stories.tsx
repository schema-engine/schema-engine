import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story';
import { responsiveColumnsPlay, responsiveFieldSpansPlay } from './layout.play';

const meta = {
	...formRendererMeta,
	args: {
		className: 'se-form-story--full',
		config: {
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
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveColumns: Story = {
	play: responsiveColumnsPlay,
};

export const ResponsiveFieldSpans: Story = {
	args: {
		config: {
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
		},
	},
	play: responsiveFieldSpansPlay,
};
