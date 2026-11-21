/**
 * A validation rule that cannot be turned into a schema.
 *
 * @remarks
 * Thrown by `ValidationRegistry.createSchema` for a type nobody registered or a handler that throws on
 * the rule it was given. `cause` is the handler's own error.
 */
export class ValidationRuleError extends Error {
	readonly ruleType: string;

	constructor(ruleType: string, message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'ValidationRuleError';
		this.ruleType = ruleType;
	}
}
