import {
	ActionDispatcher,
	ActionRegistry,
	parseActions,
	type ActionConfigBase,
	type ActionDispatchResult,
	type ActionRuntimeContext,
	type ActionSequenceEntry,
	type ParsedActionSequence,
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
	label: z.string(),
	result: z.optional(z.string()),
	fail: z.optional(z.boolean()),
	shouldContinue: z.optional(z.boolean()),
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
		code: `const parsed = parseActions(registry, [serialize, persist, index]);
await dispatcher.dispatch({ actions: parsed.data, trigger: 'submit', context });`,
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
		code: `const parsed = parseActions(registry, [[analytics, webhook, cache]]);
await dispatcher.dispatch({ actions: parsed.data, trigger: 'submit', context });`,
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

/**
 * A signal that aborts when either input does.
 *
 * @remarks
 * Stands in for `AbortSignal.any`, which the docs' browser floor (Chrome 111, Safari 16.4) does not all have.
 */
function linkSignals(first: AbortSignal, second: AbortSignal): AbortSignal {
	const controller = new AbortController();
	for (const signal of [first, second]) {
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
	const blocked = results.find(
		(result) => result.status !== 'cancelled' && !result.success && result.shouldContinue === false,
	);
	if (blocked) {
		return { status: 'failed', value: blocked.error ?? 'failed' };
	}
	if (results.some((result) => result.status === 'cancelled')) {
		return { status: 'cancelled', value: 'interrupted' };
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

type PlaygroundContext = { runSignal: AbortSignal };

type Listener = (snapshot: PlaygroundSnapshot) => void;

/**
 * One playground's dispatch state, driven by a real `ActionDispatcher`.
 *
 * @remarks
 * Each run owns an `AbortController` that is passed to actions through the
 * dispatch context. Aborting it is the single signal that a run is stale:
 * stale actions stop updating state and a stale dispatch result is dropped.
 */
export class ActionPlaygroundSession {
	readonly example: PlaygroundExampleId;

	readonly #definition: ExampleDefinition;
	readonly #sleep: PlaygroundSleep;
	readonly #delayMs: number | undefined;
	readonly #listeners = new Set<Listener>();
	readonly #registry: ActionRegistry<PlaygroundContext, 'submit'>;
	readonly #dispatcher: ActionDispatcher<PlaygroundContext, 'submit'>;
	#nodes: PlaygroundNode[];
	#result: PlaygroundNode = { ...RESULT_NODE, status: 'idle' };
	#phase: PlaygroundSnapshot['phase'] = 'idle';
	#run: AbortController | null = null;

	constructor(example: PlaygroundExampleId, options: ActionPlaygroundOptions = {}) {
		this.example = example;
		this.#definition = PLAYGROUND_EXAMPLES[example];
		this.#sleep = options.sleep ?? sleep;
		this.#delayMs = options.delayMs;
		this.#nodes = idleNodes(this.#definition.actions);

		this.#registry = new ActionRegistry<PlaygroundContext, 'submit'>([
			{
				$type: 'work',
				schema: demoSchema,
				metadata: { name: 'Work', defaultTriggers: ['submit'] },
				execute: (context) => this.#execute(context),
			},
		]);
		this.#dispatcher = new ActionDispatcher(this.#registry);
	}

	snapshot(): PlaygroundSnapshot {
		const { id, name, description, code } = this.#definition;
		return {
			example: id,
			name,
			description,
			code,
			nodes: this.#nodes.map((node) => ({ ...node })),
			result: { ...this.#result },
			phase: this.#phase,
		};
	}

	subscribe(listener: Listener): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	/**
	 * Dispatches the whole sequence for `'result'`, or only the action with that id.
	 *
	 * @remarks Starting a run supersedes any run still in flight.
	 */
	async run(target: string): Promise<void> {
		const actions = this.#actionsFor(target);
		if (actions.length === 0) return;

		const run = this.#startRun();
		this.#nodes = idleNodes(this.#definition.actions);
		this.#result = { ...RESULT_NODE, status: 'running' };
		this.#phase = 'running';
		this.#emit();

		try {
			const results = await this.#dispatcher.dispatch({
				actions,
				trigger: 'submit',
				context: { runSignal: run.signal },
			});
			if (run.signal.aborted) return;
			this.#result = { ...RESULT_NODE, ...summarize(results) };
		} catch (error) {
			if (run.signal.aborted) return;
			this.#result = {
				...RESULT_NODE,
				status: 'failed',
				value: error instanceof Error ? error.message : String(error),
			};
		}
		this.#phase = 'done';
		this.#emit();
	}

	interrupt(): void {
		if (this.#phase !== 'running') return;
		this.#run?.abort();
		this.#nodes = this.#nodes.map((node) => (node.status === 'running' ? { ...node, status: 'cancelled' } : node));
		if (this.#result.status === 'running')
			this.#result = { ...this.#result, status: 'cancelled', value: 'interrupted' };
		this.#phase = 'done';
		this.#emit();
	}

	reset(): void {
		this.#run?.abort();
		this.#nodes = idleNodes(this.#definition.actions);
		this.#result = { ...RESULT_NODE, status: 'idle' };
		this.#phase = 'idle';
		this.#emit();
	}

	dispose(): void {
		this.#run?.abort();
		this.#listeners.clear();
	}

	#startRun(): AbortController {
		this.#run?.abort();
		this.#run = new AbortController();
		return this.#run;
	}

	/** @remarks The examples are fixed data, so an action that does not parse is a defect in them, not an input to report. */
	#actionsFor(target: string): ParsedActionSequence<DemoConfig> {
		const entries = target === 'result' ? this.#definition.actions : this.#configFor(target);
		const parsed = parseActions<DemoConfig>(this.#registry, entries);
		if (!parsed.success) throw new Error(parsed.issues.map((issue) => issue.message).join(', '));
		return parsed.data;
	}

	#configFor(id: string): readonly DemoConfig[] {
		const config = findConfig(this.#definition.actions, id);
		return config ? [config] : [];
	}

	#emit(): void {
		const next = this.snapshot();
		for (const listener of this.#listeners) listener(next);
	}

	#mark(runSignal: AbortSignal, id: string, status: NodeStatus, value?: string): void {
		if (runSignal.aborted) return;
		this.#nodes = this.#nodes.map((node) => (node.id === id ? { ...node, status, value } : node));
		this.#emit();
	}

	async #execute(context: ActionRuntimeContext<DemoConfig, PlaygroundContext, 'submit'>) {
		const { config, runSignal } = context;
		this.#mark(runSignal, config.id, 'running');
		try {
			await this.#sleep(this.#delayMs ?? jitter(500, 900), linkSignals(context.signal, runSignal));
		} catch (error) {
			if (!isAbort(error)) throw error;
			this.#mark(runSignal, config.id, 'cancelled');
			if (runSignal.aborted) return { success: false, error: 'interrupted', shouldContinue: false };
			throw error;
		}
		if (config.fail) {
			this.#mark(runSignal, config.id, 'failed', config.result);
			return { success: false, error: config.result ?? 'failed', shouldContinue: config.shouldContinue };
		}
		this.#mark(runSignal, config.id, 'succeeded', config.result);
		return { success: true, data: config.result };
	}
}
