import { describe, expect, test, vi } from 'vitest';
import {
	createActionPlaygroundSession,
	type PlaygroundSleep,
} from '../src/components/action-flow/action-playground-session';

function createGate() {
	const pending: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];
	const sleep: PlaygroundSleep = (_ms, signal) =>
		new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(new DOMException('Aborted', 'AbortError'));
				return;
			}
			const onAbort = () => {
				reject(new DOMException('Aborted', 'AbortError'));
			};
			signal.addEventListener('abort', onAbort, { once: true });
			pending.push({
				resolve: () => {
					signal.removeEventListener('abort', onAbort);
					resolve();
				},
				reject,
			});
		});
	return {
		sleep,
		release() {
			pending.shift()?.resolve();
		},
		pendingCount() {
			return pending.length;
		},
	};
}

function statusOf(snapshot: ReturnType<ReturnType<typeof createActionPlaygroundSession>['snapshot']>, id: string) {
	if (id === 'result') return snapshot.result.status;
	return snapshot.nodes.find((node) => node.id === id)?.status;
}

describe('action playground session', () => {
	test('starts the next sequential action only after the previous one finishes', async () => {
		const gate = createGate();
		const session = createActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.activate('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		expect(statusOf(session.snapshot(), 'persist')).toBe('idle');
		gate.release();
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'persist')).toBe('running');
		});
		expect(statusOf(session.snapshot(), 'serialize')).toBe('succeeded');
		gate.release();
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'index')).toBe('running');
		});
		gate.release();
		await running;
		expect(statusOf(session.snapshot(), 'index')).toBe('succeeded');
		expect(statusOf(session.snapshot(), 'result')).toBe('succeeded');
		expect(session.snapshot().result.value).toBe('payload · row:42 · indexed');
		session.dispose();
	});

	test('starts every member of a parallel group before any of them finishes', async () => {
		const gate = createGate();
		const session = createActionPlaygroundSession('parallel', { sleep: gate.sleep });
		const running = session.activate('result');
		await vi.waitFor(() => {
			expect(session.snapshot().nodes.map((node) => node.status)).toEqual(['running', 'running', 'running']);
		});
		expect(gate.pendingCount()).toBe(3);
		gate.release();
		gate.release();
		gate.release();
		await running;
		expect(session.snapshot().result.value).toBe('event:12 · 202 · warm');
		session.dispose();
	});

	test('skips later actions when a failure sets shouldContinue false', async () => {
		const gate = createGate();
		const session = createActionPlaygroundSession('short-circuit', { sleep: gate.sleep });
		const running = session.activate('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'authorize')).toBe('running');
		});
		gate.release();
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'mutate')).toBe('running');
		});
		gate.release();
		await running;
		expect(statusOf(session.snapshot(), 'mutate')).toBe('failed');
		expect(statusOf(session.snapshot(), 'audit')).toBe('idle');
		expect(statusOf(session.snapshot(), 'result')).toBe('failed');
		expect(session.snapshot().result.value).toBe('conflict');
		session.dispose();
	});

	test('runs a single node without starting its siblings', async () => {
		const gate = createGate();
		const session = createActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.activate('persist');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'persist')).toBe('running');
		});
		expect(statusOf(session.snapshot(), 'serialize')).toBe('idle');
		expect(statusOf(session.snapshot(), 'index')).toBe('idle');
		gate.release();
		await running;
		expect(statusOf(session.snapshot(), 'persist')).toBe('succeeded');
		expect(statusOf(session.snapshot(), 'serialize')).toBe('idle');
		session.dispose();
	});

	test('interrupt cancels the running action and leaves later ones idle', async () => {
		const gate = createGate();
		const session = createActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.activate('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		await session.activate('result');
		await running;
		expect(statusOf(session.snapshot(), 'serialize')).toBe('cancelled');
		expect(statusOf(session.snapshot(), 'persist')).toBe('idle');
		expect(statusOf(session.snapshot(), 'result')).toBe('cancelled');
		session.dispose();
	});

	test('activate after completion resets without dispatching', async () => {
		const session = createActionPlaygroundSession('sequential', {
			sleep: async () => undefined,
			delayMs: 0,
		});
		await session.activate('result');
		expect(session.snapshot().phase).toBe('done');
		await session.activate('result');
		expect(session.snapshot().phase).toBe('idle');
		expect(session.snapshot().nodes.every((node) => node.status === 'idle')).toBe(true);
		session.dispose();
	});
});
