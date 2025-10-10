import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroBackgroundLayout } from '@/components/layouts/hero-background-layout';
import { FormRenderer } from '@/components/internals/form-renderer';
import { simpleContactForm } from '../shared/sample-forms';
import '../../components/layouts/hero-background-layout.css';

const meta = {
	title: 'Layouts/HeroBackgroundLayout',
	component: HeroBackgroundLayout,
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
			title: 'Welcome to Our Service',
			description: 'Get started by filling out this form',
			index: 0,
			total: 3,
		},
		form: {
			id: 'example-form',
			title: 'Example Form',
			description: 'This is an example form',
		},
	},
} satisfies Meta<typeof HeroBackgroundLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {},
	},
};

export const WithBackgroundImage: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'md',
		},
	},
};

export const SmallContent: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'sm',
		},
	},
};

export const MediumContent: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'md',
		},
	},
};

export const LargeContent: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'lg',
		},
	},
};

export const ExtraLargeContent: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'xl',
		},
	},
};

export const GradientBackground: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80',
			contentWidth: 'md',
		},
	},
};

export const NatureBackground: Story = {
	args: {
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
			contentWidth: 'lg',
		},
	},
};

export const SingleStepForm: Story = {
	args: {
		step: undefined,
		form: {
			id: 'contact-form',
			title: 'Contact Our Team',
			description: 'We are here to help you succeed',
		},
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
			contentWidth: 'md',
		},
	},
};

export const SingleStepFormSmall: Story = {
	args: {
		step: undefined,
		form: {
			id: 'login-form',
			title: 'Welcome Back',
		},
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80',
			contentWidth: 'sm',
		},
	},
};

export const SingleStepFormLarge: Story = {
	args: {
		step: undefined,
		form: {
			id: 'application-form',
			title: 'Apply Now',
			description: 'Join our team and make an impact',
		},
		config: {
			backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
			contentWidth: 'xl',
		},
	},
};
