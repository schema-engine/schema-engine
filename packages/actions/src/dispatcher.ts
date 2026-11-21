import type {
	ActionConfigBase,
	ActionDispatchInput,
	ActionDispatchResult,
	ActionExecutionResult,
	ActionSequenceEntry,
} from './types';
import type { ActionRegistryProvider } from './registry';
import { Logger } from '@ecopages/logger';

const logger = new Logger('[@schema-engine/actions]');

type MetadataContext = { metadata?: Record<string, unknown> };

function isMetadataContext(value: unknown): value is MetadataContext {
	return typeof value === 'object' && value !== null;
}

function isGroup<T extends ActionConfigBase>(entry: ActionSequenceEntry<T>): entry is readonly T[] {
	return Array.isArray(entry);
}

function isCancellation(error: unknown, signal: AbortSignal): boolean {
	return signal.aborted && error instanceof Error && error.name === 'AbortError';
}

type ActionMatch<TBaseContext, TTrigger> =
	| { runs: false }
	| { runs: true; registration: ReturnType<ActionRegistryProvider<TBaseContext, TTrigger>['getAction']> };

/** Dispatches actions in sequence, allowing groups to execute concurrently. */
export class ActionDispatcher<TBaseContext = unknown, TTrigger = string> {
	constructor(private readonly registry: ActionRegistryProvider<TBaseContext, TTrigger>) {}

	async dispatch<TConfig extends ActionConfigBase>({
		actions,
		trigger,
		context,
		metadata,
		triggeredBy,
	}: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): Promise<ActionDispatchResult[]> {
		if (!actions?.length) return [];
		const enhancedContext = metadata ? this.mergeMetadata(context, metadata) : context;
		const results: ActionDispatchResult[] = [];
		for (const [sequenceIndex, entry] of actions.entries()) {
			const controller = new AbortController();
			const run = async (action: TConfig, groupIndex?: number): Promise<ActionDispatchResult | undefined> => {
				const match = this.match(action, trigger);
				if (!match.runs) return undefined;
				const { registration } = match;
				if (!registration) {
					const error = `No handler registered for action type: ${action.$type}`;
					logger.error(error, { actionId: action.id, availableActions: this.registry.getActionTypes() });
					return {
						actionId: action.id,
						sequenceIndex,
						...(groupIndex === undefined ? {} : { groupIndex }),
						status: 'failed',
						cancellationRequested: false,
						success: false,
						error,
						shouldContinue: true,
					};
				}
				logger.debug(`Executing action: ${action.id} (${action.$type})`);
				let result: ActionExecutionResult;
				let cancelled = false;
				try {
					result = await registration.execute({
						...enhancedContext,
						config: action,
						trigger,
						signal: controller.signal,
						...(triggeredBy ? { triggeredBy } : {}),
					});
				} catch (error) {
					cancelled = isCancellation(error, controller.signal);
					result = {
						success: false,
						error: error instanceof Error ? error.message : String(error),
						cause: error,
						shouldContinue: true,
					};
				}
				const cancellationRequested = controller.signal.aborted;
				if (!result.success && result.shouldContinue === false) controller.abort();
				if (!result.success) logger.warn(`Action ${action.id} failed`, result);
				return {
					...result,
					actionId: action.id,
					sequenceIndex,
					...(groupIndex === undefined ? {} : { groupIndex }),
					status: cancelled ? 'cancelled' : result.success ? 'succeeded' : 'failed',
					cancellationRequested,
				};
			};
			const groupResults = isGroup(entry) ? await Promise.all(entry.map(run)) : [await run(entry)];
			const executed = groupResults.filter((result): result is ActionDispatchResult => result !== undefined);
			results.push(...executed);
			if (executed.some((result) => !result.success && result.shouldContinue === false)) break;
		}
		return results;
	}

	/**
	 * Whether `dispatch` would run, or report a missing handler for, at least one of the actions on this trigger.
	 *
	 * @remarks
	 * Lets a caller skip building a context for a trigger no action answers. It checks the same conditions
	 * `dispatch` does, so the two cannot disagree.
	 */
	hasMatching<TConfig extends ActionConfigBase>(
		actions: readonly ActionSequenceEntry<TConfig>[],
		trigger: TTrigger,
	): boolean {
		return actions.some((entry) =>
			isGroup(entry) ? entry.some((action) => this.match(action, trigger).runs) : this.match(entry, trigger).runs,
		);
	}

	/**
	 * @remarks
	 * An action of an unregistered type always matches, so `dispatch` can report the missing handler. The
	 * registration it looked up comes back so `dispatch` does not look it up again.
	 */
	private match(action: ActionConfigBase, trigger: TTrigger): ActionMatch<TBaseContext, TTrigger> {
		if (action.enabled === false) return { runs: false };
		if (action.triggers !== undefined && !action.triggers.some((candidate) => candidate === trigger)) {
			return { runs: false };
		}
		const registration = this.registry.getAction(action.$type);
		const implicit = action.triggers === undefined;
		if (implicit && registration && !(registration.metadata.defaultTriggers ?? []).includes(trigger)) {
			return { runs: false };
		}
		return { runs: true, registration };
	}

	/** @remarks Best-effort dispatch never rejects to its caller. */
	dispatchSync<TConfig extends ActionConfigBase>(input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): void {
		void this.dispatch(input).catch((error) => logger.error('dispatchSync failed:', error));
	}

	private mergeMetadata(context: TBaseContext, metadata: Record<string, unknown>): TBaseContext {
		if (!isMetadataContext(context)) return context;
		const existingMetadata = context.metadata;
		return {
			...context,
			metadata: {
				...(typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {}),
				...metadata,
			},
		};
	}
}
