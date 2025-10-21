import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.base-ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
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
		config: createForm()
			.setId('slider-default')
			.setTitle('Slider Field')
			.addStep({ id: 'step-1', title: 'Select Value' })
			.addElement('slider', {
				id: 'volume',
				name: 'volume',
				label: 'Volume',
				min: 0,
				max: 100,
				step: 1,
				description: 'Adjust volume from 0 to 100',
			})
			.build(),
	},
};

export const RangeValues: Story = {
	args: {
		config: createForm()
			.setId('slider-range')
			.setTitle('Volume Control')
			.addStep({ id: 'step-1', title: 'Adjust Settings' })
			.addElement('slider', {
				id: 'volume',
				name: 'volume',
				label: 'Volume Level',
				min: 0,
				max: 100,
				step: 5,
				defaultValue: 50,
				description: 'Current volume: 50%',
			})
			.build(),
	},
};

export const SmallStep: Story = {
	args: {
		config: createForm()
			.setId('slider-small-step')
			.setTitle('Precision Control')
			.addStep({ id: 'step-1', title: 'Fine Tuning' })
			.addElement('slider', {
				id: 'opacity',
				name: 'opacity',
				label: 'Opacity',
				min: 0,
				max: 1,
				step: 0.01,
				defaultValue: 0.5,
				description: 'Set opacity with decimal precision',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('slider-validation')
			.setTitle('Age Slider')
			.addStep({ id: 'step-1', title: 'Select Age Range' })
			.addElement('slider', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Confirm Age', name: 'submit' })
			.build(),
	},
};

export const MultipleSliders: Story = {
	args: {
		config: createForm()
			.setId('slider-multiple')
			.setTitle('Audio Mixer')
			.setDescription('Adjust individual channel levels')
			.addStep({ id: 'step-1', title: 'Mix Levels' })
			.addElement('slider', {
				id: 'masterVolume',
				name: 'masterVolume',
				label: 'Master Volume',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 75,
			})
			.addElement('slider', {
				id: 'voiceVolume',
				name: 'voiceVolume',
				label: 'Voice Channel',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 80,
			})
			.addElement('slider', {
				id: 'musicVolume',
				name: 'musicVolume',
				label: 'Music Channel',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 60,
			})
			.addElement('submit', { id: 'submit', label: 'Save Mix', name: 'submit' })
			.build(),
	},
};

export const BrightnessControl: Story = {
	args: {
		config: createForm()
			.setId('slider-brightness')
			.setTitle('Display Settings')
			.setDescription('Adjust display brightness and contrast')
			.addStep({ id: 'step-1', title: 'Calibration' })
			.addElement('slider', {
				id: 'brightness',
				name: 'brightness',
				label: 'Brightness',
				min: 0,
				max: 100,
				step: 5,
				defaultValue: 70,
				description: 'Adjust screen brightness',
			})
			.addElement('slider', {
				id: 'contrast',
				name: 'contrast',
				label: 'Contrast',
				min: 0,
				max: 100,
				step: 5,
				defaultValue: 50,
				description: 'Adjust screen contrast',
			})
			.addElement('submit', { id: 'submit', label: 'Apply Settings', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('slider-disabled')
			.setTitle('Disabled Slider States')
			.setDescription('Examples of disabled sliders')
			.addStep({ id: 'step-1', title: 'Read-only Settings' })
			.addElement('slider', {
				id: 'readOnlyValue',
				name: 'readOnlyValue',
				label: 'Fixed Setting',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 50,
				disabled: true,
				description: 'This setting cannot be changed',
			})
			.addElement('slider', {
				id: 'lockedVolume',
				name: 'lockedVolume',
				label: 'Locked Volume',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 75,
				disabled: true,
				description: 'Volume is locked by administrator',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('slider-mixed')
			.setTitle('Mixed Slider States')
			.setDescription('Combination of enabled and disabled sliders')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('slider', {
				id: 'userVolume',
				name: 'userVolume',
				label: 'User Volume Control',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 60,
				description: 'Adjust your personal volume',
			})
			.addElement('slider', {
				id: 'systemVolume',
				name: 'systemVolume',
				label: 'System Volume',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 50,
				disabled: true,
				description: 'Controlled by system administrator',
			})
			.addElement('slider', {
				id: 'voiceVolume',
				name: 'voiceVolume',
				label: 'Voice Channel',
				min: 0,
				max: 100,
				step: 1,
				defaultValue: 80,
				description: 'Adjust voice channel volume',
			})
			.addElement('submit', { id: 'submit', label: 'Save Audio Settings', name: 'submit' })
			.build(),
	},
};
