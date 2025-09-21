import { EcopagesApp } from "@ecopages/core/adapters/bun/create-app";
import appConfig from "./eco.config";
import { Logger } from "@ecopages/logger";

const appLogger = new Logger("[form-engine-app]",{
	debug: import.meta.env.ECOPAGES_LOGGER_DEBUG === "true",
});

const app = new EcopagesApp({ appConfig });

app.post("/api/submit-demo", async (ctx) => {
	const body = await ctx.request.json();
	appLogger.debug("Received data:", body);
	return ctx.response.json({ success: true });
});

/**
 * Async validation endpoint for Form Engine
 * 
 * Handles server-side validation requests from Form Engine's async validation system.
 * Supports field-specific validation logic with comprehensive error handling and logging.
 * 
 * @route POST /api/async-validate
 * @body {Object} - Validation request payload
 * @body.value {any} - The field value to validate
 * @body.field {string} - The field identifier for type-specific validation
 * @body.[key] {any} - Additional custom parameters from validation rule body
 * 
 * @returns {Object} Standard validation response
 * @returns.valid {boolean} - Whether the value is valid
 * @returns.message {string} - Error message if validation failed
 * 
 * @example
 * // Request
 * { "value": "admin", "field": "username" }
 * 
 * // Response (invalid)
 * { "valid": false, "message": "Username \"admin\" is not available" }
 * 
 * // Response (valid)
 * { "valid": true }
 */
app.post("/api/async-validate", async (ctx) => {
	const body = await ctx.request.json();
	appLogger.debug("Async validation request:");
	appLogger.debug("Full body:", JSON.stringify(body, null, 2));

	/**
	 * Simulate realistic network delay for demonstration purposes
	 * In production, this would be replaced by actual validation logic timing
	 */
	await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

	/**
	 * Extract validation parameters from request
	 * Form Engine automatically merges { value: fieldValue } with custom body params
	 */
	const { value, field } = body;
	
	appLogger.debug("Field:", field, "Value:", value);

	/**
	 * Handle empty values - typically considered valid for optional fields
	 * Required field validation should be handled by separate required rules
	 */
	if (!value || value.trim() === '') {
		appLogger.debug("Empty value, considering valid");
		return ctx.response.json({ valid: true });
	}

	/**
	 * Field-specific validation logic
	 * Each case demonstrates different validation patterns and error handling
	 */
	switch (field) {
		/**
		 * Username validation: Check against reserved/unavailable usernames
		 * Demonstrates simple blacklist validation with custom error messages
		 */
		case 'username':
			const unavailableUsernames = ['admin', 'root', 'invalid', 'test', 'user'];
			if (unavailableUsernames.includes(value?.toLowerCase())) {
				appLogger.debug("Username validation failed:", value);
				return ctx.response.json({ 
					valid: false,
					message: `Username "${value}" is not available`
				});
			}
			appLogger.debug("Username validation passed:", value);
			break;

		/**
		 * Email validation: Domain blocking and content filtering
		 * Demonstrates complex validation with multiple validation rules
		 */
		case 'email':
			const blockedDomains = ['tempmail.com', '10minutemail.com', 'invalid.com'];
			const domain = value?.split('@')[1]?.toLowerCase();
			if (blockedDomains.includes(domain)) {
				appLogger.debug("Email domain blocked:", domain);
				return ctx.response.json({ 
					valid: false,
					message: `Email domain "${domain}" is not supported`
				});
			}
			if (value?.toLowerCase().includes('invalid')) {
				appLogger.debug("Email contains invalid content:", value);
				return ctx.response.json({ 
					valid: false,
					message: 'Email contains invalid content'
				});
			}
			appLogger.debug("Email validation passed:", value);
			break;

		/**
		 * Company code validation: Format validation with system lookup
		 * Demonstrates pattern matching and database-style validation
		 */
		case 'companyCode':
			const validCodes = ['ABC123', 'XYZ456', 'DEF789', 'GHI012'];
			if (value && !validCodes.includes(value.toUpperCase()) && value.toLowerCase() !== 'invalid') {
				if (/^[A-Z]{2,4}[0-9]{3,6}$/.test(value.toUpperCase())) {
					appLogger.debug("Company code not found:", value);
					return ctx.response.json({ 
						valid: false,
						message: `Company code "${value.toUpperCase()}" not found in our system`
					});
				}
			}
			if (value?.toLowerCase() === 'invalid') {
				appLogger.debug("Company code is invalid:", value);
				return ctx.response.json({ 
					valid: false,
					message: 'Company code is invalid'
				});
			}
			appLogger.debug("Company code validation passed:", value);
			break;

		/**
		 * Dependent field validation: Cross-field validation example
		 * Demonstrates how to access other field values through dependsOn object
		 */
		case 'dependentField':
			const dependsOn = body.dependsOn;
			appLogger.debug("Dependent field validation - dependsOn object:", dependsOn);
			
			// Check if dependsOn is an object with username
			if (dependsOn && typeof dependsOn === 'object' && dependsOn.username) {
				const usernameValue = dependsOn.username;
				if (usernameValue === 'admin' && value?.toLowerCase() === 'user') {
					appLogger.debug("Dependent field validation failed:", value, "depends on username:", usernameValue);
					return ctx.response.json({ 
						valid: false,
						message: 'Cannot use "user" value when username is "admin"'
					});
				}
			}
			
			// Legacy support for old format
			if (typeof dependsOn === 'string' && dependsOn === 'admin' && value?.toLowerCase() === 'user') {
				appLogger.debug("Dependent field validation failed (legacy):", value, "depends on:", dependsOn);
				return ctx.response.json({ 
					valid: false,
					message: 'Cannot use "user" value when username is "admin"'
				});
			}
			
			if (value?.toLowerCase() === 'invalid') {
				appLogger.debug("Dependent field invalid:", value);
				return ctx.response.json({ 
					valid: false,
					message: 'This value conflicts with the selected username'
				});
			}
			appLogger.debug("Dependent field validation passed:", value);
			break;

		/**
		 * Default case: Generic validation for unspecified field types
		 * Provides fallback validation logic for any field type
		 */
		default:
			if (value?.toLowerCase() === 'invalid') {
				appLogger.debug("Generic validation failed:", value);
				return ctx.response.json({ 
					valid: false,
					message: `Value "${value}" is not allowed`
				});
			}
			appLogger.debug("Generic validation passed:", value);
			break;
	}

	/**
	 * All validation checks passed - return success response
	 */
	appLogger.debug("All validations passed, returning valid: true");
	return ctx.response.json({ valid: true });
});

// Simple test endpoint for async validation
app.post("/api/test-async", async (ctx) => {
	const body = await ctx.request.json();
	appLogger.debug("🧪 Test async endpoint:", body);
	
	// Always fail if value is "invalid"
	if (body.value === "invalid") {
		return ctx.response.json({ valid: false, message: "Test failed: value is invalid" });
	}
	
	return ctx.response.json({ valid: true, message: "Test passed" });
});

await app.start();
