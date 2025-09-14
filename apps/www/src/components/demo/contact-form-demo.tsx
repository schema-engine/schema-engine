import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';

const contactFormConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: "Get in touch with our team. We'll get back to you within 24 hours.",
	mode: 'free' as const,
	autoGenerateSchema: true,

	steps: [
		{
			id: 'contact-info',
			title: 'Contact Information',
			elements: [
				{
					id: 'firstName',
					componentId: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'Enter your first name',
					rules: [
						ValidationPresets.required('First name is required'),
						ValidationPresets.minLength(2, 'First name must be at least 2 characters'),
					],
				},
				{
					id: 'lastName',
					componentId: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					rules: [
						ValidationPresets.required('Last name is required'),
						ValidationPresets.minLength(2, 'Last name must be at least 2 characters'),
					],
				},
				{
					id: 'email',
					componentId: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email address'),
					],
				},
				{
					id: 'inquiryType',
					componentId: 'select',
					name: 'inquiryType',
					label: 'Inquiry Type',
					placeholder: 'Select inquiry type',
					options: [
						{ label: 'General Question', value: 'general' },
						{ label: 'Technical Support', value: 'support' },
						{ label: 'Sales Inquiry', value: 'sales' },
						{ label: 'Partnership', value: 'partnership' },
						{ label: 'Media/Press', value: 'media' },
						{ label: 'Other', value: 'other' },
					],
					rules: [ValidationPresets.required('Please select an inquiry type')],
				},
				{
					id: 'priority',
					componentId: 'select',
					name: 'priority',
					label: 'Priority Level',
					placeholder: 'Select priority',
					options: [
						{ label: 'Low', value: 'low' },
						{ label: 'Medium', value: 'medium' },
						{ label: 'High', value: 'high' },
						{ label: 'Urgent', value: 'urgent' },
					],
					defaultValue: 'medium',
					rules: [ValidationPresets.required('Please select a priority level')],
				},
				{
					id: 'budget',
					componentId: 'select',
					name: 'budget',
					label: 'Project Budget',
					placeholder: 'Select budget range',
					constraints: [
						{
							field: 'inquiryType',
							operator: 'contains',
							value: ['sales', 'partnership'],
							action: 'show',
						},
					],
					options: [
						{ label: 'Under $10,000', value: 'under-10k' },
						{ label: '$10,000 - $25,000', value: '10k-25k' },
						{ label: '$25,000 - $50,000', value: '25k-50k' },
						{ label: '$50,000 - $100,000', value: '50k-100k' },
						{ label: 'Over $100,000', value: 'over-100k' },
						{ label: 'To be discussed', value: 'tbd' },
					],
				},
				{
					id: 'subject',
					componentId: 'input',
					inputType: 'text',
					name: 'subject',
					label: 'Subject',
					placeholder: 'Brief subject line',
					rules: [
						ValidationPresets.required('Subject is required'),
						ValidationPresets.minLength(5, 'Subject must be at least 5 characters'),
						ValidationPresets.maxLength(100, 'Subject must be less than 100 characters'),
					],
				},
				{
					id: 'message',
					componentId: 'textarea',
					name: 'message',
					label: 'Message',
					placeholder: 'Please provide details about your inquiry...',
					rows: 6,
					rules: [
						ValidationPresets.required('Message is required'),
						ValidationPresets.minLength(20, 'Please provide more details (minimum 20 characters)'),
						ValidationPresets.maxLength(2000, 'Message is too long (maximum 2000 characters)'),
					],
				},
				{
					id: 'newsletter',
					componentId: 'checkbox',
					name: 'newsletter',
					label: 'Subscribe to our newsletter',
					defaultValue: false,
				},
				{
					id: 'terms',
					componentId: 'checkbox',
					name: 'terms',
					label: 'I agree to the terms and conditions',
					rules: [ValidationPresets.required('You must agree to the terms and conditions')],
				},
			],
		},
	],

	grid: {
		columns: 2,
		gap: '1rem',
		responsive: {
			default: { columns: 1 },
			md: { columns: 2 },
		},
	},

	actions: [
		{
			id: 'submit',
			type: 'submit' as const,
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST' as const,
			successMessage: "Thank you for your message! We'll get back to you within 24 hours.",
			errorMessage: 'Failed to send message. Please try again.',
		},
	],
};

export function ContactFormDemo() {
	const handleSubmit = (data: any) => {
		console.log('Contact form submitted:', data);
		alert('Form submitted successfully! Check the console for details.');
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="max-w-4xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Contact Form Example</CardTitle>
						<CardDescription>
							A comprehensive contact form with conditional fields, validation, and responsive design. Try
							selecting different inquiry types to see conditional budget fields appear.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FormRenderer config={contactFormConfig} onSubmit={handleSubmit} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
