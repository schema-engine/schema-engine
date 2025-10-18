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
					'Complete demo forms for Base UI components, ranging from simple contact forms to complex multi-step applications with various field types and validation rules.',
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
	tags: ['autodocs'],
	argTypes: {
		config: {
			control: 'object',
			description: 'Form configuration',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleContactForm: Story = {
	args: {
		config: createForm()
			.setId('simple-contact-form')
			.setTitle('Simple Contact Form')
			.setDescription('A quick way to get in touch with us')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			})
			.addStep({
				id: 'contact-info',
				title: 'Your Information',
			})
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2, 'Name must be at least 2 characters')],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email('Invalid email address')],
			})
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Tell us what you think...',
				rows: 4,
				rules: [ValidationPresets.string.minLength(10, 'Message must be at least 10 characters')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Send Message',
			})
			.build(),
	},
};

export const ProductFeedbackForm: Story = {
	args: {
		config: createForm()
			.setId('product-feedback')
			.setTitle('Product Feedback Form')
			.setDescription('Help us improve our products')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			})
			.addStep({
				id: 'feedback',
				title: 'Your Feedback',
			})
			.addElement('input', {
				id: 'product',
				name: 'product',
				label: 'Product Name',
				placeholder: 'Which product are you providing feedback on?',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('select', {
				id: 'rating',
				name: 'rating',
				label: 'Overall Rating',
				options: [
					{ label: 'Poor', value: 'poor' },
					{ label: 'Fair', value: 'fair' },
					{ label: 'Good', value: 'good' },
					{ label: 'Very Good', value: 'very-good' },
					{ label: 'Excellent', value: 'excellent' },
				],
				rules: [ValidationPresets.string.required('Please select a rating')],
			})
			.addElement('checkbox-group', {
				id: 'aspects',
				name: 'aspects',
				label: 'What did you find helpful?',
				options: [
					{ label: 'User Interface', value: 'ui' },
					{ label: 'Features', value: 'features' },
					{ label: 'Performance', value: 'performance' },
					{ label: 'Documentation', value: 'docs' },
					{ label: 'Support', value: 'support' },
				],
			})
			.addElement('textarea', {
				id: 'comments',
				name: 'comments',
				label: 'Additional Comments',
				placeholder: 'Tell us more about your experience...',
				rows: 5,
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit Feedback',
			})
			.build(),
	},
};

