import { ValidationPresets } from "@/lib/form-engine";
import type { FormConfig } from "../../lib/form-engine/types/form";

/**
 * Enhanced 3-step form demo with new simplified action system
 * Demonstrates automatic execution based on triggers
 */

/**
 * Form configuration with simplified action system
 * - Global actions run automatically based on triggers
 * - Step actions run only for specific steps
 */
export const actionsFormConfig: FormConfig = {
	id: "enhanced-actions-demo",
	title: "Enhanced Form Actions Demo",
	description:
		"Demonstrates simplified action system with auto-save, GTM tracking, and submission handling",
	mode: "wizard",
	autoGenerateSchema: true,
	steps: [
		{
			id: "user-info",
			title: "User Information",
			description: "Tell us about yourself",
			fields: [
				{
					id: "firstName",
					name: "firstName",
					type: "input",
					inputType: "text",
					label: "First Name",
					placeholder: "Enter your first name",
					validation: [ValidationPresets.required("First Name is required")],
				},
				{
					id: "lastName",
					name: "lastName",
					type: "input",
					inputType: "text",
					label: "Last Name",
					placeholder: "Enter your last name",
					validation: [ValidationPresets.required("Last Name is required")],
				},
				{
					id: "email",
					name: "email",
					type: "input",
					inputType: "email",
					label: "Email Address",
					placeholder: "Enter your email address",
					validation: [
						ValidationPresets.required("Email Address is required"),
						ValidationPresets.email(),
					],
				},
				{
					id: "dateOfBirth",
					name: "dateOfBirth",
					type: "input",
					inputType: "text",
					label: "Date of Birth",
					validation: [ValidationPresets.required("Date of Birth is required")],
				},
			],
			actions: [
				{
					id: "step1-completion-tracking",
					type: "gtm_event",
					description: "Track completion of user info step",
					eventName: "form_step_complete",
					eventData: {
						step_name: "user_info",
						step_number: 1,
					},
					includeFormData: false,
					triggers: ["step_submit"],
					enabled: true,
				},
			],
		},
		{
			id: "contact-info",
			title: "Contact Information",
			description: "How can we reach you?",
			fields: [
				{
					id: "phone",
					name: "phone",
					type: "input",
					inputType: "tel",
					label: "Phone Number",
					placeholder: "Enter your phone number",
					validation: [ValidationPresets.required("Phone Number is required")],
				},
				{
					id: "address",
					name: "address",
					type: "input",
					inputType: "text",
					label: "Street Address",
					placeholder: "Enter your street address",
					validation: [ValidationPresets.required("Street Address is required")],
				},
				{
					id: "city",
					name: "city",
					type: "input",
					inputType: "text",
					label: "City",
					placeholder: "Enter your city",
					validation: [ValidationPresets.required("City is required")],
				},
				{
					id: "zipCode",
					name: "zipCode",
					type: "input",
					inputType: "text",
					label: "ZIP Code",
					placeholder: "Enter your ZIP code",
					validation: [ValidationPresets.required("ZIP Code is required")],
				},
			],
			actions: [
				{
					id: "step2-completion-tracking",
					type: "gtm_event",
					description: "Track completion of contact info step",
					eventName: "form_step_complete",
					eventData: {
						step_name: "contact_info",
						step_number: 2,
					},
					includeFormData: false,
					triggers: ["step_submit"],
					enabled: true,
				},
			],
		},
		{
			id: "preferences",
			title: "Preferences",
			description: "Customize your experience",
			fields: [
				{
					id: "newsletter",
					name: "newsletter",
					type: "checkbox",
					label: "Subscribe to Newsletter",
					description: "Receive updates about new features and content",
				},
				{
					id: "notifications",
					name: "notifications",
					type: "select",
					label: "Notification Preferences",
					options: [
						{ value: "email", label: "Email Only" },
						{ value: "sms", label: "SMS Only" },
						{ value: "both", label: "Email and SMS" },
						{ value: "none", label: "No Notifications" },
					],
					validation: [ValidationPresets.required("Please select notification preferences")],
				},
				{
					id: "interests",
					name: "interests",
					type: "checkbox",
					label: "Areas of Interest",
					description:
						"Select your areas of interest. Note: This uses individual checkboxes instead of a group.",
					validation: [ValidationPresets.required("Please select at least one area of interest")],
				},
			],
			actions: [
				{
					id: "step3-completion-tracking",
					type: "gtm_event",
					description: "Track completion of preferences step",
					eventName: "form_step_complete",
					eventData: {
						step_name: "preferences",
						step_number: 3,
						final_step: true,
					},
					includeFormData: false,
					triggers: ["step_submit"],
					enabled: true,
				},
			],
		},
	],
	actions: [
		{
			id: "global-auto-save",
			type: "auto_save",
			description: "Automatically save form progress",
			storageKey: "enhanced-actions-demo-autosave",
			includeSensitive: false,
			enabled: true,
		},
		{
			id: "global-form-start-tracking",
			type: "gtm_event",
			description: "Track when user starts the form",
			eventName: "form_start",
			eventData: {
				form_type: "enhanced_demo",
				form_version: "2.0",
			},
			includeFormData: false,
			triggers: ["form_start"],
			enabled: true,
		},
		{
			id: "global-form-submit-tracking",
			type: "gtm_event",
			description: "Track successful form submission",
			eventName: "form_submit_success",
			eventData: {
				form_type: "enhanced_demo",
				conversion_event: true,
			},
			includeFormData: ["email", "notifications", "interests"],
			triggers: ["form_submit"],
			enabled: true,
		},
		{
			id: "global-submit",
			type: "submit",
			description: "Submit form data to server",
			endpoint: "/api/submit-demo",
			method: "POST",
			successMessage: "Your information has been submitted successfully!",
			errorMessage: "There was an error submitting your form. Please try again.",
			enabled: true,
		},
	],
};

