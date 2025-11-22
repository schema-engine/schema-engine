import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui';
import { SUBMIT_FORM_MOCK_URL, submitFormHandler } from '../msw/submit-form';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		msw: {
			handlers: [submitFormHandler],
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
			description: 'Form configuration',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Demo: Story = {
	args: {
		config: createForm()
			.setId('demo-all-components')
			.setTitle('Complete Component Showcase')
			.setDescription('Test all available form components in a single view')
			.addStep({
				id: 'demo',
				title: 'All Components',
			})
			.addElement('input', {
				id: 'fullName',
				name: 'fullName',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('Name is required'),
					ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
				],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Invalid email address'),
				],
			})
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter your phone number',
				defaultCountry: 'US',
				rules: [ValidationPresets.string.required('Phone is required')],
			})
			.addElement('input', {
				id: 'website',
				name: 'website',
				label: 'Website (Optional)',
				placeholder: 'https://example.com',
				inputType: 'url',
			})
			.addElement('select', {
				id: 'country',
				name: 'country',
				label: 'Country',
				placeholder: 'Select a country...',
				options: [
					{ label: 'United States', value: 'us' },
					{ label: 'Canada', value: 'ca' },
					{ label: 'United Kingdom', value: 'uk' },
					{ label: 'Germany', value: 'de' },
					{ label: 'France', value: 'fr' },
				],
				rules: [ValidationPresets.string.required('Please select a country')],
			})
			.addElement('radio', {
				id: 'accountType',
				name: 'accountType',
				label: 'Account Type',
				options: [
					{ label: 'Personal', value: 'personal' },
					{ label: 'Business', value: 'business' },
				],
				rules: [ValidationPresets.string.required('Please select an account type')],
			})
			.addElement('combobox', {
				id: 'industry',
				name: 'industry',
				label: 'Industry',
				placeholder: 'Search or select your industry...',
				options: [
					{ label: 'Technology', value: 'tech' },
					{ label: 'Finance', value: 'finance' },
					{ label: 'Healthcare', value: 'healthcare' },
					{ label: 'Manufacturing', value: 'manufacturing' },
					{ label: 'Retail', value: 'retail' },
					{ label: 'Other', value: 'other' },
				],
				rules: [ValidationPresets.string.required('Please select an industry')],
			})
			.addElement('checkbox-group', {
				id: 'interests',
				name: 'interests',
				label: 'Areas of Interest',
				options: [
					{ label: 'Web Development', value: 'web' },
					{ label: 'Mobile Apps', value: 'mobile' },
					{ label: 'AI & Machine Learning', value: 'ai' },
					{ label: 'Cloud Computing', value: 'cloud' },
					{ label: 'Data Science', value: 'data' },
				],
				rules: [ValidationPresets.array.minItems(1, 'Please select at least one interest')],
			})
			.addElement('textarea', {
				id: 'bio',
				name: 'bio',
				label: 'Bio / About You',
				placeholder: 'Tell us about yourself...',
				rows: 4,
				rules: [
					ValidationPresets.string.required('Bio is required'),
					ValidationPresets.string.minLength(10, 'Bio must be at least 10 characters'),
					ValidationPresets.string.maxLength(500, 'Bio must be less than 500 characters'),
				],
			})
			.addElement('number', {
				id: 'experience',
				name: 'experience',
				label: 'Years of Experience',
				min: 0,
				max: 60,
				step: 1,
				description: 'How many years of experience do you have?',
				rules: [ValidationPresets.string.required('Years of experience is required')],
			})
			.addElement('slider', {
				id: 'skillLevel',
				name: 'skillLevel',
				label: 'Skill Level',
				min: 0,
				max: 100,
				step: 5,
				defaultValue: 50,
				description: 'Rate your skill level (0-100)',
				rules: [ValidationPresets.string.required('Skill level is required')],
			})
			.addElement('switch', {
				id: 'newsletters',
				name: 'newsletters',
				label: 'Subscribe to our newsletters',
				defaultValue: true,
				rules: [ValidationPresets.string.required('You must choose a preference')],
			})
			.addElement('switch', {
				id: 'notifications',
				name: 'notifications',
				label: 'Enable notifications',
				constraints: [
					{
						field: 'newsletters',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
				rules: [ValidationPresets.string.required('Please select a notification preference')],
			})
			.addElement('input-otp', {
				id: 'verificationCode',
				name: 'verificationCode',
				label: 'Verification Code',
				description: 'Enter the 6-digit code',
				length: 6,
				rules: [ValidationPresets.string.required('Verification code is required')],
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required('You must agree to continue')],
			})
			.addElement('drop-zone', {
				id: 'documents',
				name: 'documents',
				label: 'Upload Documents',
				maxFiles: 3,
				maxSize: 5 * 1024 * 1024,
				rules: [
					ValidationPresets.array.nonEmpty('Please upload at least one document'),
					ValidationPresets.array.maxItems(3, 'Maximum 3 files allowed'),
				],
				accept: {
					'application/pdf': ['.pdf'],
					'image/*': ['.jpg', '.jpeg', '.png'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'Upload up to 3 documents (PDF, Images, Word docs, max 5 MB each)',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit All',
			})
			.addFormAction('submit', {
				id: 'submit-demo',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.addFormAction('reset', {
				id: 'reset-demo',
				type: 'reset',
				enabled: true,
				triggers: ['form_submit_success'],
				resetToDefaults: true,
			} as any)
			.build(),
	},
};

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
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter your phone number',
				defaultCountry: 'US',
				description: 'We will only call if needed',
			})
			.addElement('combobox', {
				id: 'preferredContact',
				name: 'preferredContact',
				label: 'Preferred Contact Method',
				placeholder: 'Select contact method',
				options: [
					{ label: 'Email', value: 'email' },
					{ label: 'Phone', value: 'phone' },
					{ label: 'Text Message', value: 'sms' },
				],
			})
			.addElement('input', {
				id: 'bestTimeToCall',
				name: 'bestTimeToCall',
				label: 'Best Time to Call',
				placeholder: 'e.g., Weekdays 2-5pm',
				inputType: 'text',
				constraints: [
					{
						field: 'preferredContact',
						operator: 'equals',
						value: 'phone',
						action: 'show',
					},
				],
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
			.addFormAction('submit', {
				id: 'submit-contact',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.addFormAction('reset', {
				id: 'reset-form',
				type: 'reset',
				enabled: true,
				triggers: ['form_submit_success'],
				resetToDefaults: true,
			} as any)
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
			.addElement('combobox', {
				id: 'product',
				name: 'product',
				label: 'Product Name',
				placeholder: 'Select or type a product',
				options: [
					{ label: 'Form Engine Pro', value: 'form-engine-pro' },
					{ label: 'Data Analytics Suite', value: 'analytics' },
					{ label: 'Cloud Storage', value: 'storage' },
					{ label: 'API Gateway', value: 'api-gateway' },
					{ label: 'Developer Tools', value: 'dev-tools' },
				],
				rules: [ValidationPresets.string.required('Please select a product')],
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
			.addElement('select', {
				id: 'categories',
				name: 'categories',
				label: 'Feedback Categories',
				placeholder: 'Select all that apply',
				multiple: true,
				options: [
					{ label: 'User Interface', value: 'ui' },
					{ label: 'Features', value: 'features' },
					{ label: 'Performance', value: 'performance' },
					{ label: 'Documentation', value: 'docs' },
					{ label: 'Support', value: 'support' },
					{ label: 'Pricing', value: 'pricing' },
					{ label: 'Integration', value: 'integration' },
				],
				description: 'Choose one or more categories',
			})
			.addElement('checkbox-group', {
				id: 'aspects',
				name: 'aspects',
				label: 'What did you find helpful?',
				options: [
					{ label: 'Easy to use', value: 'easy' },
					{ label: 'Well documented', value: 'docs' },
					{ label: 'Fast performance', value: 'fast' },
					{ label: 'Great support', value: 'support' },
					{ label: 'Good value', value: 'value' },
				],
			})
			.addElement('textarea', {
				id: 'improvementSuggestions',
				name: 'improvementSuggestions',
				label: 'How Can We Improve?',
				placeholder: 'Please share specific suggestions for improvement...',
				rows: 4,
				constraints: [
					{
						field: 'rating',
						operator: 'equals',
						value: 'poor',
						action: 'show',
					},
					{
						field: 'rating',
						operator: 'equals',
						value: 'fair',
						action: 'show',
					},
				],
			})
			.addElement('textarea', {
				id: 'comments',
				name: 'comments',
				label: 'Additional Comments',
				placeholder: 'Tell us more about your experience...',
				rows: 5,
			})
			.addElement('drop-zone', {
				id: 'screenshots',
				name: 'screenshots',
				label: 'Attach Screenshots (Optional)',
				maxFiles: 3,
				maxSize: 5 * 1024 * 1024,
				accept: {
					'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
				},
				description: 'Up to 3 images, 5 MB each. Helps us understand the issue better',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit Feedback',
			})
			.addFormAction('submit', {
				id: 'submit-feedback',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.addFormAction('reset', {
				id: 'reset-form',
				type: 'reset',
				enabled: true,
				triggers: ['form_submit_success'],
				resetToDefaults: true,
			} as any)
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
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter phone number',
				defaultCountry: 'US',
				rules: [ValidationPresets.string.required('Phone number is required')],
			})
			.addElement('input', {
				id: 'company',
				name: 'company',
				label: 'Company Name',
				placeholder: 'Acme Corp',
				inputType: 'text',
			})
			.addElement('combobox', {
				id: 'jobTitle',
				name: 'jobTitle',
				label: 'Job Title',
				placeholder: 'Select or type your title',
				options: [
					{ label: 'Software Engineer', value: 'swe' },
					{ label: 'Product Manager', value: 'pm' },
					{ label: 'Designer', value: 'designer' },
					{ label: 'Data Scientist', value: 'ds' },
					{ label: 'DevOps Engineer', value: 'devops' },
					{ label: 'Marketing Manager', value: 'marketing' },
					{ label: 'Sales Executive', value: 'sales' },
					{ label: 'Other', value: 'other' },
				],
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
			.addElement('select', {
				id: 'dietaryRestrictions',
				name: 'dietaryRestrictions',
				label: 'Dietary Restrictions',
				placeholder: 'Select all that apply',
				multiple: true,
				options: [
					{ label: 'Vegetarian', value: 'vegetarian' },
					{ label: 'Vegan', value: 'vegan' },
					{ label: 'Gluten-Free', value: 'gluten-free' },
					{ label: 'Dairy-Free', value: 'dairy-free' },
					{ label: 'Nut Allergy', value: 'nut-allergy' },
					{ label: 'Halal', value: 'halal' },
					{ label: 'Kosher', value: 'kosher' },
				],
				description: 'For catering purposes',
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
			.addElement('textarea', {
				id: 'accessibilityDetails',
				name: 'accessibilityDetails',
				label: 'Accessibility Requirements',
				placeholder: 'Please describe your accessibility needs...',
				rows: 3,
				constraints: [
					{
						field: 'accessibility',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('drop-zone', {
				id: 'accessibilityDocumentation',
				name: 'accessibilityDocumentation',
				label: 'Supporting Documentation',
				maxFiles: 1,
				accept: {
					'application/pdf': ['.pdf'],
					'image/*': ['.jpg', '.jpeg', '.png'],
				},
				constraints: [
					{
						field: 'accessibility',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
				description: 'Attach any relevant documentation (PDF or image)',
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
			.addFormAction('submit', {
				id: 'submit-registration',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
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
			.addElement('combobox', {
				id: 'theme',
				name: 'theme',
				label: 'Theme Preference',
				placeholder: 'Select theme',
				options: [
					{ label: 'Light', value: 'light' },
					{ label: 'Dark', value: 'dark' },
					{ label: 'Auto (System)', value: 'auto' },
					{ label: 'High Contrast', value: 'high-contrast' },
					{ label: 'Colorblind Mode', value: 'colorblind' },
				],
			})
			.addElement('combobox', {
				id: 'language',
				name: 'language',
				label: 'Language',
				placeholder: 'Select language',
				options: [
					{ label: 'English', value: 'en' },
					{ label: 'Spanish', value: 'es' },
					{ label: 'French', value: 'fr' },
					{ label: 'German', value: 'de' },
					{ label: 'Italian', value: 'it' },
					{ label: 'Portuguese', value: 'pt' },
					{ label: 'Japanese', value: 'ja' },
					{ label: 'Chinese', value: 'zh' },
				],
			})
			.addElement('combobox', {
				id: 'timezone',
				name: 'timezone',
				label: 'Timezone',
				placeholder: 'Select your timezone',
				options: [
					{ label: 'UTC', value: 'utc' },
					{ label: 'America/New_York (EST)', value: 'est' },
					{ label: 'America/Los_Angeles (PST)', value: 'pst' },
					{ label: 'Europe/London (GMT)', value: 'gmt' },
					{ label: 'Europe/Paris (CET)', value: 'cet' },
					{ label: 'Asia/Tokyo (JST)', value: 'jst' },
					{ label: 'Australia/Sydney (AEST)', value: 'aest' },
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
			.addElement('phone-input', {
				id: 'twoFactorPhone',
				name: 'twoFactorPhone',
				label: 'Two-Factor Phone Number',
				placeholder: 'Enter phone for 2FA',
				defaultCountry: 'US',
				description: 'Required for two-factor authentication',
				constraints: [
					{
						field: 'enableTwoFactor',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'enableTwoFactor',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
			})
			.addElement('input-otp', {
				id: 'verificationCode',
				name: 'verificationCode',
				label: 'Verification Code',
				description: 'Enter the code sent to your phone',
				length: 6,
				constraints: [
					{
						field: 'enableTwoFactor',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Save Settings',
			})
			.addFormAction('submit', {
				id: 'submit-settings',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
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
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter your phone number',
				defaultCountry: 'US',
				international: true,
				rules: [ValidationPresets.string.required('Phone number is required')],
			})
			.addElement('combobox', {
				id: 'location',
				name: 'location',
				label: 'Current Location',
				placeholder: 'Select or type your city',
				options: [
					{ label: 'New York, USA', value: 'ny-usa' },
					{ label: 'San Francisco, USA', value: 'sf-usa' },
					{ label: 'London, UK', value: 'london-uk' },
					{ label: 'Berlin, Germany', value: 'berlin-de' },
					{ label: 'Tokyo, Japan', value: 'tokyo-jp' },
					{ label: 'Sydney, Australia', value: 'sydney-au' },
					{ label: 'Toronto, Canada', value: 'toronto-ca' },
					{ label: 'Singapore', value: 'singapore' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addStep({
				id: 'position',
				title: 'Position Details',
				description: 'Tell us about the role you are interested in',
			})
			.addElement('combobox', {
				id: 'department',
				name: 'department',
				label: 'Department',
				placeholder: 'Select department',
				options: [
					{ label: 'Engineering', value: 'eng' },
					{ label: 'Product', value: 'product' },
					{ label: 'Design', value: 'design' },
					{ label: 'Sales', value: 'sales' },
					{ label: 'Marketing', value: 'marketing' },
					{ label: 'Customer Success', value: 'cs' },
					{ label: 'Operations', value: 'ops' },
					{ label: 'Finance', value: 'finance' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('combobox', {
				id: 'jobTitle',
				name: 'jobTitle',
				label: 'Job Title',
				placeholder: 'Select position',
				options: [
					{ label: 'Senior Developer', value: 'senior-dev' },
					{ label: 'Mid-Level Developer', value: 'mid-dev' },
					{ label: 'Junior Developer', value: 'junior-dev' },
					{ label: 'Tech Lead', value: 'tech-lead' },
					{ label: 'Engineering Manager', value: 'eng-manager' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('select', {
				id: 'employmentType',
				name: 'employmentType',
				label: 'Employment Type',
				placeholder: 'Select one or more',
				multiple: true,
				options: [
					{ label: 'Full-Time', value: 'ft' },
					{ label: 'Part-Time', value: 'pt' },
					{ label: 'Contract', value: 'contract' },
					{ label: 'Freelance', value: 'freelance' },
				],
				description: 'Select all employment types you are open to',
				rules: [ValidationPresets.string.required('Select at least one type')],
			})
			.addElement('select', {
				id: 'workMode',
				name: 'workMode',
				label: 'Preferred Work Mode',
				placeholder: 'Select preferred modes',
				multiple: true,
				options: [
					{ label: 'Remote', value: 'remote' },
					{ label: 'On-Site', value: 'onsite' },
					{ label: 'Hybrid', value: 'hybrid' },
				],
				description: 'Choose all work modes you are comfortable with',
				rules: [ValidationPresets.string.required('Select at least one mode')],
			})
			.addElement('combobox', {
				id: 'preferredOffice',
				name: 'preferredOffice',
				label: 'Preferred Office Location',
				placeholder: 'Select office',
				options: [
					{ label: 'New York HQ', value: 'ny' },
					{ label: 'San Francisco', value: 'sf' },
					{ label: 'London', value: 'london' },
					{ label: 'Berlin', value: 'berlin' },
					{ label: 'Tokyo', value: 'tokyo' },
				],
				constraints: [
					{
						field: 'workMode',
						operator: 'contains',
						value: 'onsite',
						action: 'show',
					},
					{
						field: 'workMode',
						operator: 'contains',
						value: 'hybrid',
						action: 'show',
					},
				],
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
			.addElement('select', {
				id: 'skills',
				name: 'skills',
				label: 'Core Skills',
				placeholder: 'Select all that apply',
				multiple: true,
				options: [
					{ label: 'JavaScript/TypeScript', value: 'js' },
					{ label: 'React', value: 'react' },
					{ label: 'Node.js', value: 'node' },
					{ label: 'Python', value: 'python' },
					{ label: 'Java', value: 'java' },
					{ label: 'Go', value: 'go' },
					{ label: 'Rust', value: 'rust' },
					{ label: 'DevOps', value: 'devops' },
					{ label: 'Database Design', value: 'db' },
					{ label: 'Cloud (AWS/GCP/Azure)', value: 'cloud' },
					{ label: 'Machine Learning', value: 'ml' },
					{ label: 'Mobile Development', value: 'mobile' },
				],
				description: 'Select all technologies you are proficient in',
				rules: [ValidationPresets.string.required('Select at least one skill')],
			})
			.addElement('combobox', {
				id: 'primaryLanguage',
				name: 'primaryLanguage',
				label: 'Primary Programming Language',
				placeholder: 'Select your main language',
				options: [
					{ label: 'JavaScript', value: 'javascript' },
					{ label: 'TypeScript', value: 'typescript' },
					{ label: 'Python', value: 'python' },
					{ label: 'Java', value: 'java' },
					{ label: 'C#', value: 'csharp' },
					{ label: 'Go', value: 'go' },
					{ label: 'Rust', value: 'rust' },
					{ label: 'Ruby', value: 'ruby' },
				],
			})
			.addElement('number', {
				id: 'yearsWithLanguage',
				name: 'yearsWithLanguage',
				label: 'Years of Experience with Primary Language',
				min: 0,
				max: 30,
				step: 1,
				constraints: [
					{
						field: 'primaryLanguage',
						operator: 'is_not_empty',
						value: null,
						action: 'show',
					},
				],
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
			.addElement('textarea', {
				id: 'certifications',
				name: 'certifications',
				label: 'Certifications & Awards',
				placeholder: 'List any relevant certifications or professional awards...',
				rows: 3,
				constraints: [
					{
						field: 'yearsExperience',
						operator: 'greater_than',
						value: 2,
						action: 'show',
					},
				],
			})
			.addStep({
				id: 'availability',
				title: 'Availability & Preferences',
				description: 'When can you start and what are your preferences?',
			})
			.addElement('combobox', {
				id: 'availability',
				name: 'availability',
				label: 'Available to Start',
				placeholder: 'Select availability',
				options: [
					{ label: 'Immediately', value: 'now' },
					{ label: '2 weeks', value: '2weeks' },
					{ label: '1 month', value: '1month' },
					{ label: '2-3 months', value: '2-3months' },
					{ label: 'More than 3 months', value: '3plus' },
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
			.addElement('select', {
				id: 'benefits',
				name: 'benefits',
				label: 'Benefits of Interest',
				placeholder: 'Select all that interest you',
				multiple: true,
				options: [
					{ label: 'Health Insurance', value: 'health' },
					{ label: 'Dental Insurance', value: 'dental' },
					{ label: 'Vision Insurance', value: 'vision' },
					{ label: '401(k) Matching', value: '401k' },
					{ label: 'Remote Work', value: 'remote' },
					{ label: 'Flexible Hours', value: 'flexible' },
					{ label: 'Professional Development', value: 'dev' },
					{ label: 'Stock Options', value: 'stock' },
					{ label: 'Gym Membership', value: 'gym' },
					{ label: 'Parental Leave', value: 'parental' },
				],
				description: 'Choose all benefits that matter to you',
			})
			.addElement('switch', {
				id: 'relocation',
				name: 'relocation',
				label: 'Willing to relocate',
			})
			.addElement('select', {
				id: 'relocationPreferences',
				name: 'relocationPreferences',
				label: 'Preferred Relocation Locations',
				placeholder: 'Select preferred locations',
				multiple: true,
				options: [
					{ label: 'New York, USA', value: 'ny' },
					{ label: 'San Francisco, USA', value: 'sf' },
					{ label: 'London, UK', value: 'london' },
					{ label: 'Berlin, Germany', value: 'berlin' },
					{ label: 'Tokyo, Japan', value: 'tokyo' },
					{ label: 'Singapore', value: 'singapore' },
				],
				constraints: [
					{
						field: 'relocation',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'relocation',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
			})
			.addElement('input', {
				id: 'visaSponsorship',
				name: 'visaSponsorship',
				label: 'Do you require visa sponsorship?',
				inputType: 'text',
				placeholder: 'Yes/No and explain if needed',
				constraints: [
					{
						field: 'relocation',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('phone-input', {
				id: 'emergencyContact',
				name: 'emergencyContact',
				label: 'Emergency Contact Number',
				placeholder: 'Enter emergency contact',
				defaultCountry: 'US',
				description: 'Optional: Emergency contact phone number',
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
			.addElement('input', {
				id: 'portfolioUrl',
				name: 'portfolioUrl',
				label: 'Portfolio/GitHub URL',
				inputType: 'url',
				placeholder: 'https://github.com/username',
				description: 'Required for technical positions',
				constraints: [
					{
						field: 'department',
						operator: 'equals',
						value: 'eng',
						action: 'show',
					},
					{
						field: 'department',
						operator: 'equals',
						value: 'product',
						action: 'show',
					},
					{
						field: 'department',
						operator: 'equals',
						value: 'design',
						action: 'show',
					},
					{
						field: 'department',
						operator: 'equals',
						value: 'eng',
						action: 'require',
					},
				],
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
			.addFormAction('submit', {
				id: 'submit-application',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.build(),
	},
};

export const JobApplicationForm: Story = {
	args: {
		config: createForm()
			.setId('job-application')
			.setTitle('Job Application')
			.setDescription('Apply for an open position at our company')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'personal',
				title: 'Personal Information',
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
				rules: [ValidationPresets.string.required('Email is required'), ValidationPresets.string.email()],
			})
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter phone number',
				defaultCountry: 'US',
			})
			.addStep({
				id: 'application',
				title: 'Application Documents',
				description: 'Upload your resume and cover letter',
			})
			.addElement('drop-zone', {
				id: 'resume',
				name: 'resume',
				label: 'Resume',
				maxFiles: 1,
				rules: [ValidationPresets.array.nonEmpty('Resume is required')],
				accept: {
					'application/pdf': ['.pdf'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'PDF, DOC, or DOCX format',
			})
			.addElement('drop-zone', {
				id: 'coverLetter',
				name: 'coverLetter',
				label: 'Cover Letter (Optional)',
				maxFiles: 1,
				accept: {
					'application/pdf': ['.pdf'],
					'application/msword': ['.doc', '.docx'],
				},
				description: 'PDF, DOC, or DOCX format',
			})
			.addElement('drop-zone', {
				id: 'portfolio',
				name: 'portfolio',
				label: 'Portfolio or Work Samples (Optional)',
				maxFiles: 3,
				maxSize: 10 * 1024 * 1024,
				accept: {
					'application/pdf': ['.pdf'],
					'image/*': ['.jpg', '.jpeg', '.png'],
				},
				description: 'Up to 3 files, 10 MB each',
			})
			.addStep({
				id: 'position',
				title: 'Position Details',
				description: 'Select the position you are applying for',
			})
			.addElement('select', {
				id: 'position',
				name: 'position',
				label: 'Position',
				placeholder: 'Select a position...',
				options: [
					{ label: 'Senior Software Engineer', value: 'senior-swe' },
					{ label: 'Product Manager', value: 'pm' },
					{ label: 'UX Designer', value: 'designer' },
					{ label: 'Data Scientist', value: 'ds' },
				],
				rules: [ValidationPresets.string.required('Please select a position')],
			})
			.addElement('textarea', {
				id: 'motivation',
				name: 'motivation',
				label: 'Why do you want to join our team?',
				placeholder: 'Tell us about your interest in this position...',
				rows: 4,
				rules: [ValidationPresets.string.minLength(50, 'Please provide at least 50 characters')],
			})
			.addStep({
				id: 'confirmation',
				title: 'Review',
				description: 'Confirm your application',
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to the terms and privacy policy',
				rules: [ValidationPresets.string.required('You must agree to proceed')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit Application',
			})
			.addFormAction('submit', {
				id: 'submit-application',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.build(),
	},
};
