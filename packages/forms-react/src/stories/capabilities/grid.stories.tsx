import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { defineStoryForm, getEngine } from '@/stories/shared/form-builder.ui.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { autoFitColumnsPlay, columnSpansPlay, rowAndColumnGapPlay, twoColumnsPerRowPlay } from './grid.play.js';

const engine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine,
		config: defineStoryForm({
			id: 'grid-two-columns',
			title: 'Two-column form',
			grid: { columns: 2, gap: 'default' },
			steps: [
				{
					id: 'contact',
					title: 'Contact details',
					elements: [
						{ $type: 'input', id: 'first-name', name: 'firstName', label: 'First name' },
						{ $type: 'input', id: 'last-name', name: 'lastName', label: 'Last name' },
						{ $type: 'input', id: 'email', name: 'email', label: 'Work email', inputType: 'email' },
						{ $type: 'input', id: 'phone', name: 'phone', label: 'Phone number' },
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

export const TwoColumnsPerRow: Story = {
	play: twoColumnsPerRowPlay,
};

export const ColumnSpans: Story = {
	args: {
		config: defineStoryForm({
			id: 'grid-column-spans',
			title: 'Mixed column spans',
			grid: { columns: 3, gap: 'default' },
			steps: [
				{
					id: 'project',
					title: 'New project',
					elements: [
						{
							$type: 'input',
							id: 'project-name',
							name: 'projectName',
							label: 'Project name',
							grid: { column: 'span 2' },
						},
						{ $type: 'input', id: 'owner', name: 'owner', label: 'Owner' },
						{
							$type: 'textarea',
							id: 'description',
							name: 'description',
							label: 'Description',
							grid: { column: '1 / -1' },
						},
						{
							$type: 'submit',
							id: 'submit',
							name: 'submit',
							label: 'Create project',
							grid: { column: '1 / -1' },
						},
					],
				},
			],
		}),
	},
	play: columnSpansPlay,
};

export const AutoFitColumns: Story = {
	args: {
		config: defineStoryForm({
			id: 'grid-auto-fit-columns',
			title: 'Auto-fit columns',
			grid: { columns: 'auto', minColumnWidth: '220px' },
			steps: [
				{
					id: 'tag',
					title: 'New tag',
					elements: [
						{ $type: 'input', id: 'tag-name', name: 'tag', label: 'Tag name' },
						{ $type: 'input', id: 'slug', name: 'slug', label: 'Slug' },
						{ $type: 'input', id: 'owner', name: 'owner', label: 'Owner' },
						{ $type: 'input', id: 'reviewer', name: 'reviewer', label: 'Reviewer' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Save tag' },
					],
				},
			],
		}),
	},
	play: autoFitColumnsPlay,
};

export const RowAndColumnGap: Story = {
	args: {
		config: defineStoryForm({
			id: 'grid-row-column-gap',
			title: 'Separate row and column gaps',
			grid: { columns: 2, gapY: 'loose', gapX: 'compact' },
			steps: [
				{
					id: 'address',
					title: 'Address',
					elements: [
						{ $type: 'input', id: 'street', name: 'street', label: 'Street' },
						{ $type: 'input', id: 'city', name: 'city', label: 'City' },
						{ $type: 'input', id: 'postal-code', name: 'postalCode', label: 'Postal code' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Save address' },
					],
				},
			],
		}),
	},
	play: rowAndColumnGapPlay,
};