/**
 * Simple single-step form for basic testing
 */
export const simpleActionsFormConfig: FormConfig = {
	id: "simple-actions-demo",
	title: "Simple Actions Demo",
	description: "Basic form with minimal actions for testing",
	mode: "free",
	autoGenerateSchema: true,
	steps: [
		{
			id: "simple-step",
			title: "Contact Information",
			description: "Fill in your details",
			fields: [
				{
					id: "name",
					name: "name",
					type: "input",
					inputType: "text",
					label: "Name",
					placeholder: "Enter your name",
					validation: [ValidationPresets.required("Name is required")],
				},
				{
					id: "email",
					name: "email",
					type: "input",
					inputType: "email",
					label: "Email",
					placeholder: "Enter your email",
					validation: [ValidationPresets.required("Email is required"), ValidationPresets.email()],
				},
				{
					id: "message",
					name: "message",
					type: "textarea",
					label: "Message",
					placeholder: "Enter your message",
					validation: [ValidationPresets.required("Message is required")],
				},
			],
		},
	],
	actions: [
		{
			id: "simple-auto-save",
			type: "auto_save",
			description: "Auto-save form progress",
			storageKey: "simple-actions-demo-autosave",
			includeSensitive: false,
			enabled: true,
		},
		{
			id: "simple-interval-save",
			type: "auto_save",
			description: "Interval-based auto-save",
			storageKey: "simple-actions-demo-interval-autosave",
			includeSensitive: false,
			enabled: true,
		},
		{
			id: "simple-start-tracking",
			type: "gtm_event",
			description: "Track when form is loaded",
			eventName: "simple_form_start",
			eventData: {
				form_type: "simple_demo",
			},
			includeFormData: false,
			triggers: ["form_start"],
			enabled: true,
		},
		{
			id: "simple-submit-tracking",
			type: "gtm_event",
			description: "Track form submission",
			eventName: "simple_form_submit",
			eventData: {
				form_type: "simple_demo",
				action: "submit",
			},
			includeFormData: ["name", "email"],
			triggers: ["form_submit"],
			enabled: true,
		},
		{
			id: "simple-submit",
			type: "submit",
			description: "Submit simple form",
			endpoint: "/api/submit-demo",
			method: "POST",
			successMessage: "Message sent successfully!",
			errorMessage: "Failed to send message. Please try again.",
			enabled: true,
		},
		{
			id: "reset-after-success",
			type: "reset",
			enabled: true,
			triggers: ["submit_success"],
			resetToDefaults: true,
		},
	],
};
