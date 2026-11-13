import { describe, expect, test, vi } from 'vitest';
import {
	ActionPlaygroundSession,
	type PlaygroundSleep,
	type PlaygroundSnapshot,
} from '../src/components/action-flow/action-playground-session';

function createGate() {
	const pending: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];
	const sleep: PlaygroundSleep = (_ms, signal) =>
		new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(new DOMException('Aborted', 'AbortError'));
				return;
			}
			const entry = {
				resolve: () => {
					signal.removeEventListener('abort', onAbort);
					resolve();
				},
				reject,
			};
			const onAbort = () => {
				pending.splice(pending.indexOf(entry), 1);
				reject(new DOMException('Aborted', 'AbortError'));
			};
			signal.addEventListener('abort', onAbort, { once: true });
			pending.push(entry);
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

function statusOf(snapshot: PlaygroundSnapshot, id: string) {
	if (id === 'result') return snapshot.result.status;
	return snapshot.nodes.find((node) => node.id === id)?.status;
}

describe('action playground session', () => {
	test('starts the next sequential action only after the previous one finishes', async () => {
		const gate = createGate();
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.run('result');
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
		const session = new ActionPlaygroundSession('parallel', { sleep: gate.sleep });
		const running = session.run('result');
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
		const session = new ActionPlaygroundSession('short-circuit', { sleep: gate.sleep });
		const running = session.run('result');
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
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.run('persist');
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
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.run('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		session.interrupt();
		await running;
		expect(statusOf(session.snapshot(), 'serialize')).toBe('cancelled');
		expect(statusOf(session.snapshot(), 'persist')).toBe('idle');
		expect(statusOf(session.snapshot(), 'result')).toBe('cancelled');
		session.dispose();
	});

	test('reset after completion returns to idle without dispatching', async () => {
		const session = new ActionPlaygroundSession('sequential', {
			sleep: async () => undefined,
			delayMs: 0,
		});
		await session.run('result');
		expect(session.snapshot().phase).toBe('done');
		session.reset();
		expect(session.snapshot().phase).toBe('idle');
		expect(session.snapshot().nodes.every((node) => node.status === 'idle')).toBe(true);
		session.dispose();
	});

	test('dispose stops a pending run from updating the snapshot', async () => {
		const gate = createGate();
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.run('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		const before = session.snapshot();
		session.dispose();
		await running;
		expect(session.snapshot()).toEqual(before);
	});

	test('a second run supersedes the first and drops its stale updates', async () => {
		const gate = createGate();
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const first = session.run('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		const second = session.run('persist');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'persist')).toBe('running');
		});
		expect(statusOf(session.snapshot(), 'serialize')).toBe('idle');
		gate.release();
		await Promise.all([first, second]);
		expect(statusOf(session.snapshot(), 'persist')).toBe('succeeded');
		expect(statusOf(session.snapshot(), 'result')).toBe('succeeded');
		expect(session.snapshot().result.value).toBe('row:42');
		session.dispose();
	});

	test('reset during a run aborts it and returns to idle', async () => {
		const gate = createGate();
		const session = new ActionPlaygroundSession('sequential', { sleep: gate.sleep });
		const running = session.run('result');
		await vi.waitFor(() => {
			expect(statusOf(session.snapshot(), 'serialize')).toBe('running');
		});
		session.reset();
		await running;
		expect(session.snapshot().phase).toBe('idle');
		expect(session.snapshot().nodes.every((node) => node.status === 'idle')).toBe(true);
		expect(statusOf(session.snapshot(), 'result')).toBe('idle');
		session.dispose();
	});

	test('interrupt cancels every member of a parallel group', async () => {
		const gate = createGate();
		const session = new ActionPlaygroundSession('parallel', { sleep: gate.sleep });
		const running = session.run('result');
		await vi.waitFor(() => {
			expect(gate.pendingCount()).toBe(3);
		});
		session.interrupt();
		await running;
		expect(session.snapshot().nodes.map((node) => node.status)).toEqual(['cancelled', 'cancelled', 'cancelled']);
		expect(statusOf(session.snapshot(), 'result')).toBe('cancelled');
		session.dispose();
	});

	test('interrupt while idle changes nothing', () => {
		const session = new ActionPlaygroundSession('sequential', { sleep: async () => undefined });
		const before = session.snapshot();
		session.interrupt();
		expect(session.snapshot()).toEqual(before);
		session.dispose();
	});
});
