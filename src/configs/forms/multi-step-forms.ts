import { ValidationPresets } from "@/lib/form-engine/validation";
import type { FormConfig } from "@/lib/form-engine/types/form";

/**
 * Multi-step registration form configuration
 */
export const multiStepRegistrationConfig: FormConfig = {
	id: "multi-step-user-registration",
	title: "User Registration",
	description: "Complete your registration by filling out all required information.",
	mode: "wizard",
	autoGenerateSchema: true,
	steps: [
		{
			id: "personal-info",
			title: "Personal Information",
			description: "Tell us about yourself",
			icon: "👤",
			fields: [
				{
					type: "input",
					inputType: "text",
					id: "firstName",
					name: "firstName",
					label: "First Name",
					placeholder: "Enter your first name",
					validation: [
						ValidationPresets.required("First name is required"),
						ValidationPresets.minLength(2, "First name must be at least 2 characters"),
					],
				},
				{
					type: "input",
					inputType: "text",
					id: "lastName",
					name: "lastName",
					label: "Last Name",
					placeholder: "Enter your last name",
					validation: [
						ValidationPresets.required("Last name is required"),
						ValidationPresets.minLength(2, "Last name must be at least 2 characters"),
					],
				},
				{
					type: "input",
					inputType: "email",
					id: "email",
					name: "email",
					label: "Email Address",
					placeholder: "Enter your email",
					validation: [
						ValidationPresets.required("Email is required"),
						ValidationPresets.email("Please enter a valid email address"),
					],
				},
				{
					type: "input",
					inputType: "text",
					id: "dateOfBirth",
					name: "dateOfBirth",
					label: "Date of Birth",
					placeholder: "MM/DD/YYYY",
					validation: [ValidationPresets.required("Date of birth is required")],
				},
			],
		},
		{
			id: "contact-info",
			title: "Contact Information",
			description: "How can we reach you?",
			icon: "📞",
			fields: [
				{
					type: "input",
					inputType: "tel",
					id: "phone",
					name: "phone",
					label: "Phone Number",
					placeholder: "Enter your phone number",
					validation: [
						ValidationPresets.required("Phone number is required"),
						ValidationPresets.minLength(10, "Phone number must be at least 10 digits"),
					],
				},
				{
					type: "input",
					inputType: "text",
					id: "address",
					name: "address",
					label: "Street Address",
					placeholder: "Enter your street address",
					validation: [ValidationPresets.required("Street address is required")],
				},
				{
					type: "input",
					inputType: "text",
					id: "city",
					name: "city",
					label: "City",
					placeholder: "Enter your city",
					validation: [ValidationPresets.required("City is required")],
				},
				{
					type: "input",
					inputType: "text",
					id: "zipCode",
					name: "zipCode",
					label: "ZIP Code",
					placeholder: "Enter your ZIP code",
					validation: [ValidationPresets.required("ZIP code is required")],
				},
			],
		},
		{
			id: "preferences",
			title: "Preferences",
			description: "Customize your experience",
			icon: "⚙️",
			fields: [
				{
					type: "select",
					id: "language",
					name: "language",
					label: "Preferred Language",
					options: [
						{ value: "en", label: "English" },
						{ value: "es", label: "Spanish" },
						{ value: "fr", label: "French" },
						{ value: "de", label: "German" },
					],
					defaultValue: "en",
				},
				{
					type: "textarea",
					id: "bio",
					name: "bio",
					label: "Bio",
					placeholder: "Tell us about yourself (optional)",
				},
			],
		},
	],
	stepper: {
		orientation: "horizontal",
		variant: "default",
		position: "top",
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		validateOnNext: true,
		buttons: {
			previous: {
				label: "Previous",
				variant: "outline",
			},
			next: {
				label: "Next",
				variant: "primary",
			},
			submit: {
				label: "Complete Registration",
				variant: "primary",
			},
		},
	},
	grid: {
		columns: 2,
		gap: "1rem",
		responsive: {
			default: { columns: 1 },
			md: { columns: 2 },
		},
	},
	actions: [
		{
			id: "multi-step-forms-submit",
			type: "submit",
			description: "Submit multi-step form",
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

/**
 * Vertical stepper variant
 */
export const verticalStepperConfig: FormConfig = {
	...multiStepRegistrationConfig,
	id: "vertical-stepper-demo",
	stepper: {
		variant: "default",
		orientation: "vertical",
		position: "left",
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		validateOnNext: true,
		buttons: {
			previous: {
				label: "Back",
				variant: "outline",
			},
			next: {
				label: "Continue",
				variant: "primary",
			},
			submit: {
				label: "Complete Registration",
				variant: "primary",
			},
		},
	},
};

/**
 * Minimal stepper variant
 */
export const minimalStepperConfig: FormConfig = {
	...multiStepRegistrationConfig,
	id: "minimal-stepper-demo",
	mode: "free",
	stepper: {
		variant: "minimal",
		orientation: "horizontal",
		position: "top",
		showStepNumbers: false,
		showStepTitles: false,
		allowStepJumping: true,
		validateOnNext: false,
	},
};
