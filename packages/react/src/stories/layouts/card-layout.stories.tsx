import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardLayout } from '@/components/layouts/card-layout';
import { FormRenderer } from '@/components/internals/form-renderer';
import { simpleContactForm } from '../shared/sample-forms';
import '../../components/layouts/card-layout.css';

const meta = {
	title: 'Layouts/CardLayout',
	component: CardLayout,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	argTypes: {
		config: {
			control: 'object',
			description: 'Layout configuration options',
		},
		step: {
			control: 'object',
			description: 'Current step information',
		},
		form: {
			control: 'object',
			description: 'Form information',
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes',
		},
	},
	args: {
		children: <FormRenderer config={simpleContactForm} />,
		step: {
			id: 'step-1',
			title: 'Personal Information',
			description: 'Please provide your basic information',
			index: 0,
			total: 3,
		},
		form: {
			id: 'example-form',
			title: 'Example Form',
			description: 'This is an example form',
		},
	},
} satisfies Meta<typeof CardLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {},
	},
};

export const SmallCard: Story = {
	args: {
		config: {
			maxWidth: 'sm',
			padding: 'md',
			shadowSize: 'md',
		},
	},
};

export const MediumCard: Story = {
	args: {
		config: {
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'md',
		},
	},
};

export const LargeCard: Story = {
	args: {
		config: {
			maxWidth: 'lg',
			padding: 'lg',
			shadowSize: 'lg',
		},
	},
};

export const ExtraLargeCard: Story = {
	args: {
		config: {
			maxWidth: 'xl',
			padding: 'lg',
			shadowSize: 'xl',
		},
	},
};

export const CompactPadding: Story = {
	args: {
		config: {
			maxWidth: 'md',
			padding: 'sm',
			shadowSize: 'sm',
		},
	},
};

export const SpaciosPadding: Story = {
	args: {
		config: {
			maxWidth: 'md',
			padding: 'lg',
			shadowSize: 'xl',
		},
	},
};

export const MinimalShadow: Story = {
	args: {
		config: {
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'sm',
		},
	},
};

export const DramaticShadow: Story = {
	args: {
		config: {
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'xl',
		},
	},
};

export const SingleStepForm: Story = {
	args: {
		step: undefined,
		form: {
			id: 'contact-form',
			title: 'Contact Us',
			description: 'Send us a message and we will get back to you soon',
		},
		config: {
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'md',
		},
	},
};

export const SingleStepFormNoDescription: Story = {
	args: {
		step: undefined,
		form: {
			id: 'simple-form',
			title: 'Quick Form',
		},
		config: {
			maxWidth: 'sm',
			padding: 'sm',
			shadowSize: 'sm',
		},
	},
};

export const SingleStepFormLarge: Story = {
	args: {
		step: undefined,
		form: {
			id: 'registration-form',
			title: 'Registration',
			description: 'Create your account to access all features',
		},
		config: {
			maxWidth: 'xl',
			padding: 'lg',
			shadowSize: 'xl',
		},
	},
};
