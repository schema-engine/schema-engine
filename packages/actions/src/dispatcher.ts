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
				if (action.enabled === false || !this.shouldExecute(action, trigger)) return undefined;
				const registration = this.registry.getAction(action.$type);
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
				if (action.triggers === undefined && !(registration.metadata.defaultTriggers ?? []).includes(trigger))
					return undefined;
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

	/** @remarks Explicit triggers can exclude an action before its registration is needed. */
	private shouldExecute(action: ActionConfigBase, trigger: TTrigger): boolean {
		return action.triggers === undefined || action.triggers.some((candidate) => candidate === trigger);
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
