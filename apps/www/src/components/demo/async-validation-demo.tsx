import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@/lib/form-engine-setup';

/**
 * Interactive demo component showcasing Form Engine's async validation capabilities
 *
 * This component demonstrates:
 * - Server-side validation with real-time feedback
 * - Debounced validation requests to reduce server load
 * - Field-specific validation logic and error messages
 * - Cross-field dependency validation examples
 *
 * The demo includes test values that trigger different validation scenarios,
 * allowing users to experience the full validation workflow.
 *
 * @example
 * ```tsx
 * <AsyncValidationDemo />
 * ```
 */
export function AsyncValidationDemo() {
	const config: FormConfig = {
		id: 'async-validation-demo',
		mode: 'free',
		validationMode: 'onChange',
		steps: [
			{
				id: 'async-demo-step',
				title: 'Async Validation Examples',
				description:
					'Test async validation by trying these values:\n\n**Username**: Try "admin", "root", "invalid", or "test" to see errors\n**Email**: Try domains like "@invalid.com" or "@tempmail.com", or use "invalid" in the email\n**Company Code**: Try "invalid" or valid formats like "ABC999" (not in system)\n**Dependent Field**: Set username to "admin", then try "user" here',
				elements: [
					{
						componentId: 'input',
						inputType: 'text',
						id: 'username',
						name: 'username',
						label: 'Username',
						placeholder: 'Enter desired username',
						description: 'Try typing "invalid" to see async validation error',
						rules: [
							ValidationPresets.string.required('Username is required'),
							ValidationPresets.string.minLength(3, 'Username must be at least 3 characters'),
							ValidationPresets.string.maxLength(20, 'Username cannot exceed 20 characters'),
							/**
							 * Async validation rule configuration
							 * - Validates username availability against server
							 * - Uses 500ms debounce to reduce API calls while typing
							 * - Sends field identifier in request body for server-side routing
							 */
							{
								type: 'async',
								url: '/api/async-validate',
								method: 'POST',
								expectedResponse: { valid: true },
								dependencies: [],
								debounce: 500,
								message: 'This username is not available',
							},
						],
					},
					{
						componentId: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email Address',
						placeholder: 'your@email.com',
						description: 'Email domain validation happens on the server',
						rules: [
							ValidationPresets.string.required('Email is required'),
							ValidationPresets.string.email('Please enter a valid email format'),
							{
								type: 'async',
								url: '/api/async-validate',
								method: 'POST',
								expectedResponse: { valid: true },
								dependencies: [],
								debounce: 800,
								message: 'Email domain is not supported',
							},
						],
					},
					{
						componentId: 'input',
						inputType: 'text',
						id: 'companyCode',
						name: 'companyCode',
						label: 'Company Code',
						placeholder: 'Enter company identifier',
						description: 'Company codes are validated against our database',
						rules: [
							ValidationPresets.string.required('Company code is required'),
							ValidationPresets.string.pattern(
								'/^[A-Z]{2,4}[0-9]{3,6}$/',
								'Format: 2-4 letters followed by 3-6 numbers',
							),
							{
								type: 'async',
								url: '/api/async-validate',
								method: 'POST',
								expectedResponse: { valid: true },
								dependencies: [],
								debounce: 1000,
								message: 'Company code not found in our system',
							},
						],
					},
					{
						componentId: 'input',
						inputType: 'text',
						id: 'dependentField',
						name: 'dependentField',
						label: 'Dependent Field',
						placeholder: 'This field depends on username',
						description: 'This field re-validates when username changes',
						rules: [
							{
								type: 'async',
								url: '/api/async-validate',
								method: 'POST',
								expectedResponse: { valid: true },
								dependencies: ['username'],
								debounce: 600,
								message: 'This value conflicts with the selected username',
							},
						],
					},
				],
			},
		],
		actions: [
			{
				id: 'async-demo-submit',
				type: 'submit',
				description: 'Submit form with async validation',
				successMessage: 'All validations passed! Form submitted successfully! 🎉',
				errorMessage: 'Please fix validation errors before submitting.',
				enabled: true,
				endpoint: '/api/submit-demo',
				method: 'POST',
			},
		],
	};

	return (
		<div className="space-y-4">
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
				<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Async Validation Demo</h4>
				<p className="text-sm text-blue-700 dark:text-blue-200">
					This demo shows server-side validation in action. Each field validates against a backend API with
					different debounce delays. Try entering "invalid" in any field to trigger validation errors.
				</p>
			</div>
			<div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
				<FormRenderer config={config} />
			</div>
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
				<h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">How it works:</h4>
				<ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
					<li>
						• <strong>Debouncing:</strong> API calls are delayed until user stops typing
					</li>
					<li>
						• <strong>Dependencies:</strong> Some fields re-validate when other fields change
					</li>
					<li>
						• <strong>Error Handling:</strong> Network errors are handled gracefully
					</li>
					<li>
						• <strong>Expected Response:</strong> Server response is validated against expected format
					</li>
				</ul>
			</div>
		</div>
	);
}
