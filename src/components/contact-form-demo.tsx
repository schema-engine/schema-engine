import { FormRenderer } from '@/lib/form-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationPresets } from '@/lib/form-engine/validation';
import '@/components/form/registry';

const contactFormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: "Get in touch with our team. We'll get back to you within 24 hours.",
	mode: 'free' as const,
	autoGenerateSchema: true,

	steps: [
		{
			id: 'contact-info',
			title: 'Contact Information',
			fields: [
				{
					id: 'firstName',
					type: 'input' as const,
					inputType: 'text' as const,
					name: 'firstName',
					label: 'First Name',
					placeholder: 'Enter your first name',
					required: true,
					validation: [
						ValidationPresets.required('First name is required'),
						ValidationPresets.minLength(2, 'First name must be at least 2 characters'),
					],
				},
				{
					id: 'lastName',
					type: 'input' as const,
					inputType: 'text' as const,
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					required: true,
					validation: [
						ValidationPresets.required('Last name is required'),
						ValidationPresets.minLength(2, 'Last name must be at least 2 characters'),
					],
				},
				{
					id: 'email',
					type: 'input' as const,
					inputType: 'email' as const,
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					required: true,
					validation: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email address'),
					],
				},
				{
					id: 'inquiryType',
					type: 'select' as const,
					name: 'inquiryType',
					label: 'Inquiry Type',
					placeholder: 'Select inquiry type',
					required: true,
					options: [
						{ label: 'General Question', value: 'general' },
						{ label: 'Technical Support', value: 'support' },
						{ label: 'Sales Inquiry', value: 'sales' },
						{ label: 'Partnership', value: 'partnership' },
						{ label: 'Media/Press', value: 'media' },
						{ label: 'Other', value: 'other' },
					],
					validation: [ValidationPresets.required('Please select an inquiry type')],
				},
				{
					id: 'priority',
					type: 'select' as const,
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
					validation: [ValidationPresets.required('Please select a priority level')],
				},
				{
					id: 'budget',
					type: 'select' as const,
					name: 'budget',
					label: 'Project Budget',
					placeholder: 'Select budget range',
					conditional: {
						field: 'inquiryType',
						operator: 'in' as const,
						value: ['sales', 'partnership'],
						action: 'show' as const,
					},
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
					type: 'input' as const,
					inputType: 'text' as const,
					name: 'subject',
					label: 'Subject',
					placeholder: 'Brief subject line',
					required: true,
					validation: [
						ValidationPresets.required('Subject is required'),
						ValidationPresets.minLength(5, 'Subject must be at least 5 characters'),
						ValidationPresets.maxLength(100, 'Subject must be less than 100 characters'),
					],
				},
				{
					id: 'message',
					type: 'textarea' as const,
					name: 'message',
					label: 'Message',
					placeholder: 'Please provide details about your inquiry...',
					required: true,
					props: {
						rows: 6,
						maxLength: 2000,
					},
					validation: [
						ValidationPresets.required('Message is required'),
						ValidationPresets.minLength(20, 'Please provide more details (minimum 20 characters)'),
					],
				},
				{
					id: 'newsletter',
					type: 'checkbox' as const,
					name: 'newsletter',
					label: 'Subscribe to our newsletter',
					defaultValue: false,
				},
				{
					id: 'terms',
					type: 'checkbox' as const,
					name: 'terms',
					label: 'I agree to the terms and conditions',
					required: true,
					validation: [ValidationPresets.required('You must agree to the terms and conditions')],
				},
			],
		},
	],

	grid: {
		columns: 2,
		gap: '1rem',
		responsive: {
			xs: { columns: 1 },
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
