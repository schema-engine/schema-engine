import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story.js';

const meta = {
	...formRendererMeta,
	title: 'Capabilities/SSR acceptance',
	args: {
		class: 'se-form-story--full',
		config: {
			id: 'ssr-layout-acceptance',
			title: 'SSR layout acceptance',
			grid: {
				columns: 1,
				responsive: { sm: { columns: 2 } },
			},
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'input',
							id: 'tracked',
							name: 'tracked',
							label: 'Tracked field',
							grid: {
								column: 'span 1',
								responsive: { md: { column: 'span 2', hidden: true } },
							},
						},
						{ $type: 'input', id: 'visible', name: 'visible', label: 'Visible field' },
					],
				},
			],
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'SSR layout acceptance is enforced by `test/ssr/grid-layout-ssr.markup.test.ts` and `test/ssr/grid-layout-ssr.acceptance.browser.test.ts` (compiled stylesheet and layout in an isolated iframe, no app JS). This story is a visual reference only.',
			},
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VisualReference: Story = {};
