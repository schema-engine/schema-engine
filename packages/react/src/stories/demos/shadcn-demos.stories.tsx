import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, ValidationPresets } from '@/stories/shared/form-builder.shadcn';
import { SUBMIT_FORM_MOCK_URL } from '../msw/submit-form';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
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

export const SimpleContactForm: Story = {
	args: {
		config: createForm()
			.setId('shadcn-simple-contact')
			.setTitle('Simple Contact Form')
			.setDescription('Get in touch with our team')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			})
			.addStep({
				id: 'contact',
				title: 'Contact Us',
			})
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'Jane Smith',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('Name is required'),
					ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
					ValidationPresets.string.maxLength(100, 'Name must be less than 100 characters'),
				],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Invalid email address'),
				],
			})
			.addElement('select', {
				id: 'contactMethod',
				name: 'contactMethod',
				label: 'Preferred Contact Method',
				options: [
					{ label: 'Email', value: 'email' },
					{ label: 'Phone', value: 'phone' },
				],
				rules: [ValidationPresets.string.required('Please select a contact method')],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 000-0000',
				inputType: 'tel',
				constraints: [
					{
						field: 'contactMethod',
						operator: 'equals',
						value: 'phone',
						action: 'show',
					},
					{
						field: 'contactMethod',
						operator: 'equals',
						value: 'phone',
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(10, 'Phone number must be at least 10 digits')],
			})
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Tell us how we can help...',
				rows: 4,
				rules: [
					ValidationPresets.string.required('Message is required'),
					ValidationPresets.string.minLength(10, 'Message must be at least 10 characters'),
					ValidationPresets.string.maxLength(1000, 'Message must be less than 1000 characters'),
				],
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
				enabled: true,
				triggers: ['submit_success'],
				resetToDefaults: true,
			} as any)
			.build(),
	},
};

