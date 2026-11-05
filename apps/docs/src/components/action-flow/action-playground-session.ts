import {
	ActionDispatcher,
	ActionRegistry,
	type ActionConfigBase,
	type ActionDispatchResult,
	type ActionSequenceEntry,
} from '@schema-engine/actions';
import * as z from 'zod/mini';

export type NodeStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type PlaygroundExampleId = 'sequential' | 'parallel' | 'short-circuit';

export type PlaygroundNode = {
	id: string;
	label: string;
	status: NodeStatus;
	value?: string;
};

export type PlaygroundSnapshot = {
	example: PlaygroundExampleId;
	name: string;
	description: string;
	code: string;
	nodes: PlaygroundNode[];
	result: PlaygroundNode;
	phase: 'idle' | 'running' | 'done';
};

export type PlaygroundSleep = (ms: number, signal: AbortSignal) => Promise<void>;

export type ActionPlaygroundOptions = {
	sleep?: PlaygroundSleep;
	delayMs?: number;
};

type DemoConfig = ActionConfigBase<'work'> & {
	label: string;
	result?: string;
	fail?: boolean;
	shouldContinue?: boolean;
};

type ExampleDefinition = {
	id: PlaygroundExampleId;
	name: string;
	description: string;
	code: string;
	actions: readonly ActionSequenceEntry<DemoConfig>[];
};

const demoSchema = z.strictObject({
	id: z.string(),
	$type: z.literal('work'),
	label: z.string(),
	result: z.optional(z.string()),
	fail: z.optional(z.boolean()),
	shouldContinue: z.optional(z.boolean()),
	enabled: z.optional(z.boolean()),
	triggers: z.optional(z.array(z.string())),
});

const work = (
	id: string,
	label: string,
	options: Pick<DemoConfig, 'result' | 'fail' | 'shouldContinue'> = {},
): DemoConfig => ({
	id,
	$type: 'work',
	label,
	...options,
});

export const PLAYGROUND_EXAMPLES: Record<PlaygroundExampleId, ExampleDefinition> = {
	sequential: {
		id: 'sequential',
		name: 'Sequential dispatch',
		description: 'Matching actions run in order, each receiving config, trigger and signal',
		code: `await dispatcher.dispatch({
  actions: [serialize, persist, index],
  trigger: 'submit',
  context,
});`,
		actions: [
			work('serialize', 'serialize', { result: 'payload' }),
			work('persist', 'persist', { result: 'row:42' }),
			work('index', 'index', { result: 'indexed' }),
		],
	},
	parallel: {
		id: 'parallel',
		name: 'Parallel group',
		description: 'An inner array runs concurrently and joins before the next entry',
		code: `await dispatcher.dispatch({
  actions: [[analytics, webhook, cache]],
  trigger: 'submit',
  context,
});`,
		actions: [
			[
				work('analytics', 'analytics', { result: 'event:12' }),
				work('webhook', 'webhook', { result: '202' }),
				work('cache', 'cache', { result: 'warm' }),
			],
		],
	},
	'short-circuit': {
		id: 'short-circuit',
		name: 'Stop on failure',
		description: 'Later actions run after a failure unless shouldContinue is false',
		code: `return { success: false, error: 'conflict', shouldContinue: false };`,
		actions: [
			work('authorize', 'authorize', { result: 'allow' }),
			work('mutate', 'mutate', { fail: true, shouldContinue: false, result: 'conflict' }),
			work('audit', 'audit', { result: 'logged' }),
		],
	},
};

function abortError(): DOMException {
	return new DOMException('Aborted', 'AbortError');
}

export async function sleep(ms: number, signal: AbortSignal): Promise<void> {
	if (signal.aborted) throw abortError();
	if (ms <= 0) return;
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(abortError());
		};
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

