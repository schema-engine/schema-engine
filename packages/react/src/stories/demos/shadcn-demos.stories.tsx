import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, ValidationPresets } from '@/stories/shared/form-builder.shadcn';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Complete demo forms for Shadcn components, ranging from simple contact forms to complex multi-step applications with polished UI and comprehensive validation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
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
				rules: [ValidationPresets.string.minLength(2, 'Name must be at least 2 characters')],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email('Invalid email address')],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 000-0000',
				inputType: 'tel',
			})
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Tell us how we can help...',
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
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'firstName',
				name: 'firstName',
				label: 'First Name',
				placeholder: 'Jane',
				inputType: 'text',
			})
			.addElement('select', {
				id: 'interests',
				name: 'interests',
				label: 'Primary Interest',
				options: [
					{ label: 'Technology', value: 'tech' },
					{ label: 'Business', value: 'business' },
					{ label: 'Design', value: 'design' },
					{ label: 'Marketing', value: 'marketing' },
				],
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to receive marketing emails',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Subscribe Now',
			})
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
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'lastName',
				name: 'lastName',
				label: 'Last Name',
				placeholder: 'Smith',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 000-0000',
				inputType: 'tel',
				rules: [ValidationPresets.string.required()],
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
				rules: [ValidationPresets.string.required()],
			})
			.addElement('input', {
				id: 'checkOut',
				name: 'checkOut',
				label: 'Check-out Date',
				inputType: 'date',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('number', {
				id: 'guests',
				name: 'guests',
				label: 'Number of Guests',
				min: 1,
				max: 8,
				step: 1,
				defaultValue: 2,
				rules: [ValidationPresets.string.required()],
			})
			.addElement('number', {
				id: 'rooms',
				name: 'rooms',
				label: 'Number of Rooms',
				min: 1,
				max: 4,
				step: 1,
				defaultValue: 1,
				rules: [ValidationPresets.string.required()],
			})
			.addElement('select', {
				id: 'roomType',
				name: 'roomType',
				label: 'Room Type',
				options: [
					{ label: 'Standard', value: 'standard' },
					{ label: 'Deluxe', value: 'deluxe' },
					{ label: 'Suite', value: 'suite' },
					{ label: 'Penthouse', value: 'penthouse' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addStep({
				id: 'special-requests',
				title: 'Special Requests',
				description: 'Let us know your preferences',
			})
			.addElement('textarea', {
				id: 'specialRequests',
				name: 'specialRequests',
				label: 'Special Requests',
				placeholder: 'Any special needs or requests?',
				rows: 3,
			})
			.addElement('switch', {
				id: 'airportPickup',
				name: 'airportPickup',
				label: 'Arrange airport pickup',
			})
			.addStep({
				id: 'confirmation',
				title: 'Review & Confirm',
				description: 'Verify your booking details',
			})
			.addElement('checkbox', {
				id: 'cancellationPolicy',
				name: 'cancellationPolicy',
				label: 'I agree to the cancellation policy',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('checkbox', {
				id: 'termsAccepted',
				name: 'termsAccepted',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Complete Booking',
			})
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
				rules: [ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'jane@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				inputType: 'password',
				placeholder: 'Create a strong password',
				rules: [ValidationPresets.string.minLength(8, 'Password must be at least 8 characters')],
			})
			.addElement('input', {
				id: 'confirmPassword',
				name: 'confirmPassword',
				label: 'Confirm Password',
				inputType: 'password',
				placeholder: 'Confirm your password',
				rules: [ValidationPresets.string.required()],
			})
			.addStep({
				id: 'profile-setup',
				title: 'Profile Setup',
				description: 'Customize your profile',
			})
			.addElement('textarea', {
				id: 'bio',
				name: 'bio',
				label: 'Bio',
				placeholder: 'Tell us about yourself',
				rows: 4,
			})
			.addElement('input', {
				id: 'location',
				name: 'location',
				label: 'Location',
				placeholder: 'City, Country',
				inputType: 'text',
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
				label: 'Role',
				options: [
					{ label: 'Individual', value: 'individual' },
					{ label: 'Developer', value: 'developer' },
					{ label: 'Designer', value: 'designer' },
					{ label: 'Manager', value: 'manager' },
					{ label: 'Other', value: 'other' },
				],
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
			})
			.addElement('switch', {
				id: 'marketingEmails',
				name: 'marketingEmails',
				label: 'Send me marketing emails and product updates',
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
			})
			.addStep({
				id: 'terms-agreements',
				title: 'Review & Accept',
				description: 'Final step before you get started',
			})
			.addElement('textarea', {
				id: 'termsText',
				name: 'termsText',
				label: 'Terms of Service',
				placeholder: 'Terms and conditions text here...',
				rows: 5,
				disabled: true,
			})
			.addElement('checkbox', {
				id: 'acceptTerms',
				name: 'acceptTerms',
				label: 'I have read and accept the terms of service',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('checkbox', {
				id: 'acceptPrivacy',
				name: 'acceptPrivacy',
				label: 'I have read and accept the privacy policy',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Complete Setup',
			})
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
				placeholder: 'My Awesome Project',
				inputType: 'text',
				rules: [ValidationPresets.string.minLength(3)],
			})
			.addElement('textarea', {
				id: 'projectDescription',
				name: 'projectDescription',
				label: 'Project Description',
				placeholder: 'What is your project about?',
				rows: 4,
				rules: [ValidationPresets.string.minLength(10)],
			})
			.addElement('select', {
				id: 'visibility',
				name: 'visibility',
				label: 'Visibility',
				options: [
					{ label: 'Public', value: 'public' },
					{ label: 'Private', value: 'private' },
					{ label: 'Internal', value: 'internal' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addStep({
				id: 'tech-stack',
				title: 'Technology Stack',
				description: 'Choose your technologies',
			})
			.addElement('textarea', {
				id: 'techStack',
				name: 'techStack',
				label: 'Describe your technology stack',
				placeholder: 'List the technologies and frameworks you plan to use...',
				rows: 4,
			})
			.addStep({
				id: 'team-settings',
				title: 'Team & Collaboration',
				description: 'Configure team settings',
			})
			.addElement('input', {
				id: 'teamName',
				name: 'teamName',
				label: 'Team Name',
				placeholder: 'My Development Team',
				inputType: 'text',
			})
			.addElement('number', {
				id: 'maxMembers',
				name: 'maxMembers',
				label: 'Max Team Members',
				min: 1,
				max: 100,
				step: 1,
				defaultValue: 5,
			})
			.addStep({
				id: 'deployment',
				title: 'Deployment Options',
				description: 'Choose deployment preferences',
			})
			.addElement('select', {
				id: 'deploymentPlatform',
				name: 'deploymentPlatform',
				label: 'Deployment Platform',
				options: [
					{ label: 'Vercel', value: 'vercel' },
					{ label: 'Netlify', value: 'netlify' },
					{ label: 'AWS', value: 'aws' },
					{ label: 'Google Cloud', value: 'gcp' },
					{ label: 'Azure', value: 'azure' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('switch', {
				id: 'enableMonitoring',
				name: 'enableMonitoring',
				label: 'Enable Performance Monitoring',
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
			})
			.addElement('checkbox', {
				id: 'agreeToTerms',
				name: 'agreeToTerms',
				label: 'I agree to the project terms and conditions',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Project',
			})
			.build(),
	},
};