export const NewsletterSignupForm: Story = {
	args: {
		config: createForm()
			.setId('shadcn-newsletter')
			.setTitle('Newsletter Signup')
			.setDescription('Stay updated with our latest news and offers')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			})
			.addStep({
				id: 'signup',
				title: 'Subscribe',
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'you@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Please enter a valid email address'),
				],
			})
			.addElement('input', {
				id: 'firstName',
				name: 'firstName',
				label: 'First Name',
				placeholder: 'Jane',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('First name is required'),
					ValidationPresets.string.minLength(2, 'First name must be at least 2 characters'),
				],
			})
			.addElement('input', {
				id: 'lastName',
				name: 'lastName',
				label: 'Last Name',
				placeholder: 'Smith',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2, 'Last name must be at least 2 characters')],
			})
			.addElement('select', {
				id: 'interests',
				name: 'interests',
				label: 'Primary Interest',
				placeholder: 'Select your primary interest...',
				options: [
					{ label: 'Technology', value: 'tech' },
					{ label: 'Business', value: 'business' },
					{ label: 'Design', value: 'design' },
					{ label: 'Marketing', value: 'marketing' },
					{ label: 'Other', value: 'other' },
				],
				rules: [ValidationPresets.string.required('Please select your primary interest')],
			})
			.addElement('input', {
				id: 'otherInterest',
				name: 'otherInterest',
				label: 'Please specify your interest',
				placeholder: 'e.g., Photography, Music, Sports',
				inputType: 'text',
				constraints: [
					{
						field: 'interests',
						operator: 'equals',
						value: 'other',
						action: 'show',
					},
					{
						field: 'interests',
						operator: 'equals',
						value: 'other',
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(3, 'Please provide at least 3 characters')],
			})
			.addElement('select', {
				id: 'frequency',
				name: 'frequency',
				label: 'Email Frequency',
				options: [
					{ label: 'Daily', value: 'daily' },
					{ label: 'Weekly', value: 'weekly' },
					{ label: 'Monthly', value: 'monthly' },
				],
				rules: [ValidationPresets.string.required('Please select email frequency')],
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to receive marketing emails and accept the privacy policy',
				rules: [ValidationPresets.string.required('You must agree to the terms')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Subscribe Now',
			})
			.addFormAction('submit', {
				id: 'submit-newsletter',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.addFormAction('reset', {
				id: 'reset-form',
				enabled: true,
				triggers: ['submit_success'],
				resetToDefaults: true,
			} as any)
			.build(),
	},
};

export const HotelBookingForm: Story = {
	args: {
		config: createForm()
			.setId('shadcn-hotel-booking')
			.setTitle('Hotel Booking')
			.setDescription('Reserve your perfect stay')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'guest-info',
				title: 'Guest Information',
				description: 'Tell us about your stay',
			})
			.addElement('input', {
				id: 'firstName',
				name: 'firstName',
				label: 'First Name',
				placeholder: 'Jane',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('First name is required'),
					ValidationPresets.string.minLength(2, 'First name must be at least 2 characters'),
				],
			})
			.addElement('input', {
				id: 'lastName',
				name: 'lastName',
				label: 'Last Name',
				placeholder: 'Smith',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('Last name is required'),
					ValidationPresets.string.minLength(2, 'Last name must be at least 2 characters'),
				],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Please enter a valid email address'),
				],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 000-0000',
				inputType: 'tel',
				rules: [
					ValidationPresets.string.required('Phone number is required'),
					ValidationPresets.string.minLength(10, 'Phone number must be at least 10 digits'),
				],
			})
			.addStep({
				id: 'booking-details',
				title: 'Booking Details',
				description: 'Choose your preferences',
			})
			.addElement('input', {
				id: 'checkIn',
				name: 'checkIn',
				label: 'Check-in Date',
				inputType: 'date',
				rules: [ValidationPresets.string.required('Check-in date is required')],
			})
			.addElement('input', {
				id: 'checkOut',
				name: 'checkOut',
				label: 'Check-out Date',
				inputType: 'date',
				rules: [ValidationPresets.string.required('Check-out date is required')],
			})
			.addElement('number', {
				id: 'guests',
				name: 'guests',
				label: 'Number of Guests',
				min: 1,
				max: 8,
				step: 1,
				defaultValue: 2,
				rules: [ValidationPresets.string.required('Number of guests is required')],
			})
			.addElement('number', {
				id: 'rooms',
				name: 'rooms',
				label: 'Number of Rooms',
				min: 1,
				max: 4,
				step: 1,
				defaultValue: 1,
				rules: [ValidationPresets.string.required('Number of rooms is required')],
			})
			.addElement('select', {
				id: 'roomType',
				name: 'roomType',
				label: 'Room Type',
				placeholder: 'Select room type...',
				options: [
					{ label: 'Standard - $150/night', value: 'standard' },
					{ label: 'Deluxe - $250/night', value: 'deluxe' },
					{ label: 'Suite - $400/night', value: 'suite' },
					{ label: 'Penthouse - $750/night', value: 'penthouse' },
				],
				rules: [ValidationPresets.string.required('Room type is required')],
			})
			.addElement('select', {
				id: 'bedPreference',
				name: 'bedPreference',
				label: 'Bed Preference',
				options: [
					{ label: 'King Bed', value: 'king' },
					{ label: 'Queen Bed', value: 'queen' },
					{ label: 'Twin Beds', value: 'twin' },
				],
				constraints: [
					{
						field: 'roomType',
						operator: 'contains',
						value: ['standard', 'deluxe', 'suite'],
						action: 'show',
					},
				],
			})
			.addStep({
				id: 'special-requests',
				title: 'Special Requests',
				description: 'Let us know your preferences',
			})
			.addElement('switch', {
				id: 'hasSpecialRequests',
				name: 'hasSpecialRequests',
				label: 'I have special requests',
			})
			.addElement('textarea', {
				id: 'specialRequests',
				name: 'specialRequests',
				label: 'Special Requests',
				placeholder: 'Any special needs or requests?',
				rows: 3,
				constraints: [
					{
						field: 'hasSpecialRequests',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
				rules: [ValidationPresets.string.minLength(5, 'Please provide at least 5 characters')],
			})
			.addElement('switch', {
				id: 'airportPickup',
				name: 'airportPickup',
				label: 'Arrange airport pickup (+$50)',
			})
			.addElement('input', {
				id: 'flightNumber',
				name: 'flightNumber',
				label: 'Flight Number',
				placeholder: 'e.g., AA1234',
				inputType: 'text',
				constraints: [
					{
						field: 'airportPickup',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'airportPickup',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(4, 'Please enter a valid flight number')],
			})
			.addElement('input', {
				id: 'arrivalTime',
				name: 'arrivalTime',
				label: 'Arrival Time',
				placeholder: '14:30',
				inputType: 'text',
				constraints: [
					{
						field: 'airportPickup',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'airportPickup',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(4, 'Please enter a valid time (e.g., 14:30)')],
			})
			.addStep({
				id: 'confirmation',
				title: 'Review & Confirm',
				description: 'Verify your booking details',
			})
			.addElement('checkbox', {
				id: 'cancellationPolicy',
				name: 'cancellationPolicy',
				label: 'I agree to the cancellation policy (Free cancellation up to 24 hours before check-in)',
				rules: [ValidationPresets.string.required('You must accept the cancellation policy')],
			})
			.addElement('checkbox', {
				id: 'termsAccepted',
				name: 'termsAccepted',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required('You must accept the terms and conditions')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Complete Booking',
			})
			.addFormAction('submit', {
				id: 'submit-booking',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.build(),
	},
};

export const ComprehensiveUserOnboarding: Story = {
	args: {
		config: createForm()
			.setId('shadcn-user-onboarding')
			.setTitle('Welcome to Our Platform')
			.setDescription('Complete your profile setup')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'account-creation',
				title: 'Create Your Account',
				description: 'Let us get to know you',
			})
			.addElement('input', {
				id: 'fullName',
				name: 'fullName',
				label: 'Full Name',
				placeholder: 'Jane Smith',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('Full name is required'),
					ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
					ValidationPresets.string.maxLength(100, 'Name must be less than 100 characters'),
				],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Please enter a valid email address'),
				],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				inputType: 'password',
				placeholder: 'Create a strong password',
				rules: [
					ValidationPresets.string.required('Password is required'),
					ValidationPresets.string.minLength(8, 'Password must be at least 8 characters'),
				],
			})
			.addElement('input', {
				id: 'confirmPassword',
				name: 'confirmPassword',
				label: 'Confirm Password',
				inputType: 'password',
				placeholder: 'Confirm your password',
				rules: [ValidationPresets.string.required('Please confirm your password')],
			})
			.addStep({
				id: 'profile-setup',
				title: 'Profile Setup',
				description: 'Customize your profile',
			})
			.addElement('select', {
				id: 'accountType',
				name: 'accountType',
				label: 'Account Type',
				placeholder: 'Select account type...',
				options: [
					{ label: 'Personal', value: 'personal' },
					{ label: 'Business', value: 'business' },
				],
				rules: [ValidationPresets.string.required('Please select an account type')],
			})
			.addElement('input', {
				id: 'companyName',
				name: 'companyName',
				label: 'Company Name',
				placeholder: 'Acme Corporation',
				inputType: 'text',
				constraints: [
					{
						field: 'accountType',
						operator: 'equals',
						value: 'business',
						action: 'show',
					},
					{
						field: 'accountType',
						operator: 'equals',
						value: 'business',
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(2, 'Company name must be at least 2 characters')],
			})
			.addElement('input', {
				id: 'taxId',
				name: 'taxId',
				label: 'Tax ID / VAT Number',
				placeholder: 'XX-XXXXXXX',
				inputType: 'text',
				constraints: [
					{
						field: 'accountType',
						operator: 'equals',
						value: 'business',
						action: 'show',
					},
				],
			})
			.addElement('textarea', {
				id: 'bio',
				name: 'bio',
				label: 'Bio',
				placeholder: 'Tell us about yourself',
				rows: 4,
				rules: [ValidationPresets.string.maxLength(500, 'Bio must be less than 500 characters')],
			})
			.addElement('input', {
				id: 'location',
				name: 'location',
				label: 'Location',
				placeholder: 'City, Country',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(3, 'Location must be at least 3 characters')],
			})
			.addElement('input', {
				id: 'website',
				name: 'website',
				label: 'Website',
				placeholder: 'https://example.com',
				inputType: 'url',
			})
			.addElement('select', {
				id: 'role',
				name: 'role',
				label: 'Professional Role',
				placeholder: 'Select your role...',
				options: [
					{ label: 'Individual', value: 'individual' },
					{ label: 'Developer', value: 'developer' },
					{ label: 'Designer', value: 'designer' },
					{ label: 'Manager', value: 'manager' },
					{ label: 'Other', value: 'other' },
				],
				rules: [ValidationPresets.string.required('Please select your role')],
			})
			.addElement('input', {
				id: 'customRole',
				name: 'customRole',
				label: 'Please specify your role',
				placeholder: 'e.g., Product Manager, Data Scientist',
				inputType: 'text',
				constraints: [
					{
						field: 'role',
						operator: 'equals',
						value: 'other',
						action: 'show',
					},
					{
						field: 'role',
						operator: 'equals',
						value: 'other',
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(3, 'Role must be at least 3 characters')],
			})
			.addStep({
				id: 'preferences',
				title: 'Preferences',
				description: 'Customize your experience',
			})
			.addElement('select', {
				id: 'theme',
				name: 'theme',
				label: 'Theme Preference',
				options: [
					{ label: 'Light', value: 'light' },
					{ label: 'Dark', value: 'dark' },
					{ label: 'System Default', value: 'system' },
				],
				defaultValue: 'system',
			})
			.addElement('select', {
				id: 'language',
				name: 'language',
				label: 'Preferred Language',
				options: [
					{ label: 'English', value: 'en' },
					{ label: 'Spanish', value: 'es' },
					{ label: 'French', value: 'fr' },
					{ label: 'German', value: 'de' },
				],
				defaultValue: 'en',
			})
			.addElement('switch', {
				id: 'emailNotifications',
				name: 'emailNotifications',
				label: 'Enable email notifications',
				defaultValue: true,
			})
			.addElement('switch', {
				id: 'marketingEmails',
				name: 'marketingEmails',
				label: 'Send me marketing emails and product updates',
				constraints: [
					{
						field: 'emailNotifications',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('switch', {
				id: 'weeklyDigest',
				name: 'weeklyDigest',
				label: 'Receive weekly digest',
				constraints: [
					{
						field: 'emailNotifications',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addStep({
				id: 'interests',
				title: 'Your Interests',
				description: 'Help us personalize your experience',
			})
			.addElement('textarea', {
				id: 'interestNotes',
				name: 'interestNotes',
				label: 'Describe your interests',
				placeholder: 'Tell us about the areas you are interested in...',
				rows: 4,
				rules: [ValidationPresets.string.maxLength(1000, 'Interests must be less than 1000 characters')],
			})
			.addElement('select', {
				id: 'experienceLevel',
				name: 'experienceLevel',
				label: 'Experience Level',
				options: [
					{ label: 'Beginner', value: 'beginner' },
					{ label: 'Intermediate', value: 'intermediate' },
					{ label: 'Advanced', value: 'advanced' },
					{ label: 'Expert', value: 'expert' },
				],
			})
			.addStep({
				id: 'terms-agreements',
				title: 'Review & Accept',
				description: 'Final step before you get started',
			})
			.addElement('checkbox', {
				id: 'acceptTerms',
				name: 'acceptTerms',
				label: 'I have read and accept the terms of service',
				rules: [ValidationPresets.string.required('You must accept the terms of service')],
			})
			.addElement('checkbox', {
				id: 'acceptPrivacy',
				name: 'acceptPrivacy',
				label: 'I have read and accept the privacy policy',
				rules: [ValidationPresets.string.required('You must accept the privacy policy')],
			})
			.addElement('checkbox', {
				id: 'ageConfirmation',
				name: 'ageConfirmation',
				label: 'I confirm that I am at least 18 years old',
				rules: [ValidationPresets.string.required('You must be at least 18 years old')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Complete Setup',
			})
			.addFormAction('submit', {
				id: 'submit-onboarding',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.build(),
	},
};

export const SoftwareProjectCreation: Story = {
	args: {
		config: createForm()
			.setId('shadcn-project-creation')
			.setTitle('Create New Software Project')
			.setDescription('Set up your development project')
			.setStepper('default', {
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			})
			.addStep({
				id: 'basic-info',
				title: 'Basic Information',
				description: 'Project details and naming',
			})
			.addElement('input', {
				id: 'projectName',
				name: 'projectName',
				label: 'Project Name',
				placeholder: 'my-awesome-project',
				inputType: 'text',
				rules: [
					ValidationPresets.string.required('Project name is required'),
					ValidationPresets.string.minLength(3, 'Project name must be at least 3 characters'),
					ValidationPresets.string.maxLength(50, 'Project name must be less than 50 characters'),
				],
			})
			.addElement('textarea', {
				id: 'projectDescription',
				name: 'projectDescription',
				label: 'Project Description',
				placeholder: 'What is your project about?',
				rows: 4,
				rules: [
					ValidationPresets.string.required('Project description is required'),
					ValidationPresets.string.minLength(10, 'Description must be at least 10 characters'),
					ValidationPresets.string.maxLength(500, 'Description must be less than 500 characters'),
				],
			})
			.addElement('select', {
				id: 'visibility',
				name: 'visibility',
				label: 'Visibility',
				placeholder: 'Select visibility...',
				options: [
					{ label: 'Public - Anyone can see this project', value: 'public' },
					{ label: 'Private - Only you and team members', value: 'private' },
					{ label: 'Internal - Organization members only', value: 'internal' },
				],
				rules: [ValidationPresets.string.required('Please select project visibility')],
			})
			.addElement('select', {
				id: 'projectType',
				name: 'projectType',
				label: 'Project Type',
				placeholder: 'Select project type...',
				options: [
					{ label: 'Web Application', value: 'web-app' },
					{ label: 'Mobile Application', value: 'mobile-app' },
					{ label: 'API / Backend Service', value: 'api' },
					{ label: 'Library / Package', value: 'library' },
					{ label: 'CLI Tool', value: 'cli' },
				],
				rules: [ValidationPresets.string.required('Please select project type')],
			})
			.addStep({
				id: 'tech-stack',
				title: 'Technology Stack',
				description: 'Choose your technologies',
			})
			.addElement('select', {
				id: 'framework',
				name: 'framework',
				label: 'Primary Framework',
				options: [
					{ label: 'Select framework...', value: '' },
					{ label: 'React', value: 'react' },
					{ label: 'Vue', value: 'vue' },
					{ label: 'Angular', value: 'angular' },
					{ label: 'Next.js', value: 'nextjs' },
					{ label: 'Express', value: 'express' },
					{ label: 'Fastify', value: 'fastify' },
					{ label: 'Other', value: 'other' },
				],
				rules: [ValidationPresets.string.required('Please select a framework')],
			})
			.addElement('input', {
				id: 'customFramework',
				name: 'customFramework',
				label: 'Specify Framework',
				placeholder: 'e.g., Svelte, SolidJS, etc.',
				inputType: 'text',
				constraints: [
					{
						field: 'framework',
						operator: 'equals',
						value: 'other',
						action: 'show',
					},
					{
						field: 'framework',
						operator: 'equals',
						value: 'other',
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(2, 'Framework name must be at least 2 characters')],
			})
			.addElement('select', {
				id: 'language',
				name: 'language',
				label: 'Primary Language',
				options: [
					{ label: 'TypeScript', value: 'typescript' },
					{ label: 'JavaScript', value: 'javascript' },
					{ label: 'Python', value: 'python' },
					{ label: 'Go', value: 'go' },
					{ label: 'Rust', value: 'rust' },
				],
				rules: [ValidationPresets.string.required('Please select a language')],
			})
			.addElement('select', {
				id: 'database',
				name: 'database',
				label: 'Database',
				options: [
					{ label: 'None', value: 'none' },
					{ label: 'PostgreSQL', value: 'postgresql' },
					{ label: 'MySQL', value: 'mysql' },
					{ label: 'MongoDB', value: 'mongodb' },
					{ label: 'Redis', value: 'redis' },
					{ label: 'SQLite', value: 'sqlite' },
				],
			})
			.addStep({
				id: 'team-settings',
				title: 'Team & Collaboration',
				description: 'Configure team settings',
			})
			.addElement('switch', {
				id: 'enableTeam',
				name: 'enableTeam',
				label: 'Enable team collaboration',
			})
			.addElement('input', {
				id: 'teamName',
				name: 'teamName',
				label: 'Team Name',
				placeholder: 'My Development Team',
				inputType: 'text',
				constraints: [
					{
						field: 'enableTeam',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'enableTeam',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
				rules: [ValidationPresets.string.minLength(3, 'Team name must be at least 3 characters')],
			})
			.addElement('number', {
				id: 'maxMembers',
				name: 'maxMembers',
				label: 'Max Team Members',
				min: 1,
				max: 100,
				step: 1,
				defaultValue: 5,
				constraints: [
					{
						field: 'enableTeam',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('switch', {
				id: 'requireApproval',
				name: 'requireApproval',
				label: 'Require approval for pull requests',
				constraints: [
					{
						field: 'enableTeam',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addStep({
				id: 'deployment',
				title: 'Deployment Options',
				description: 'Choose deployment preferences',
			})
			.addElement('switch', {
				id: 'autoDeployment',
				name: 'autoDeployment',
				label: 'Enable automatic deployment',
			})
			.addElement('select', {
				id: 'deploymentPlatform',
				name: 'deploymentPlatform',
				label: 'Deployment Platform',
				options: [
					{ label: 'Select platform...', value: '' },
					{ label: 'Vercel', value: 'vercel' },
					{ label: 'Netlify', value: 'netlify' },
					{ label: 'AWS', value: 'aws' },
					{ label: 'Google Cloud', value: 'gcp' },
					{ label: 'Azure', value: 'azure' },
					{ label: 'Self-hosted', value: 'self-hosted' },
				],
				constraints: [
					{
						field: 'autoDeployment',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'autoDeployment',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
			})
			.addElement('select', {
				id: 'deploymentBranch',
				name: 'deploymentBranch',
				label: 'Deployment Branch',
				options: [
					{ label: 'main', value: 'main' },
					{ label: 'master', value: 'master' },
					{ label: 'production', value: 'production' },
				],
				constraints: [
					{
						field: 'autoDeployment',
						operator: 'equals',
						value: true,
						action: 'show',
					},
				],
			})
			.addElement('switch', {
				id: 'enableMonitoring',
				name: 'enableMonitoring',
				label: 'Enable Performance Monitoring',
			})
			.addElement('select', {
				id: 'monitoringProvider',
				name: 'monitoringProvider',
				label: 'Monitoring Provider',
				options: [
					{ label: 'Sentry', value: 'sentry' },
					{ label: 'Datadog', value: 'datadog' },
					{ label: 'New Relic', value: 'newrelic' },
					{ label: 'Custom', value: 'custom' },
				],
				constraints: [
					{
						field: 'enableMonitoring',
						operator: 'equals',
						value: true,
						action: 'show',
					},
					{
						field: 'enableMonitoring',
						operator: 'equals',
						value: true,
						action: 'require',
					},
				],
			})
			.addElement('switch', {
				id: 'enableLogging',
				name: 'enableLogging',
				label: 'Enable Centralized Logging',
			})
			.addStep({
				id: 'review',
				title: 'Review & Create',
				description: 'Review your project configuration',
			})
			.addElement('textarea', {
				id: 'additionalNotes',
				name: 'additionalNotes',
				label: 'Additional Notes',
				placeholder: 'Any other details or requirements?',
				rows: 4,
				rules: [ValidationPresets.string.maxLength(1000, 'Notes must be less than 1000 characters')],
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to the project terms and conditions',
				rules: [ValidationPresets.string.required('You must accept the terms and conditions')],
			})
			.addElement('checkbox', {
				id: 'confirmConfiguration',
				name: 'confirmConfiguration',
				label: 'I have reviewed the configuration and it is correct',
				rules: [ValidationPresets.string.required('Please confirm your configuration')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Project',
			})
			.addFormAction('submit', {
				id: 'submit-project',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: SUBMIT_FORM_MOCK_URL,
				method: 'POST',
			} as any)
			.build(),
	},
};
