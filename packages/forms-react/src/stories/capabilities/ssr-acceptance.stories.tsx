import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { getSsrAcceptanceFixture } from '../../../test/ssr/ssr-fixture';

const { engine, config } = getSsrAcceptanceFixture();

const meta = {
	title: 'Capabilities/SSR acceptance',
	component: FormRenderer,
	parameters: {
		docs: {
			description: {
				component:
					'SSR layout acceptance is enforced by `test/ssr/grid-layout-ssr.acceptance.browser.test.tsx` (renderToStaticMarkup, no app JS). This story is a visual reference only.',
			},
		},
	},
	args: {
		engine,
		config,
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

export const VisualReference: Story = {};
