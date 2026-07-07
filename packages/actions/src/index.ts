/**
 * @schema-engine/actions
 *
 * Domain-agnostic action system for event-driven architectures.
 *
 * **Public orchestrator:** {@link ActionDispatcher} (or {@link createActionSystem} factory).
 * {@link ActionExecutor} is the lower-level sequential runner used internally.
 */

export * from './types';
export * from './registry';
export * from './executor';
export * from './dispatcher';
export * from './create-action-system';
