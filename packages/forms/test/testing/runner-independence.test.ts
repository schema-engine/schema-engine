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

/**
 * A runner with only `describe` and `test`, written by hand: it collects the tests, so a spec can run them itself.
 *
 * @remarks
 * Every case already passes under Vitest in `published-conformance.test.ts`, so this file does not run the whole suite
 * again inside one test, which only adds up the real-time waits of every case. It proves what a runner that is not
 * Vitest relies on: registration needs nothing but `describe` and `test`, and a test it registered fails a broken store.
 */
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
		firstFailure: async (): Promise<string | undefined> => {
			for (const { path, run } of registered) {
				try {
					await run();
				} catch {
					return path;
				}
			}
			return undefined;
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

test('the suite registers every case under its rule through a runner that is not Vitest', () => {
	const { runner, registered } = createHandWrittenRunner();
	formStateContainerConformance(createFormStateContainer, runner);
	expect(registered.map(({ path }) => path).toSorted()).toEqual(
		formStateContainerCases
			.map(({ rule, name }) => `form state container conformance > ${rule} > ${name}`)
			.toSorted(),
	);
});

test('a test registered through that runner fails a store that breaks the contract', async () => {
	const { runner, firstFailure } = createHandWrittenRunner();
	formStateContainerConformance(unstableSnapshots, runner);
	expect(await firstFailure()).toMatch(/^form state container conformance > snapshot stability > /);
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
