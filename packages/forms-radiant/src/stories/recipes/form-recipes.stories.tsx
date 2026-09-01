import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { FormDebugger } from '@/components/form-debugger';

const meta = {
	...formRendererMeta,
	parameters: { ...formRendererMeta.parameters, layout: 'fullscreen' },
	args: { className: 'se-form-story--full' },
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardSignIn: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			view: { $type: 'card', shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' } },
		},
	},
};

export const RegistrationWizard: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: true },
				actions: { labels: { next: 'Continue', submit: 'Create account' } },
			},
		},
	},
};

export const SidebarOnboarding: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'sidebar-wizard',
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: true },
			},
		},
	},
};

export const CardRegistration: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'card-wizard',
				shell: { maxWidth: 'lg', padding: 'lg', shadowSize: 'lg' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const HeroRegistration: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'hero-wizard',
				shell: { backgroundImage: '/images/hero.jpg', contentWidth: 'lg' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const SplitScreenContact: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Tell us what you are building and our team will get back to you within one business day.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const DebuggedWizard: Story = {
	args: {
		config: { ...FormTemplates.registrationForm, view: { $type: 'wizard' } },
		children: <FormDebugger defaultOpen />,
	},
};
