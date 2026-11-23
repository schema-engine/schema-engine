/**
 * Helpers that turn a server's error response into the input of `setServerErrors`.
 *
 * @remarks Pure functions with no state: they read a response and return `path -> issue or issues`.
 */
export { fromJsonApiErrors } from './from-json-api-errors';
export { fromProblemDetails } from './from-problem-details';
export { ServerErrorsInputError } from './shared';