export const EventRegistrationForm: Story = {
	args: {
		config: createForm()
			.setId('event-registration')
			.setTitle('Event Registration')
			.setDescription('Register for our upcoming conference')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'personal',
				title: 'Personal Details',
				description: 'Tell us about yourself',
			})
			.addElement('input', {
				id: 'firstName',
				name: 'firstName',
				label: 'First Name',
				placeholder: 'John',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'lastName',
				name: 'lastName',
				label: 'Last Name',
				placeholder: 'Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'company',
				name: 'company',
				label: 'Company Name',
				placeholder: 'Acme Corp',
				inputType: 'text',
			})
			.addStep({
				id: 'preferences',
				title: 'Preferences',
				description: 'Customize your experience',
			})
			.addElement('select', {
				id: 'ticketType',
				name: 'ticketType',
				label: 'Ticket Type',
				options: [
					{ label: 'Standard', value: 'standard' },
					{ label: 'VIP', value: 'vip' },
					{ label: 'Student', value: 'student' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('checkbox-group', {
				id: 'workshops',
				name: 'workshops',
				label: 'Workshops of Interest',
				options: [
					{ label: 'Web Development', value: 'web' },
					{ label: 'AI & Machine Learning', value: 'ai' },
					{ label: 'Cloud Infrastructure', value: 'cloud' },
					{ label: 'Security', value: 'security' },
				],
			})
			.addElement('switch', {
				id: 'newsletter',
				name: 'newsletter',
				label: 'Subscribe to our newsletter',
			})
			.addElement('switch', {
				id: 'accessibility',
				name: 'accessibility',
				label: 'I require accessibility accommodations',
			})
			.addStep({
				id: 'confirmation',
				title: 'Confirmation',
				description: 'Review your registration',
			})
			.addElement('textarea', {
				id: 'specialRequests',
				name: 'specialRequests',
				label: 'Special Requests',
				placeholder: 'Any special needs or requests?',
				rows: 3,
			})
			.addElement('checkbox', {
				id: 'termsAccepted',
				name: 'termsAccepted',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required('You must accept the terms')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Complete Registration',
			})
			.build(),
	},
};

export const AdvancedSettingsPanel: Story = {
	args: {
		config: createForm()
			.setId('advanced-settings')
			.setTitle('Advanced Settings Panel')
			.setDescription('Configure your account settings')
			.setStepper('default', {
				orientation: 'sidebar',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			})
			.addStep({
				id: 'general',
				title: 'General Settings',
			})
			.addElement('input', {
				id: 'displayName',
				name: 'displayName',
				label: 'Display Name',
				placeholder: 'Your public name',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(3), ValidationPresets.string.maxLength(50)],
			})
			.addElement('textarea', {
				id: 'bio',
				name: 'bio',
				label: 'Bio',
				placeholder: 'Tell others about yourself',
				rows: 3,
			})
			.addElement('select', {
				id: 'theme',
				name: 'theme',
				label: 'Theme Preference',
				options: [
					{ label: 'Light', value: 'light' },
					{ label: 'Dark', value: 'dark' },
					{ label: 'Auto (System)', value: 'auto' },
				],
			})
			.addElement('select', {
				id: 'language',
				name: 'language',
				label: 'Language',
				options: [
					{ label: 'English', value: 'en' },
					{ label: 'Spanish', value: 'es' },
					{ label: 'French', value: 'fr' },
					{ label: 'German', value: 'de' },
				],
			})
			.addStep({
				id: 'privacy',
				title: 'Privacy & Notifications',
			})
			.addElement('checkbox-group', {
				id: 'privacySettings',
				name: 'privacySettings',
				label: 'Privacy Settings',
				options: [
					{ label: 'Make profile public', value: 'public' },
					{ label: 'Show online status', value: 'online' },
					{ label: 'Allow messages from anyone', value: 'messages' },
				],
			})
			.addElement('checkbox-group', {
				id: 'notifications',
				name: 'notifications',
				label: 'Email Notifications',
				options: [
					{ label: 'Marketing emails', value: 'marketing' },
					{ label: 'Product updates', value: 'updates' },
					{ label: 'Weekly digest', value: 'digest' },
					{ label: 'Security alerts', value: 'security' },
				],
			})
			.addStep({
				id: 'advanced',
				title: 'Advanced',
			})
			.addElement('number', {
				id: 'apiRateLimit',
				name: 'apiRateLimit',
				label: 'API Rate Limit (req/min)',
				min: 10,
				max: 1000,
				step: 10,
				defaultValue: 100,
			})
			.addElement('slider', {
				id: 'cacheDuration',
				name: 'cacheDuration',
				label: 'Cache Duration (hours)',
				min: 1,
				max: 72,
				step: 1,
				defaultValue: 24,
			})
			.addElement('switch', {
				id: 'enableWebhooks',
				name: 'enableWebhooks',
				label: 'Enable Webhooks',
			})
			.addElement('switch', {
				id: 'enableApiLogs',
				name: 'enableApiLogs',
				label: 'Enable API Logging',
			})
			.addElement('switch', {
				id: 'enableTwoFactor',
				name: 'enableTwoFactor',
				label: 'Enable Two-Factor Authentication',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Save Settings',
			})
			.build(),
	},
};

export const ComplexJobApplicationForm: Story = {
	args: {
		config: createForm()
			.setId('job-application')
			.setTitle('Complete Job Application')
			.setDescription('Apply for our exciting opportunities')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'basic-info',
				title: 'Basic Information',
				description: 'Let us know who you are',
			})
			.addElement('input', {
				id: 'fullName',
				name: 'fullName',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 000-0000',
				inputType: 'tel',
			})
			.addElement('input', {
				id: 'location',
				name: 'location',
				label: 'Current Location',
				placeholder: 'City, Country',
				inputType: 'text',
			})
			.addStep({
				id: 'position',
				title: 'Position Details',
				description: 'Tell us about the role you are interested in',
			})
			.addElement('select', {
				id: 'department',
				name: 'department',
				label: 'Department',
				options: [
					{ label: 'Engineering', value: 'eng' },
					{ label: 'Product', value: 'product' },
					{ label: 'Design', value: 'design' },
					{ label: 'Sales', value: 'sales' },
					{ label: 'Marketing', value: 'marketing' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('select', {
				id: 'jobTitle',
				name: 'jobTitle',
				label: 'Job Title',
				options: [
					{ label: 'Senior Developer', value: 'senior-dev' },
					{ label: 'Mid-Level Developer', value: 'mid-dev' },
					{ label: 'Junior Developer', value: 'junior-dev' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('select', {
				id: 'employmentType',
				name: 'employmentType',
				label: 'Employment Type',
				options: [
					{ label: 'Full-Time', value: 'ft' },
					{ label: 'Part-Time', value: 'pt' },
					{ label: 'Contract', value: 'contract' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('select', {
				id: 'workMode',
				name: 'workMode',
				label: 'Work Mode',
				options: [
					{ label: 'Remote', value: 'remote' },
					{ label: 'On-Site', value: 'onsite' },
					{ label: 'Hybrid', value: 'hybrid' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addStep({
				id: 'experience',
				title: 'Experience & Skills',
				description: 'Share your professional background',
			})
			.addElement('number', {
				id: 'yearsExperience',
				name: 'yearsExperience',
				label: 'Years of Experience',
				min: 0,
				max: 60,
				step: 1,
				rules: [ValidationPresets.string.required()],
			})
			.addElement('textarea', {
				id: 'summary',
				name: 'summary',
				label: 'Professional Summary',
				placeholder: 'Briefly describe your professional background and key achievements...',
				rows: 5,
				rules: [ValidationPresets.string.minLength(20)],
			})
			.addElement('checkbox-group', {
				id: 'skills',
				name: 'skills',
				label: 'Core Skills',
				options: [
					{ label: 'JavaScript/TypeScript', value: 'js' },
					{ label: 'React', value: 'react' },
					{ label: 'Node.js', value: 'node' },
					{ label: 'Python', value: 'python' },
					{ label: 'DevOps', value: 'devops' },
					{ label: 'Database Design', value: 'db' },
					{ label: 'Cloud (AWS/GCP)', value: 'cloud' },
				],
				rules: [ValidationPresets.string.required('Select at least one skill')],
			})
			.addElement('slider', {
				id: 'englishLevel',
				name: 'englishLevel',
				label: 'English Proficiency',
				min: 1,
				max: 5,
				step: 1,
				defaultValue: 3,
			})
			.addStep({
				id: 'availability',
				title: 'Availability & Preferences',
				description: 'When can you start and what are your preferences?',
			})
			.addElement('select', {
				id: 'availability',
				name: 'availability',
				label: 'Available to Start',
				options: [
					{ label: 'Immediately', value: 'now' },
					{ label: '2 weeks', value: '2weeks' },
					{ label: '1 month', value: '1month' },
					{ label: '2-3 months', value: '2-3months' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('number', {
				id: 'expectedSalary',
				name: 'expectedSalary',
				label: 'Expected Salary (Annual, USD)',
				min: 0,
				max: 500000,
				step: 1000,
			})
			.addElement('checkbox-group', {
				id: 'benefits',
				name: 'benefits',
				label: 'Benefits of Interest',
				options: [
					{ label: 'Health Insurance', value: 'health' },
					{ label: '401(k)', value: '401k' },
					{ label: 'Remote Work', value: 'remote' },
					{ label: 'Flexible Hours', value: 'flexible' },
					{ label: 'Professional Development', value: 'dev' },
					{ label: 'Stock Options', value: 'stock' },
				],
			})
			.addElement('switch', {
				id: 'relocation',
				name: 'relocation',
				label: 'Willing to relocate',
			})
			.addStep({
				id: 'final',
				title: 'Final Questions',
				description: 'A few more things to know',
			})
			.addElement('textarea', {
				id: 'whyCompany',
				name: 'whyCompany',
				label: 'Why do you want to work with us?',
				placeholder: 'Tell us what excites you about this opportunity...',
				rows: 4,
				rules: [ValidationPresets.string.minLength(20)],
			})
			.addElement('textarea', {
				id: 'additionalInfo',
				name: 'additionalInfo',
				label: 'Anything Else We Should Know?',
				placeholder: 'Optional: Share any additional information...',
				rows: 3,
			})
			.addElement('checkbox', {
				id: 'backgroundCheck',
				name: 'backgroundCheck',
				label: 'I consent to a background check',
				rules: [ValidationPresets.string.required('This is required to proceed')],
			})
			.addElement('checkbox', {
				id: 'termsAccepted',
				name: 'termsAccepted',
				label: 'I agree to the terms and privacy policy',
				rules: [ValidationPresets.string.required('This is required to proceed')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit Application',
			})
			.build(),
	},
};