function jitter(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function flatten(actions: readonly ActionSequenceEntry<DemoConfig>[]): DemoConfig[] {
	return actions.flatMap((entry) => (Array.isArray(entry) ? [...entry] : [entry]));
}

function findConfig(actions: readonly ActionSequenceEntry<DemoConfig>[], id: string): DemoConfig | undefined {
	return flatten(actions).find((action) => action.id === id);
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
	if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
	const controller = new AbortController();
	for (const signal of signals) {
		if (signal.aborted) {
			controller.abort();
			break;
		}
		signal.addEventListener('abort', () => controller.abort(), { once: true });
	}
	return controller.signal;
}

function isAbort(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

function summarize(results: ActionDispatchResult[]): Pick<PlaygroundNode, 'status' | 'value'> {
	if (results.some((result) => result.status === 'cancelled')) {
		return { status: 'cancelled', value: 'interrupted' };
	}
	const blocked = results.find((result) => !result.success && result.shouldContinue === false);
	if (blocked) {
		return { status: 'failed', value: blocked.error ?? 'failed' };
	}
	const parts = results.map((result) =>
		result.success ? (typeof result.data === 'string' ? result.data : 'ok') : (result.error ?? 'failed'),
	);
	return {
		status: results.every((result) => result.success) ? 'succeeded' : 'failed',
		value: parts.join(' · '),
	};
}

const RESULT_NODE: Pick<PlaygroundNode, 'id' | 'label'> = { id: 'result', label: 'dispatch' };

function idleNodes(actions: readonly ActionSequenceEntry<DemoConfig>[]): PlaygroundNode[] {
	return flatten(actions).map((action) => ({
		id: action.id,
		label: action.label,
		status: 'idle' as const,
	}));
}

export function idlePlaygroundSnapshot(example: PlaygroundExampleId): PlaygroundSnapshot {
	const definition = PLAYGROUND_EXAMPLES[example];
	return {
		example: definition.id,
		name: definition.name,
		description: definition.description,
		code: definition.code,
		nodes: idleNodes(definition.actions),
		result: { ...RESULT_NODE, status: 'idle' },
		phase: 'idle',
	};
}

export type ActionPlaygroundSession = {
	readonly example: PlaygroundExampleId;
	snapshot(): PlaygroundSnapshot;
	subscribe(listener: (snapshot: PlaygroundSnapshot) => void): () => void;
	activate(target: string): Promise<void>;
	dispose(): void;
};

export function createActionPlaygroundSession(
	example: PlaygroundExampleId,
	options: ActionPlaygroundOptions = {},
): ActionPlaygroundSession {
	const definition = PLAYGROUND_EXAMPLES[example];
	const sleepImpl = options.sleep ?? sleep;
	const delayFor = () => options.delayMs ?? jitter(500, 900);

	let runId = 0;
	let phase: PlaygroundSnapshot['phase'] = 'idle';
	let nodes = idleNodes(definition.actions);
	let result: PlaygroundNode = { ...RESULT_NODE, status: 'idle' };
	let demoAbort = new AbortController();
	const listeners = new Set<(snapshot: PlaygroundSnapshot) => void>();

	const snapshot = (): PlaygroundSnapshot => ({
		example: definition.id,
		name: definition.name,
		description: definition.description,
		code: definition.code,
		nodes: nodes.map((node) => ({ ...node })),
		result: { ...result },
		phase,
	});

	const emit = () => {
		const next = snapshot();
		for (const listener of listeners) listener(next);
	};

	const mark = (id: string, status: NodeStatus, value: string | undefined, currentRun: number) => {
		if (currentRun !== runId) return;
		if (id === 'result') {
			result = { ...result, status, ...(value === undefined ? {} : { value }) };
		} else {
			nodes = nodes.map((node) =>
				node.id === id
					? { ...node, status, ...(value === undefined ? { value: undefined } : { value }) }
					: node,
			);
		}
		emit();
	};

	const registry = new ActionRegistry<Record<string, never>, 'submit'>();
	registry.register({
		$type: 'work',
		schema: demoSchema,
		metadata: { name: 'Work', defaultTriggers: ['submit'] },
		execute: async (context) => {
			const config = context.config;
			const currentRun = runId;
			mark(config.id, 'running', undefined, currentRun);
			try {
				await sleepImpl(delayFor(), combineSignals([context.signal, demoAbort.signal]));
			} catch (error) {
				if (isAbort(error)) {
					mark(config.id, 'cancelled', undefined, currentRun);
					return { success: false, error: 'interrupted', shouldContinue: false };
				}
				throw error;
			}
			if (config.fail) {
				mark(config.id, 'failed', config.result, currentRun);
				return {
					success: false,
					error: config.result ?? 'failed',
					shouldContinue: config.shouldContinue,
				};
			}
			mark(config.id, 'succeeded', config.result, currentRun);
			return { success: true, data: config.result };
		},
	});
	const dispatcher = new ActionDispatcher(registry);

	const resetVisuals = () => {
		nodes = idleNodes(definition.actions);
		result = { ...RESULT_NODE, status: 'idle' };
		phase = 'idle';
		emit();
	};

	const interrupt = () => {
		runId += 1;
		demoAbort.abort();
		demoAbort = new AbortController();
		nodes = nodes.map((node) => (node.status === 'running' ? { ...node, status: 'cancelled' as const } : node));
		if (result.status === 'running') result = { ...result, status: 'cancelled', value: 'interrupted' };
		phase = 'done';
		emit();
	};

	const run = async (target: string) => {
		const currentRun = ++runId;
		demoAbort.abort();
		demoAbort = new AbortController();
		nodes = idleNodes(definition.actions);
		result = { ...RESULT_NODE, status: 'running' };
		phase = 'running';
		emit();

		const actions =
			target === 'result'
				? definition.actions
				: (() => {
						const config = findConfig(definition.actions, target);
						return config ? [config] : [];
					})();

		if (actions.length === 0) {
			phase = 'idle';
			result = { ...RESULT_NODE, status: 'idle' };
			emit();
			return;
		}

		try {
			const results = await dispatcher.dispatch({
				actions,
				trigger: 'submit',
				context: {},
			});
			if (currentRun !== runId) return;
			const summary = summarize(results);
			result = { ...RESULT_NODE, ...summary };
			phase = 'done';
			emit();
		} catch (error) {
			if (currentRun !== runId) return;
			result = {
				...RESULT_NODE,
				status: 'failed',
				value: error instanceof Error ? error.message : String(error),
			};
			phase = 'done';
			emit();
		}
	};

	return {
		example: definition.id,
		snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		async activate(target) {
			if (phase === 'running') {
				interrupt();
				return;
			}
			if (phase === 'done') {
				resetVisuals();
				return;
			}
			await run(target);
		},
		dispose() {
			runId += 1;
			demoAbort.abort();
			listeners.clear();
		},
	};
}
