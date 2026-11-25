import { expect, test } from 'vitest';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import type { FormStateContainerFactory } from '@/state-container/types';
import { AssertionError } from '@/testing/assert';
import { formStateContainerCases } from '@/testing/form-state-container-conformance';
import { formStateContainerConformance, type ConformanceRunner } from '@/testing';

interface Registered {
	readonly path: string;
	readonly run: () => void | Promise<void>;
}

/** A runner with only `describe` and `test`, written by hand: it collects the tests, then runs them one by one. */
function createHandWrittenRunner() {
	const registered: Registered[] = [];
	const groups: string[] = [];
	const runner: ConformanceRunner = {
		describe(name, register) {
			groups.push(name);
			register();
			groups.pop();
		},
		test(name, run) {
			registered.push({ path: [...groups, name].join(' > '), run });
		},
	};
	return {
		runner,
		registered,
		failures: async (): Promise<string[]> => {
			const failed: string[] = [];
			for (const { path, run } of registered) {
				try {
					await run();
				} catch {
					failed.push(path);
				}
			}
			return failed;
		},
	};
}

const unstableSnapshots: FormStateContainerFactory = (options) => {
	const store = createFormStateContainer(options);
	return { ...store, getSnapshot: () => ({ ...store.getSnapshot() }) };
};

const failingValidate: FormStateContainerFactory = (options) => ({
	...createFormStateContainer(options),
	validate: () => Promise.reject(new Error('plain')),
});

test('the suite registers and passes every case through a runner that is not Vitest', async () => {
	const { runner, registered, failures } = createHandWrittenRunner();
	formStateContainerConformance(createFormStateContainer, runner);
	expect(registered).toHaveLength(formStateContainerCases.length);
	expect(registered[0]?.path.startsWith('form state container conformance > ')).toBe(true);
	expect(await failures()).toEqual([]);
});

test('the suite fails at least one case for a store that breaks the contract', async () => {
	const { runner, failures } = createHandWrittenRunner();
	formStateContainerConformance(unstableSnapshots, runner);
	expect((await failures()).length).toBeGreaterThan(0);
});

test('a failing case that stubs fetch puts it back', async () => {
	const original = globalThis.fetch;
	const stubbing = formStateContainerCases.filter((entry) => entry.rule === 'validator failures');
	expect(stubbing.length).toBeGreaterThan(0);
	for (const entry of stubbing) {
		await expect(Promise.resolve(entry.run(failingValidate))).rejects.toThrow(AssertionError);
		expect(globalThis.fetch).toBe(original);
	}
});
