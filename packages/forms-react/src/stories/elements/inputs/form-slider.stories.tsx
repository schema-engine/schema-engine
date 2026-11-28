import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui.js';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Slider element for selecting a value from a range using min, max, and step constraints. Base UI implementation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with slider element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-default',
			title: 'Slider Field',
			steps: [
				{
					id: 'step-1',
					title: 'Select Value',
					elements: [
						{
							$type: 'slider',
							id: 'volume',
							name: 'volume',
							label: 'Volume',
							min: 0,
							max: 100,
							step: 1,
							description: 'Adjust volume from 0 to 100',
						},
					],
				},
			],
		}),
	},
};

export const RangeValues: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-range',
			title: 'Volume Control',
			steps: [
				{
					id: 'step-1',
					title: 'Adjust Settings',
					elements: [
						{
							$type: 'slider',
							id: 'volume',
							name: 'volume',
							label: 'Volume Level',
							min: 0,
							max: 100,
							step: 5,
							defaultValue: 50,
							description: 'Current volume: 50%',
						},
					],
				},
			],
		}),
	},
};

export const SmallStep: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-small-step',
			title: 'Precision Control',
			steps: [
				{
					id: 'step-1',
					title: 'Fine Tuning',
					elements: [
						{
							$type: 'slider',
							id: 'opacity',
							name: 'opacity',
							label: 'Opacity',
							min: 0,
							max: 1,
							step: 0.01,
							defaultValue: 0.5,
							description: 'Set opacity with decimal precision',
						},
					],
				},
			],
		}),
	},
};

export const WithValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-validation',
			title: 'Age Slider',
			steps: [
				{
					id: 'step-1',
					title: 'Select Age Range',
					elements: [
						{
							$type: 'slider',
							id: 'age',
							name: 'age',
							label: 'Age',
							min: 18,
							max: 65,
							step: 1,
							description: 'Select your age (18-65)',
							rules: [
								ValidationPresets.number.required('Age is required'),
								ValidationPresets.number.min(18, 'Must be at least 18'),
								ValidationPresets.number.max(65, 'Must be 65 or younger'),
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Confirm Age', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleSliders: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-multiple',
			title: 'Audio Mixer',
			description: 'Adjust individual channel levels',
			steps: [
				{
					id: 'step-1',
					title: 'Mix Levels',
					elements: [
						{
							$type: 'slider',
							id: 'masterVolume',
							name: 'masterVolume',
							label: 'Master Volume',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 75,
						},
						{
							$type: 'slider',
							id: 'voiceVolume',
							name: 'voiceVolume',
							label: 'Voice Channel',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 80,
						},
						{
							$type: 'slider',
							id: 'musicVolume',
							name: 'musicVolume',
							label: 'Music Channel',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 60,
						},
						{ $type: 'submit', id: 'submit', label: 'Save Mix', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const BrightnessControl: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-brightness',
			title: 'Display Settings',
			description: 'Adjust display brightness and contrast',
			steps: [
				{
					id: 'step-1',
					title: 'Calibration',
					elements: [
						{
							$type: 'slider',
							id: 'brightness',
							name: 'brightness',
							label: 'Brightness',
							min: 0,
							max: 100,
							step: 5,
							defaultValue: 70,
							description: 'Adjust screen brightness',
						},
						{
							$type: 'slider',
							id: 'contrast',
							name: 'contrast',
							label: 'Contrast',
							min: 0,
							max: 100,
							step: 5,
							defaultValue: 50,
							description: 'Adjust screen contrast',
						},
						{ $type: 'submit', id: 'submit', label: 'Apply Settings', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-disabled',
			title: 'Disabled Slider States',
			description: 'Examples of disabled sliders',
			steps: [
				{
					id: 'step-1',
					title: 'Read-only Settings',
					elements: [
						{
							$type: 'slider',
							id: 'readOnlyValue',
							name: 'readOnlyValue',
							label: 'Fixed Setting',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 50,
							disabled: true,
							description: 'This setting cannot be changed',
						},
						{
							$type: 'slider',
							id: 'lockedVolume',
							name: 'lockedVolume',
							label: 'Locked Volume',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 75,
							disabled: true,
							description: 'Volume is locked by administrator',
						},
					],
				},
			],
		}),
	},
};

export const MixedStates: Story = {
	args: {
		config: defineStoryForm({
			id: 'slider-mixed',
			title: 'Mixed Slider States',
			description: 'Combination of enabled and disabled sliders',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'slider',
							id: 'userVolume',
							name: 'userVolume',
							label: 'User Volume Control',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 60,
							description: 'Adjust your personal volume',
						},
						{
							$type: 'slider',
							id: 'systemVolume',
							name: 'systemVolume',
							label: 'System Volume',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 50,
							disabled: true,
							description: 'Controlled by system administrator',
						},
						{
							$type: 'slider',
							id: 'voiceVolume',
							name: 'voiceVolume',
							label: 'Voice Channel',
							min: 0,
							max: 100,
							step: 1,
							defaultValue: 80,
							description: 'Adjust voice channel volume',
						},
						{ $type: 'submit', id: 'submit', label: 'Save Audio Settings', name: 'submit' },
					],
				},
			],
		}),
	},
};
