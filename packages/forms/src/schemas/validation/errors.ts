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

/**
 * Thrown by a rule's schema when the check it started was replaced before it ran, so it has no result.
 *
 * @remarks
 * Distinct from a pass and from a failure: the value was never checked, and a later check owns the answer.
 * It is state, never an issue. `validateFieldValue` reports it as `superseded`, and a caller must not take
 * the field for valid.
 */
export class ValidationSuperseded extends Error {
	constructor() {
		super('The validation was replaced by a later one before it ran.');
		this.name = 'ValidationSuperseded';
	}
}

/**
 * Thrown by a rule's schema when the service it asks cannot answer: a non-ok response, a network failure or a body that is not an answer.
 *
 * @remarks
 * Operational, not a field error and never cached: the value was not judged, and asking again may succeed.
 * `validateFieldValue` reports it as a `FormValidationFailure`, keeping this as its cause.
 */
export class ValidationUnavailable extends Error {
	constructor(options?: { cause?: unknown }) {
		super('The service that validates the value could not answer.', options);
		this.name = 'ValidationUnavailable';
	}
}

/**
 * The key of an issue's `params` under which a schema reports text that comes from outside the engine.
 *
 * @remarks
 * The library's own text for an issue (such as 'Invalid input') is never read. Text a service answered with is
 * put here by the schema, and only this reaches a registration's `message` hook.
 */
export const REPORTED_TEXT = 'schemaEngineReportedText';
